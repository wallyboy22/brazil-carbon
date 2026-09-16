/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · stats_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas de AGC (agbd, t/ha) por classe LULC C11 para as
 * versões V03–V08 (2023). Requerido pelos steps `7_statistics.js` de cada
 * versão e por scripts ad-hoc no Code Editor.
 *
 * Expõe:
 *   runForVersion(versionId)  → CSV único `stats_forest_<v>_<territorio>_2023.csv`
 *                               com UMA linha por combinação (classe LULC × def_sec),
 *                               colunas em formato gráfico pronto para gráficos.
 *
 * Estratificação por desmatamento/vegetação secundária (def_sec, C11):
 *   banda classification_<ano> (unmask(0)); na redução o def_sec entra como
 *   COLUNAS MOD (área_modX/estoque_modX, X = 0..7) — Σ def_sec = total; as
 *   combinações (classe × def_sec) são expandidas cliente-side no buildRows
 *   (linha por combinação, coluna `Desmatamento e vegetação secundária` por
 *   extenso). O groupField é a banda LULC CRUA (padrão comprovado — banda
 *   derivada no group retorna groups=null no Code Editor).
 *
 * Método:
 *   área_ha  = pixelArea()/10000, mascarado SÓ pelo LULC;
 *   estoque  = banda (t/ha) × pixelArea()/10000  → TOTAL em t;
 *   w2       = (std_ensemble × pixelArea)² — apenas nos pixels preditos;
 *   reducer  = ee.Reducer.sum().repeat(19).group({groupField:19}) sobre o
 *              stack [área, estoque, w2, (área_modX, estoque_modX)×8, n0]
 *              — a banda de classificação (LULC cru) na ÚLTIMA posição;
 *   incerteza ± = √(Σ w2) — v07/v08; demais: 0.
 * Colunas CSV: version, ano, territorio, classe, cobertura (n0..n4),
 *   Desmatamento e vegetação secundária, Área (ha), Estoque de carbono (t),
 *   Incerteza do estoque (t).
 * Território: bioma + UF opcional (0_contract_stats).
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE;
var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var N_VALUE = 3 + 2 * LEG.DEFSEC_MODS.length; // área, estoque, w2 + (área_mod, estoque_mod)×8
var REDUCER = ee.Reducer.sum().repeat(N_VALUE)
  .group({ groupField: N_VALUE, groupName: 'classe' });

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
 * Normaliza cada grupo para {code, sums:[...]}.
 * O `sum` do `.repeat(N_VALUE)` sai como LISTA (molde solo) ou, em versões do
 * EE, como chaves separadas (sum/sum_1/…) — esta função cobre os dois casos.
 * `code` é o valor da banda `classe` (LULC cru) do groupName.
 */
function normalize(groups) {
  return (groups || []).map(function (g) {
    var s;
    if (g['sum'] !== undefined && typeof g['sum'].length === 'number') {
      s = g['sum'];
    } else {
      s = [];
      var i = 0;
      while (g['sum' + (i === 0 ? '' : '_' + i)] !== undefined) {
        s.push(g['sum' + (i === 0 ? '' : '_' + i)]);
        i++;
      }
    }
    return { code: g['classe'], sums: s };
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

/** Stack [área_ha, estoque, w2, (área_modX, estoque_modX)×8, n0]: área por
 * classe do LULC (sempre informativa, mask só no LULC), estoque/incerteza nos
 * pixels preditos e estratificação def_sec em COLUNAS MOD (Σ def_sec = total).
 * A banda de classificação é o LULC CRU (n0), na ÚLTIMA posição. */
function statsImage(v) {
  var img = safeMosaic(v);
  var value = img.select(v.band).rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var areaHa = ee.Image.pixelArea().divide(10000);
  var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR)).unmask(0);
  var area = areaHa.rename('area_ha').updateMask(lulc.mask());
  var stock = value.multiply(areaHa).rename('estoque').unmask(0).updateMask(mask);
  var w2 = v.stdBand
    ? img.select(v.stdBand).rename('w2').multiply(areaHa).pow(2).updateMask(mask)
    : ee.Image(0).rename('w2').updateMask(mask);
  var mods = [];
  LEG.DEFSEC_MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    mods.push(area.updateMask(cond).rename('area_mod' + m),
      stock.updateMask(cond).rename('estoque_mod' + m));
  });
  return ee.Image.cat([area, stock, w2].concat(mods).concat([lulc]));
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

/** Expande os grupos (CLASSE, lulc cru) em linhas de combinação
 * (classe × def_sec) usando as colunas mod (Σ def_sec = total) e descartando
 * combinações com área = 0. Colunas: cobertura (n0..n4), Desmatamento e
 * vegetação secundária (por extenso), Área (ha), Estoque de carbono (t),
 * Incerteza do estoque (t). */
function buildRows(v, territorio, groups) {
  var rows = [];
  groups = normalize(groupsOrEmpty(groups, v.id + ' · ' + territorio +
    ' (buildRows — reduzindo a linhas por combinação classe × def_sec)'));
  if (!groups.length) { print('[AVISO]', v.id, territorio, '· 0 linhas geradas'); return rows; }

  groups.forEach(function (g) {
    var s = g.sums;
    var info = LEG.info(g.code);
    var incerteza = r(Math.sqrt(Math.max(s[2], 0)));
    LEG.DEFSEC_MODS.forEach(function (m, j) {
      var off = 3 + j * 2;
      var areaMod = s[off];
      if (areaMod <= 0) return;
      rows.push(row(v.id, territorio, {
        classe: g.code,
        'cobertura (n0)': info.n0,
        'cobertura (n1)': info.n1,
        'cobertura (n2)': info.n2,
        'cobertura (n3)': info.n3,
        'cobertura (n4)': info.n4,
        'Desmatamento e vegetação secundária': LEG.defsecInfo(m).label,
        'Área (ha)': r(areaMod),
        'Estoque de carbono (t)': r(s[off + 1]),
        'Incerteza do estoque (t)': incerteza
      }));
    });
  });

  return rows;
}

/** Colunas dos CSVs das estatísticas (export único, só combinações,
 * sem .geo/system:index). Nomes já prontos para gráfico. */
function statsColumns() {
  return ['version', 'ano', 'territorio', 'classe',
    'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
    'cobertura (n4)', 'Desmatamento e vegetação secundária',
    'Área (ha)', 'Estoque de carbono (t)', 'Incerteza do estoque (t)'];
}

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
          statsColumns());
        print('[OK]', v.id, job.region.territorio, '·', rows.length,
          'combinações · estoque', rows.reduce(function (acc, r2) {
            return acc + r2['Estoque de carbono (t)']; }, 0), 'Mg');
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
 * O CSV do GEE contém UMA linha por combinação (classe × def_sec); as
 * agregações n0→n1, marcador e total são derivadas offline (in-memory),
 * somando as combinações por classe.
 */