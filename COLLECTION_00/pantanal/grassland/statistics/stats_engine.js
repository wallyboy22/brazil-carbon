/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland · stats_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas dos produtos campestres v01 (biomassa, ANPP,
 * carbono) por classe LULC C11, ano 2023. Requerido pelo step
 * `7_statistics.js` da v01 (e por scripts ad-hoc no Code Editor).
 *
 * Expõe:
 *   runForVersion(versionId)  → CSVs `stats_grassland_<produto>_<territorio>_2023.csv`
 *                               (níveis n0/n1/marcador/total por produto)
 *   compareAll()              → `compare_grassland_produtos_2023.csv` + resumo
 *
 * Método (molde mapbiomas_solo/collection3/statistics):
 *   área_ha  = pixelArea()/10000
 *   valor    = banda (convertida a Mg/ha via toMgFactor) × área_ha
 *   reducer  = ee.Reducer.sum().repeat(2).group({groupField:0}) sobre
 *              [classe, área_ha, valor]
 * Produtos não possuem incerteza publicada (diferente do forest, que carrega
 * o ± do ensemble v07).
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE;
var REDUCER = ee.Reducer.sum().repeat(2)
  .group({ groupField: 0, groupName: 'classe' });

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

/** Stack [classe dec, área_ha, valor_Mg] mascarado por classe ∩ valor. */
function productImage(p) {
  var value = ee.Image(p.asset).select(p.band).multiply(p.toMgFactor)
    .rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var area = ee.Image.pixelArea().divide(10000).rename('area_ha').updateMask(mask);
  value = value.unmask(0).updateMask(mask);
  return ee.Image.cat([lulc.select('n0'), area, value]);
}

function reduceFor(p, geom) {
  return productImage(p).reduceRegion({
    reducer: REDUCER, geometry: geom, scale: SCALE, maxPixels: 1e13,
    tileScale: 2
  }).get('groups');
}

function r(n) { return Math.round(n * 10) / 10; }

function row(product, territorio, grupo, nivel, extra) {
  var base = { produto: product.id, ano: YEAR, territorio: territorio,
    nivel: nivel, grupo: grupo, unidade: product.unit };
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

function buildRows(p, territorio, groups) {
  var rows = [];

  groups.forEach(function (g) {
    var info = LEG.info(g['classe']);
    rows.push(row(p, territorio, g['classe'], 'n0', {
      classe: g['classe'], n0: info.n0, n1: info.n1, n2: info.n2,
      marcador: info.n2,
      area_ha: r(g['sum']), valor_Mg: r(g['sum_1'])
    }));
  });

  var byN1 = sumBy(groups, function (code) { return LEG.info(code).n1; });
  ['Campestre', 'Outros'].forEach(function (label) {
    if (!byN1[label]) return;
    var a = byN1[label];
    rows.push(row(p, territorio, label, 'n1', {
      classe: '', n0: '', n1: label, n2: '', marcador: '',
      area_ha: r(a.area), valor_Mg: r(a.valor)
    }));
  });

  var byMark = sumBy(groups, function (code) { return LEG.info(code).marcador; });
  [LEG.MARK_GRASS, LEG.MARK_OTHER].forEach(function (mark) {
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
 * Gera as estatísticas de UMA versão dos produtos campestres (v01), por
 * região (bioma/UF). Uso: engine.runForVersion('v01');
 */
exports.runForVersion = function (versionId) {
  if (versionId !== 'v01') { print('[ERRO] grassland só possui v01; recebido:',
    versionId); return; }
  print('MAPBIOMAS-CARBONO · Pantanal Grassland · 7_statistics · v01');

  collectRegions(function (regions) {
    var jobs = [];
    regions.forEach(function (region) {
      C.PRODUCTS.forEach(function (p) { jobs.push({ p: p, region: region }); });
    });
    var done = 0;
    jobs.forEach(function (job) {
      reduceFor(job.p, job.region.geom).evaluate(function (groups) {
        var rows = buildRows(job.p, job.region.territorio, groups);
        qaSomas(job.p, job.region.territorio, rows);
        exportCsv(rows,
          C.PREFIX + '_' + job.p.id + '_' + job.region.slug + '_' + YEAR,
          'WS_CARBONO_stats_grassland_' + job.p.id + '_' + job.region.slug +
            '_' + YEAR);
        print('[OK]', job.p.id, job.region.territorio, '·', rows.length,
          'linhas');
        done++;
      }, function (err) {
        print('[ERRO]', job.p.id, job.region.territorio,
          String(err).slice(0, 200));
        done++;
      });
    });
  });
};

/** Comparativo dos produtos (biomassa × ANPP × carbono) — CSV + gráfico. */
exports.compareAll = function () {
  print('MAPBIOMAS-CARBONO · Pantanal Grassland · 3_compare_produtos');
  var b = biome();
  var rows = [];
  var pending = C.PRODUCTS.length;

  C.PRODUCTS.forEach(function (p) {
    reduceFor(p, b).evaluate(function (groups) {
      var tot = { area: 0, valor: 0 };
      groups.forEach(function (g) {
        var info = LEG.info(g['classe']);
        rows.push({ produto: p.id, ano: YEAR, classe: g['classe'], n0: info.n0,
          n1: info.n1, marcador: info.n2,
          area_ha: r(g['sum']), valor_Mg: r(g['sum_1']), unidade: p.unit });
        tot.area += g['sum']; tot.valor += g['sum_1'];
      });
      rows.push({ produto: p.id, ano: YEAR, classe: '', n0: 'TOTAL', n1: '—',
        marcador: 'total',
        area_ha: r(tot.area), valor_Mg: r(tot.valor), unidade: p.unit });
      pending--;
      if (pending === 0) {
        rows.forEach(function (r2) {
          print(r2.produto, '|', r2.classe, r2.n0, '| área', r2.area_ha,
            'ha |', r2.valor_Mg, r2.unidade);
        });
        exportCsv(rows, 'compare_grassland_produtos_' + YEAR,
          'WS_CARBONO_compare_grassland_produtos_' + YEAR);
      }
    }, function (err) {
      print('[ERRO]', p.id, String(err).slice(0, 200));
      pending--;
    });
  });
};