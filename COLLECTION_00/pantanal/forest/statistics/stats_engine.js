/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · stats_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas de AGC (agbd, Mg/ha) por classe LULC C11 para as
 * versões V03–V07 (2023). Requerido pelos steps `7_statistics.js` de cada
 * versão e por scripts ad-hoc no Code Editor.
 *
 * Expõe:
 *   runForVersion(versionId)  → CSV `stats_forest_<v>_<territorio>_2023.csv`
 *                               (níveis n0/n1/marcador/total)
 *   compareAll()              → `compare_forest_versoes_2023.csv` + resumo
 *
 * Método (molde mapbiomas_solo/collection3/statistics):
 *   área_ha  = pixelArea()/10000
 *   estoque  = banda (Mg/ha) × área_ha
 *   reducer  = ee.Reducer.sum().repeat(3).group({groupField:0}) sobre
 *              [classe, área_ha, estoque, w2], w2 = (std_ensemble × área_ha)²
 *   incerteza ± = √(Σ w2) — v07 (banda agbd_std_2023); demais versões: 0.
 * A partir dos grupos por classe decimal (n0) agregam-se n1, marcador e TOTAL.
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
  .group({ groupField: 0, groupName: 'classe' });

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

/** Stack [classe dec, área_ha, estoque, w2] mascarado por classe ∩ valor. */
function statsImage(v) {
  var img = safeMosaic(v);
  var value = img.select(v.band).rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var area = ee.Image.pixelArea().divide(10000).rename('area_ha').updateMask(mask);
  var stock = value.unmask(0).updateMask(mask);
  var w2 = v.stdBand
    ? img.select(v.stdBand).rename('w2').multiply(area).pow(2).updateMask(mask)
    : ee.Image(0).rename('w2').updateMask(mask);
  return ee.Image.cat([lulc.select('n0'), area, stock, w2]);
}

function reduceFor(v, geom) {
  return statsImage(v).reduceRegion({
    reducer: REDUCER, geometry: geom, scale: SCALE, maxPixels: 1e13,
    tileScale: 2
  }).get('groups');
}

function r(n) { return Math.round(n * 10) / 10; }

function row(versionId, territorio, grupo, nivel, extra) {
  var base = { version: versionId, ano: YEAR, territorio: territorio,
    nivel: nivel, grupo: grupo };
  for (var k in extra) { if (extra.hasOwnProperty(k)) base[k] = extra[k]; }
  return base;
}

function sumBy(groups, getKey) {
  var acc = {};
  groups.forEach(function (g) {
    var key = getKey(g['classe']);
    acc[key] = acc[key] || { area: 0, stock: 0, sq: 0 };
    acc[key].area += g['sum'];
    acc[key].stock += g['sum_1'];
    acc[key].sq += g['sum_2'];
  });
  return acc;
}

/** Expande os grupos decimais em linhas n0/n1(=N1)/marcador/TOTAL. */
function buildRows(v, territorio, groups) {
  var rows = [];
  groups = groupsOrEmpty(groups, v.id + ' · ' + territorio +
    ' (buildRows — reduzindo a linhas de n0/n1/marcador/total)');
  if (!groups.length) { print('[AVISO]', v.id, territorio, '· 0 linhas geradas'); return rows; }

  groups.forEach(function (g) {
    var info = LEG.info(g['classe']);
    rows.push(row(v.id, territorio, g['classe'], 'n0', {
      classe: g['classe'], n0: info.n0, n1: info.n1, n2: info.n2,
      marcador: info.n2,
      area_ha: r(g['sum']), estoque_Mg: r(g['sum_1']),
      incerteza_Mg: r(Math.sqrt(Math.max(g['sum_2'], 0)))
    }));
  });

  var byN1 = sumBy(groups, function (code) { return LEG.info(code).n1; });
  var order = ['Floresta', 'Campestre', 'Outros'];
  order.forEach(function (label) {
    if (!byN1[label]) return;
    var a = byN1[label];
    rows.push(row(v.id, territorio, label, 'n1', {
      classe: '', n0: '', n1: label, n2: '', marcador: '',
      area_ha: r(a.area), estoque_Mg: r(a.stock),
      incerteza_Mg: r(Math.sqrt(Math.max(a.sq, 0)))
    }));
  });

  var byMark = sumBy(groups, function (code) { return LEG.info(code).marcador; });
  [LEG.MARK_FOREST, LEG.MARK_GRASS, LEG.MARK_OTHER].forEach(function (mark) {
    var key = String(mark);
    if (!byMark[key]) return;
    var a = byMark[key];
    var label = LEG.N2_LABELS[key];
    rows.push(row(v.id, territorio, label, 'marcador', {
      classe: '', n0: '', n1: LEG.N1_LABELS[key], n2: label, marcador: label,
      area_ha: r(a.area), estoque_Mg: r(a.stock),
      incerteza_Mg: r(Math.sqrt(Math.max(a.sq, 0)))
    }));
  });

  var tot = sumBy(groups, function () { return 1 })['1'];
  rows.push(row(v.id, territorio, 'TOTAL', 'total', {
    classe: '', n0: '—', n1: '—', n2: '—', marcador: 'total',
    area_ha: r(tot.area), estoque_Mg: r(tot.stock),
    incerteza_Mg: r(Math.sqrt(Math.max(tot.sq, 0)))
  }));

  return rows;
}

/** QA de somas: n1 = total e decimal = total (imprime avisos). */
function qaSomas(v, territorio, rows) {
  var n1 = {}, dec = 0, total = null;
  rows.forEach(function (r) {
    if (r.nivel === 'n0') { dec += r.estoque_Mg; }
    if (r.nivel === 'n1') { n1[r.grupo] = r.estoque_Mg; }
    if (r.nivel === 'total') { total = r.estoque_Mg; }
  });
  if (!total) { print('[QA !]', v.id, territorio, 'sem linha TOTAL'); return; }
  var somaN1 = ['Floresta', 'Campestre', 'Outros']
    .reduce(function (acc, k) { return acc + (n1[k] || 0); }, 0);
  if (Math.abs(somaN1 - total) > 1) {
    print('[QA !]', v.id, territorio, 'n1 ≠ total:', somaN1, 'vs', total);
  }
  if (Math.abs(dec - total) > 1) {
    print('[QA !]', v.id, territorio, 'decimal ≠ total:', dec, 'vs', total);
  }
}

function exportCsv(rows, fileName, description) {
  if (!rows.length) return;
  var n = Math.ceil(rows.length / 10) - 1;
  for (var p = 0; p <= n; p++) {
    var slice = rows.slice(p * 10, (p + 1) * 10);
    Export.table.toDrive({
      collection: ee.FeatureCollection(slice.map(function (r2) {
        return ee.Feature(null, r2); })),
      description: description + '_p' + p,
      folder: C.DRIVE_FOLDER,
      fileNamePrefix: fileName + (n ? '_part' + p : ''),
      fileFormat: 'CSV'
    });
  }
}

/**
 * Gera as estatísticas de UMA versão (V03–V07), por região (bioma/UF).
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
        qaSomas(job.v, job.region.territorio, rows);
        exportCsv(rows,
          C.PREFIX + '_' + v.id + '_' + job.region.slug + '_' + YEAR,
          'WS_CARBONO_stats_forest_' + v.id + '_' + job.region.slug + '_' + YEAR);
        print('[OK]', v.id, job.region.territorio, '·', rows.length, 'linhas');
        done++;
      }, function (err) {
        print('[ERRO]', v.id, job.region.territorio, String(err).slice(0, 200));
        done++;
      });
    });
  });
};

/** Stack [marcador, área_ha, estoque, w2] para comparativo entre versões. */
function markerStack(v) {
  var img = safeMosaic(v);
  var value = img.select(v.band).rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND)
    .remap(LEG.FOREST_CLASSES.concat(LEG.GRASSLAND_CLASSES),
      LEG.FOREST_CLASSES.map(function () { return LEG.MARK_FOREST; })
        .concat(LEG.GRASSLAND_CLASSES.map(function () { return LEG.MARK_GRASS; })),
      LEG.MARK_OTHER)
    .rename('mark');
  var mask = value.mask().and(lulc.mask());
  var area = ee.Image.pixelArea().divide(10000).rename('area_ha').updateMask(mask);
  var stock = value.unmask(0).updateMask(mask);
  var w2 = v.stdBand
    ? img.select(v.stdBand).rename('w2').multiply(area).pow(2).updateMask(mask)
    : ee.Image(0).rename('w2').updateMask(mask);
  return ee.Image.cat([lulc, area, stock, w2]);
}

/** Comparativo V03–V07 (florestal × campestre × total) — CSV + gráfico. */
exports.compareAll = function () {
  print('MAPBIOMAS-CARBONO · Pantanal Forest · 3_compare_versoes');
  var b = biome();
  var rows = [];
  var pending = C.VERSIONS.length;

  C.VERSIONS.forEach(function (v) {
    markerStack(v).reduceRegion({
      reducer: REDUCER, geometry: b, scale: SCALE, maxPixels: 1e13, tileScale: 2
    }).get('groups').evaluate(function (groups) {
      groups = groupsOrEmpty(groups, v.id + ' · PO2 (compareAll)');
      var tot = { area: 0, stock: 0, sq: 0 };
      groups.forEach(function (g) {
        var key = String(g['classe']);
        var label = LEG.N2_LABELS[key] || 'outros';
        rows.push({ version: v.id, ano: YEAR, marcador: label,
          area_ha: r(g['sum']), estoque_Mg: r(g['sum_1']),
          incerteza_Mg: r(Math.sqrt(Math.max(g['sum_2'], 0))) });
        tot.area += g['sum']; tot.stock += g['sum_1']; tot.sq += g['sum_2'];
      });
      rows.push({ version: v.id, ano: YEAR, marcador: 'total',
        area_ha: r(tot.area), estoque_Mg: r(tot.stock),
        incerteza_Mg: r(Math.sqrt(Math.max(tot.sq, 0))) });
      pending--;
      if (pending === 0) {
        rows.forEach(function (r2) {
          print(r2.version, '|', r2.marcador, '| área', r2.area_ha,
            'ha | estoque', r2.estoque_Mg, 'Mg | ±', r2.incerteza_Mg);
        });
        exportCsv(rows, 'compare_forest_versoes_' + YEAR,
          'WS_CARBONO_compare_forest_versoes_' + YEAR);
      }
    }, function (err) {
      print('[ERRO]', v.id, String(err).slice(0, 200));
      pending--;
    });
  });
};