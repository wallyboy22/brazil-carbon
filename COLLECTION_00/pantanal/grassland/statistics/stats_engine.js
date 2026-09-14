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
 *                              (níveis n0/n1/marcador/total por produto), sem
 *                              `.geometry`/`system:index` (selectors no export).
 *
 *   O comparativo de produtos (v02) é montado OFFLINE no Colab
 *   (statistics_gcn/build_compare_grassland), a partir dos CSVs desta etapa.
 *
 * Método (molde mapbiomas_solo/collection3/statistics e 2_5_eca_observada):
 *   área_ha  = pixelArea()/10000
 *   valor    = banda (convertida a Mg/ha via toMgFactor) × área_ha
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

/** Stack [área_ha, valor_Mg, classe] mascarado por classe ∩ valor. */
function productImage(p) {
  var value = ee.Image(p.asset).select(p.band).multiply(p.toMgFactor)
    .rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var area = ee.Image.pixelArea().divide(10000).rename('area_ha').updateMask(mask);
  value = value.unmask(0).updateMask(mask);
  return ee.Image.cat([area, value, lulc]);
}

function reduceFor(p, geom) {
  return productImage(p).reduceRegion({
    reducer: REDUCER, geometry: geom, scale: SCALE, maxPixels: 1e13,
    tileScale: 2
  }).get('groups');
}

function r(n) { return Math.round(n * 10) / 10; }

function row(product, territorio, grupo, nivel, extra) {
  var base = { produto: product.id, versao: product.version, ano: YEAR,
    territorio: territorio, nivel: nivel, grupo: grupo, unidade: product.unit };
  for (var k in extra) { if (extra.hasOwnProperty(k)) base[k] = extra[k]; }
  return base;
}

function sumBy(groups, getKey) {
  var acc = {};
  groups.forEach(function (g) {
    var key = getKey(g['classe']);
    acc[key] = acc[key] || { area: 0, valor: 0 };
    acc[key].area += g['sum'];
    acc[key].valor += g['sum_1'];
  });
  return acc;
}

var N1_ORDER = ['Floresta', 'Campestre', 'Outros'];
var MARKER_ORDER = [LEG.MARK_FOREST, LEG.MARK_GRASS, LEG.MARK_OTHER];

function buildRows(p, territorio, groups) {
  var rows = [];
  groups = normalize(groupsOrEmpty(groups, p.id + ' · ' + territorio));

  groups.forEach(function (g) {
    var info = LEG.info(g['classe']);
    rows.push(row(p, territorio, g['classe'], 'n0', {
      classe: g['classe'], n0: info.n0, n1: info.n1, n2: info.n2,
      marcador: info.n2,
      area_ha: r(g['sum']), valor_Mg: r(g['sum_1'])
    }));
  });

  var byN1 = sumBy(groups, function (code) { return LEG.info(code).n1; });
  N1_ORDER.forEach(function (label) {
    if (!byN1[label]) return;
    var a = byN1[label];
    rows.push(row(p, territorio, label, 'n1', {
      classe: '', n0: '', n1: label, n2: '', marcador: '',
      area_ha: r(a.area), valor_Mg: r(a.valor)
    }));
  });

  var byMark = sumBy(groups, function (code) { return LEG.info(code).marcador; });
  MARKER_ORDER.forEach(function (mark) {
    var key = String(mark);
    if (!byMark[key]) return;
    var a = byMark[key];
    var label = LEG.N2_LABELS[key];
    rows.push(row(p, territorio, label, 'marcador', {
      classe: '', n0: '', n1: LEG.N1_LABELS[key], n2: label, marcador: label,
      area_ha: r(a.area), valor_Mg: r(a.valor)
    }));
  });

  var tot = sumBy(groups, function () { return 1 })['1'];
  rows.push(row(p, territorio, 'TOTAL', 'total', {
    classe: '', n0: '—', n1: '—', n2: '—', marcador: 'total',
    area_ha: r(tot.area), valor_Mg: r(tot.valor)
  }));

  return rows;
}

/** QA de somas: n1 = total e decimal = total (imprime avisos). */
function qaSomas(product, territorio, rows) {
  var dec = 0, total = null;
  rows.forEach(function (r) {
    if (r.nivel === 'n0') { dec += r.valor_Mg; }
    if (r.nivel === 'total') { total = r.valor_Mg; }
  });
  if (!total) { print('[QA !]', product.id, territorio, 'sem linha TOTAL'); return; }
  if (Math.abs(dec - total) > 1) {
    print('[QA !]', product.id, territorio, 'decimal ≠ total:', dec, 'vs', total);
  }
}

/** Colunas dos CSVs das estatísticas (export único, sem .geo/system:index). */
var PRODUCT_COLUMNS = ['produto', 'versao', 'ano', 'territorio', 'nivel',
  'grupo', 'unidade', 'classe', 'n0', 'n1', 'n2', 'marcador', 'area_ha',
  'valor_Mg'];

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
        qaSomas(job.p, job.region.territorio, rows);
        exportCsv(rows,
          C.PREFIX + '_' + versionId + '_' + job.p.id + '_' + job.region.slug +
            '_' + YEAR,
          'WS_CARBONO_stats_grassland_' + versionId + '_' + job.p.id + '_' +
            job.region.slug + '_' + YEAR,
          PRODUCT_COLUMNS);
        print('[OK]', ctx, job.p.version, '·', rows.length, 'linhas');
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