/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland · stats_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas dos produtos campestres v01 e v02 (biomassa, ANPP,
 * carbono) por classe LULC C11, ano 2023. Requerido pelos steps
 * `7_statistics.js` de cada versão (e por scripts ad-hoc no Code Editor).
 *
 * Expõe:
 *   runForVersion(versionId) → CSV único
 *                              `stats_grassland_<versao>_<produto>_<territorio>_2023.csv`
 *                              com UMA linha por classe LULC (n0), sem
 *                              `.geometry`/`system:index` (selectors no export).
 *                              NÃO exporta agregações — n1/marcador/total são
 *                              derivados OFFLINE no Colab (statistics_gcn).
 *
 *   O comparativo de produtos (v02) é montado OFFLINE no Colab
 *   (statistics_gcn/build_compare_grassland), a partir dos CSVs desta etapa.
 *
 * Método (molde mapbiomas_solo/collection3/statistics e 2_5_eca_observada):
 *   área_ha  = pixelArea()/10000, mascarado SÓ pelo LULC — área sempre
 *              informativa (classe existe no bioma mesmo sem produto);
 *   valor    = banda (convertida a t/ha via toMgFactor) × pixelArea()/10000
 *              → TOTAL em t;
 *   reducer  = ee.Reducer.sum().repeat(2).group({groupField:2}) sobre o stack
 *              [área_ha, valor, classe] — a banda DE CLASSIFICAÇÃO fica na
 *              ÚLTIMA posição (padrão comprovado: group pela última banda).
 * `normalize()` converte cada grupo para {classe, sum, sum_1} aceitando o
 * `sum` do `.repeat(2)` como LISTA [area, valor] OU chaves separadas.
 * Produtos não possuem incerteza publicada (diferente do forest, que carrega
 * o ± do ensemble v07).
 *
 * → v02: os produtos cobrem TODO o bioma; a estatística agrega também as
 *   classes florestais e demais usos (n1 Floresta/Campestre/Outros).
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE;
var REDUCER = ee.Reducer.sum().repeat(2)
  .group({ groupField: 2, groupName: 'classe' });
var VERSIONS = ['v01', 'v02'];

/** Guardas (padrão forest): consulta segura de asset e de grupos. */
function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) { return false; }
}

function groupsOrEmpty(groups, ctx) {
  if (!groups || typeof groups.forEach !== 'function') {
    print('[AVISO] sem dados (produto ausente ou sem interseção):', ctx);
    return [];
  }
  return groups;
}

/**
 * Normaliza cada grupo para {classe, sum, sum_1}.
 * O `sum` do `.repeat(2)` sai como LISTA [area, valor] (molde solo) ou, em
 * versões do EE, como chaves separadas — esta função cobre os dois casos.
 */
function normalize(groups) {
  return (groups || []).map(function (g) {
    var s = g['sum'];
    if (s && typeof s.length === 'number') {
      return { classe: g['classe'], sum: s[0], sum_1: s[1] };
    }
    return { classe: g['classe'], sum: g['sum'], sum_1: g['sum_1'] };
  });
}

function biome() {
  return ee.FeatureCollection(C.BIOME_FC)
    .filter(ee.Filter.eq(C.BIOME_PROP, C.BIOME_NAME))
    .first().geometry();
}

/** Regiões de análise: bioma (padrão) ou bioma ∩ cada UF da lista. */
function collectRegions(cb) {
  var b = biome();
  if (!C.UF_LIST.length) {
    cb([{ territorio: C.BIOME_NAME + ' (bioma)', slug: 'bioma', geom: b }]);
    return;
  }
  var ufs = ee.FeatureCollection(C.UF_ASSET)
    .filter(ee.Filter.inList(C.UF_PROP, C.UF_LIST));
  ufs.map(function (f) {
    return ee.Feature(null, { sigla: f.get(C.UF_PROP),
      geom: f.geometry().intersection(b, ee.ErrorMargin(30)) });
  }).evaluate(function (feats) {
    cb(feats.filter(function (f) { return f.properties.geom; }).map(function (f) {
      return { territorio: 'UF ' + f.properties.sigla, slug: f.properties.sigla,
        geom: ee.Geometry(f.properties.geom) };
    }));
  }, function () {
    print('[ERRO] não foi possível carregar', C.UF_ASSET,
      '— confira UF_ASSET/UF_PROP no contrato.');
    cb([{ territorio: C.BIOME_NAME + ' (bioma)', slug: 'bioma', geom: b }]);
  });
}

/** Stack [área_ha, valor_, classe]: área por classe do LULC (sempre
 * informativa, mask só no LULC) e valor (t) nos pixels do produto. */
function productImage(p) {
  var value = ee.Image(p.asset).select(p.band).multiply(p.toMgFactor)
    .rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var areaHa = ee.Image.pixelArea().divide(10000);
  var area = areaHa.rename('area_ha').updateMask(lulc.mask());
  value = value.multiply(areaHa).rename('valor').unmask(0).updateMask(mask);
  return ee.Image.cat([area, value, lulc]);
}

function reduceFor(p, geom) {
  return productImage(p).reduceRegion({
    reducer: REDUCER, geometry: geom, scale: SCALE, maxPixels: 1e13,
    tileScale: 2
  }).get('groups');
}

function r(n) { return Math.round(n * 10) / 10; }

function row(product, territorio, extra) {
  var base = { produto: product.id, versao: product.version, ano: YEAR,
    territorio: territorio, unidade: product.unit };
  for (var k in extra) { if (extra.hasOwnProperty(k)) base[k] = extra[k]; }
  return base;
}

/** Expande os grupos decimais em linhas n0 (uma por classe LULC presente). */
function buildRows(p, territorio, groups) {
  var rows = [];
  groups = normalize(groupsOrEmpty(groups, p.id + ' · ' + territorio +
    ' (buildRows — reduzindo a linhas n0 por classe)'));
  if (!groups.length) { print('[AVISO]', p.id, territorio, '· 0 linhas geradas'); return rows; }

  groups.forEach(function (g) {
    var info = LEG.info(g['classe']);
    rows.push(row(p, territorio, {
      classe: g['classe'], n0: info.n0, n1: info.n1, n2: info.n2,
      marcador: info.n2,
      area_ha: r(g['sum']), valor_t: r(g['sum_1'])
    }));
  });

  return rows;
}

/** Colunas dos CSVs das estatísticas (export único, só n0, sem .geo/system:index). */
var PRODUCT_COLUMNS = ['produto', 'versao', 'ano', 'territorio', 'unidade',
  'classe', 'n0', 'n1', 'n2', 'marcador', 'area_ha', 'valor_t'];

/** Exporta UMA tabela por produto/versão (selectors excluem .geo/system:index). */
function exportCsv(rows, fileName, description, selectors) {
  if (!rows.length) return;
  Export.table.toDrive({
    collection: ee.FeatureCollection(rows.map(function (r2) {
      return ee.Feature(null, r2); })),
    description: description,
    folder: C.DRIVE_FOLDER,
    fileNamePrefix: fileName,
    fileFormat: 'CSV',
    selectors: selectors
  });
}

/**
 * Gera as estatísticas de UMA versão dos produtos campestres, por região
 * (bioma/UF). Uso: engine.runForVersion('v01') | engine.runForVersion('v02');
 */
exports.runForVersion = function (versionId) {
  if (VERSIONS.indexOf(versionId) < 0) {
    print('[ERRO] grassland versões disponíveis:', VERSIONS, '· recebido:',
      versionId); return;
  }
  var products = C.PRODUCTS.filter(function (prod) {
    return prod.version === versionId;
  });
  print('MAPBIOMAS-CARBONO · Pantanal Grassland · 7_statistics ·',
    versionId, '·', products.length, 'produtos');

  collectRegions(function (regions) {
    var jobs = [];
    regions.forEach(function (region) {
      products.forEach(function (p) { jobs.push({ p: p, region: region }); });
    });
    var done = 0;
    jobs.forEach(function (job) {
      var ctx = job.p.id + '/' + job.region.slug;
      if (!assetExists(job.p.asset)) {
        print('[AVISO] produto não encontrado — pulado:', job.p.asset);
        done++;
        if (done === jobs.length) print('[FIM] versão', versionId, 'completa.');
        return;
      }
      reduceFor(job.p, job.region.geom).evaluate(function (groups) {
        groups = groupsOrEmpty(groups, ctx);
        var rows = buildRows(job.p, job.region.territorio, groups);
        exportCsv(rows,
          C.PREFIX + '_' + versionId + '_' + job.p.id + '_' + job.region.slug +
            '_' + YEAR,
          'WS_CARBONO_stats_grassland_' + versionId + '_' + job.p.id + '_' +
            job.region.slug + '_' + YEAR,
          PRODUCT_COLUMNS);
        print('[OK]', ctx, job.p.version, '·', rows.length, 'classes · valor',
          rows.reduce(function (acc, r2) { return acc + r2.valor_t; }, 0),
          'Mg');
        done++;
        if (done === jobs.length) print('[FIM] versão', versionId, 'completa.');
      }, function (err) {
        print('[ERRO]', ctx, String(err).slice(0, 200));
        done++;
        if (done === jobs.length) print('[FIM] versão', versionId, 'completa.');
      });
    });
  });
};

/**
 * O comparativo de produtos é montado OFFLINE no Colab
 * (statistics_gcn → build_compare_grassland), a partir dos
 * `stats_grassland_*.csv` (referência: GRASSLAND_REF_VERSION = v02).
 */