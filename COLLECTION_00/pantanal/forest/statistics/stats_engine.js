/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · stats_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas de AGC (agbd, t/ha) por classe LULC C11 para as
 * versões V03–V08 (2023). Requerido pelos steps `7_statistics.js` de cada
 * versão e por scripts ad-hoc no Code Editor.
 *
 * Expõe:
 *   runForVersion(versionId)  → CSV único `stats_forest_<v>_<territorio>_2023.csv`
 *                               com UMA linha por classe LULC (n0), sem as
 *                               colunas `.geometry`/`system:index` (selectors).
 *                               NÃO exporta agregações — n1, marcador e total
 *                               são derivados OFFLINE no Colab (statistics_gcn).
 *
 * Método (molde mapbiomas_solo/collection3/statistics e 2_5_eca_observada):
 *   área_ha  = pixelArea()/10000, mascarado SÓ pelo LULC — área sempre
 *              informativa (classe existe no bioma mesmo sem predição);
 *   estoque  = banda (t/ha) × pixelArea()/10000  → TOTAL em t;
 *   reducer  = ee.Reducer.sum().repeat(3).group({groupField:3}) sobre o stack
 *              [área_ha, estoque, w2, classe] — a banda de classificação fica
 *              na ÚLTIMA posição (padrão comprovado: group pela última banda);
 *              w2 = (std_ensemble × pixelArea)² — apenas nos pixels preditos;
 *   incerteza ± = √(Σ w2) — v07/v08 (banda agbd_std_2023); demais versões: 0.
 *              A contribuição por pixel é independente (quadrature): o total de
 *              incerteza de uma classe é a raiz da soma dos quadrados dos
 *              desvios (std em t/ha × área em ha). Coerente com o estoque em
 *              Mg (mesmo produto banda × área).
 * `normalize()` converte cada grupo para {classe, sum, sum_1, sum_2} aceitando
 * o `sum` do `.repeat(3)` como LISTA [area, estoque, w2] OU chaves separadas.
 * Os grupos por classe decimal (n0) são a ÚNICA saída do CSV; agregações
 * (n1/marcador/total) são montadas offline a partir das linhas n0.
 * Território: bioma + UF opcional (0_contract_stats).
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE;
var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var REDUCER = ee.Reducer.sum().repeat(3)
  .group({ groupField: 3, groupName: 'classe' });

/**
 * Verifica se um asset IMAGE existe (por pasta de asset).
 * listAssets pode lançar erro quando a pasta não existe — try/catch torna a
 * consulta segura para QA/stats.
 */
function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) {
    return false;
  }
}

/**
 * Resolve o mosaico de UMA versão, com fallback automático:
 *   1) merge anual exportado (agc_pred_v0X_merged_<ano>);
 *   2) senão, mosaico da ImageCollection PREDICTIONS/COL da própria versão.
 * Evita o erro "Cannot read property 'forEach' of undefined" quando o merge
 * não existe no Earth Engine.
 */
function safeMosaic(v) {
  if (assetExists(v.mosaic)) return ee.Image(v.mosaic);
  var colPath = v.mosaic.replace(/\/[^/]+$/, '/COL');
  print('[AVISO] merge não encontrado — usando COL mosaic de', v.id, '→', colPath);
  return ee.ImageCollection(colPath)
    .filter(ee.Filter.eq('year', YEAR))
    .mosaic()
    .rename([v.band].concat(v.stdBand ? [v.stdBand] : []));
}

/** Valida o array de grupos retornado por reduceRegion().get('groups'). */
function groupsOrEmpty(groups, ctx) {
  if (!groups || typeof groups.forEach !== 'function') {
    print('[AVISO] sem dados (provável mosaico ausente ou sem interseção):', ctx);
    return [];
  }
  return groups;
}

/**
 * Normaliza cada grupo para {classe, sum, sum_1, sum_2}.
 * O `sum` do `.repeat(3)` sai como LISTA [area, estoque, w2] (molde solo) ou,
 * em versões do EE, como chaves separadas — esta função cobre os dois casos.
 */
function normalize(groups) {
  return (groups || []).map(function (g) {
    var s = g['sum'];
    if (s && typeof s.length === 'number') {
      return { classe: g['classe'], sum: s[0], sum_1: s[1], sum_2: s[2] };
    }
    return { classe: g['classe'], sum: g['sum'], sum_1: g['sum_1'], sum_2: g['sum_2'] };
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

/** Stack [área_ha, estoque, w2, classe]: área por classe do LULC (sempre
 * informativa, mask só no LULC) e estoque/incerteza nos pixels preditos. */
function statsImage(v) {
  var img = safeMosaic(v);
  var value = img.select(v.band).rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var areaHa = ee.Image.pixelArea().divide(10000);
  var area = areaHa.rename('area_ha').updateMask(lulc.mask());
  var stock = value.multiply(areaHa).rename('estoque').unmask(0).updateMask(mask);
  var w2 = v.stdBand
    ? img.select(v.stdBand).rename('w2').multiply(areaHa).pow(2).updateMask(mask)
    : ee.Image(0).rename('w2').updateMask(mask);
  return ee.Image.cat([area, stock, w2, lulc]);
}

function reduceFor(v, geom) {
  return statsImage(v).reduceRegion({
    reducer: REDUCER, geometry: geom, scale: SCALE, maxPixels: 1e13,
    tileScale: 2
  }).get('groups');
}

function r(n) { return Math.round(n * 10) / 10; }

function row(versionId, territorio, extra) {
  var base = { version: versionId, ano: YEAR, territorio: territorio };
  for (var k in extra) { if (extra.hasOwnProperty(k)) base[k] = extra[k]; }
  return base;
}

/** Expande os grupos decimais em linhas n0 (uma por classe LULC presente). */
function buildRows(v, territorio, groups) {
  var rows = [];
  groups = normalize(groupsOrEmpty(groups, v.id + ' · ' + territorio +
    ' (buildRows — reduzindo a linhas n0 por classe)'));
  if (!groups.length) { print('[AVISO]', v.id, territorio, '· 0 linhas geradas'); return rows; }

  groups.forEach(function (g) {
    var info = LEG.info(g['classe']);
    rows.push(row(v.id, territorio, {
      classe: g['classe'], n0: info.n0, n1: info.n1, n2: info.n2,
      marcador: info.n2,
      area_ha: r(g['sum']), estoque_t: r(g['sum_1']),
      incerteza_t: r(Math.sqrt(Math.max(g['sum_2'], 0)))
    }));
  });

  return rows;
}

/** Colunas dos CSVs das estatísticas (export único, só n0, sem .geo/system:index). */
var STATS_COLUMNS = ['version', 'ano', 'territorio', 'classe', 'n0', 'n1',
  'n2', 'marcador', 'area_ha', 'estoque_t', 'incerteza_t'];

/** Exporta UMA tabela por versão (selectors excluem .geometry/system:index). */
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
 * Gera as estatísticas de UMA versão (V03–V08), por região (bioma/UF).
 * Uso: engine.runForVersion('v07');
 */
exports.runForVersion = function (versionId) {
  var v = C.VERSIONS.filter(function (x) { return x.id === versionId; })[0];
  if (!v) { print('[ERRO] versão desconhecida:', versionId,
    '— disponíveis:', C.VERSIONS.map(function (x) { return x.id; }).join(', '));
    return; }
  print('MAPBIOMAS-CARBONO · Pantanal Forest · 7_statistics ·', v.id);

  collectRegions(function (regions) {
    var jobs = regions.map(function (region) { return { v: v, region: region }; });
    var done = 0;
    jobs.forEach(function (job) {
      reduceFor(job.v, job.region.geom).evaluate(function (groups) {
        var rows = buildRows(job.v, job.region.territorio, groups);
        exportCsv(rows,
          C.PREFIX + '_' + v.id + '_' + job.region.slug + '_' + YEAR,
          'WS_CARBONO_stats_forest_' + v.id + '_' + job.region.slug + '_' +
            YEAR,
          STATS_COLUMNS);
        print('[OK]', v.id, job.region.territorio, '·', rows.length,
          'classes · estoque', rows.reduce(function (acc, r2) {
            return acc + r2.estoque_t; }, 0), 'Mg');
        done++;
      }, function (err) {
        print('[ERRO]', v.id, job.region.territorio, String(err).slice(0, 200));
        done++;
      });
    });
  });
};

/**
 * O comparativo entre versões (V03–V08) é montado OFFLINE no Colab
 * (statistics_gcn → build_compare_forest), a partir dos `stats_forest_*.csv`.
 * As agregações n1/marcador/total também são derivadas offline (in-memory),
 * pois o CSV do GEE contém somente as linhas n0 (uma por classe).
 */