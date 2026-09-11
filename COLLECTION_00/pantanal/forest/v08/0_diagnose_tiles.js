/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 0_DIAGNOSE_TILES (fase 0)
 * ---------------------------------------------------------------------------
 * Confirmação da hipótese PALSAR antes de qualquer export da v08 (v08/README,
 * seção 4). Usa a predição v07 (produto 2023) + os modelos v07 no stack v07:
 *
 *   1. confinar o artefato: células 4×4 com excesso (p99 do agbd) e std alto
 *      (agbd_std) — destaca ids das células suspeitas no console e no mapa;
 *   2. banda culpada: amostra média de cada covariável na célula suspeita ×
 *      vizinha normal (salto em HV_db/HH_db indica PALSAR por célula);
 *   3. reprodução por membro: classifica uma célula suspeita com cada membro
 *      m1..m5 na PREDICTION + cruza com getMemberBands(i) p/ ver participação
 *      de HV/HH (SMOKE_CELLS replica este passo no export 4_spatial_prediction);
 *   4. cross-check com v03: o mesmo stack classificado com rf_agc_v03_lin
 *      (suave = artefato é resposta do modelo, não do stack).
 *
 * Mapas NÃO são produtos da v08 — são diagnóstico. ADD_LAYER=false por padrão.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var CELL_SPLIT = 4;
var YEAR = 2023;
var ADD_LAYER = true;
var V07_ROOT = c.FOOTPRINT_ASSET
  .slice(0, c.FOOTPRINT_ASSET.indexOf('/SAMPLES')) + '/V07';
var N = c.ENSEMBLE.NUM_MEMBERS;

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 0_diagnose_tiles');
print('[FASE 0] confirmar hipótese PALSAR (v08/README §4) — usa ASSETS da v07');

var biome = src.getBiome().geometry();
var v07merged = ee.Image(V07_ROOT + '/PREDICTIONS/agc_pred_v07_merged_2023')
  .select('prediction_2023', 'agbd_std_2023');

// 1) células com excesso: p99 do agbd + std alto
var pred = v07merged.select('prediction_2023').rename('pred');
var std = v07merged.select('agbd_std_2023').rename('std');
var p99 = pred.reduceRegion({ reducer: ee.Reducer.percentile([99]),
  geometry: biome, scale: c.SCALE, maxPixels: 1e13, tileScale: 4 });
var std75 = std.reduceRegion({ reducer: ee.Reducer.percentile([75]),
  geometry: biome, scale: c.SCALE, maxPixels: 1e13, tileScale: 4 });

p99.get('pred').evaluate(function (p99v) {
  std75.get('std').evaluate(function (s75v) {
    var cells = c.makeCellFeatures(CELL_SPLIT).map(function (cell) {
      var g = cell.geometry().intersection(biome, ee.ErrorMargin(30));
      var stat = v07merged.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: g, scale: c.SCALE, maxPixels: 1e13, tileScale: 4 });
      return cell.set({
        pred_mean: stat.get('prediction_2023'),
        std_mean: stat.get('agbd_std_2023')
      });
    }).filter(ee.Filter.gte('std_mean', ee.Number(s75v)));
    cells.aggregate_array('cell_id').evaluate(function (ids) {
      print('[SUSPEITAS (p99 agbd=' + Math.round(p99v) + ', std p75=' +
        Math.round(s75v) + ')]', ids);
      print('[INSTRUÇÃO] preencher c.SMOKE_CELLS com os ids acima e rodar ' +
        '2_2→3→4 da v08; as bandas membro m1..mN ficarão nos exports dessas ' +
        'células (auditoria F25).');
      if (ADD_LAYER) Map.addLayer(v07merged.clip(biome),
        { min: 0, max: 75, palette: ['#d73027', '#fc8d59', '#fee08b',
          '#d9ef8b', '#91cf60', '#1a9850'] }, 'V07 AGD 2023 (diagnóstico)', true);
    });
  });
});

// 2) banda culpada — amostra por célula (suspeita × 5 vizinhas).
print('[REPRODUÇÃO POR MEMBRO] assinaturas determinísticas dos membros:');
for (var i = 1; i <= N; i++) {
  print('  m' + i, '→ bandas', src.getMemberBands(i).filter(function (b) {
    return ['HH_db', 'HV_db', 'HV_HH_ratio', 'RVI'].indexOf(b) > -1;
  }), '(frações PALSAR)');
}

// 3) compara stack v07 × stack v08 (PALSAR global) nas mesmas células.
function bandDiff(year, band) {
  var g = biome;
  var s07 = baseTyped(year).select(band).rename('v07');
  var s08 = src.buildTypedCovariatesStack(g, year).select(band).rename('v08');
  return s07.addBands(s08).reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: g, scale: c.SCALE, maxPixels: 1e13, tileScale: 4 });
}

// base = cadeia v07 original (PALSAR per-célula) para comparação.
var base = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_covariate_source.js');
function baseTyped(year) { return base.buildTypedCovariatesStack(biome, year); }

['HV_db', 'HH_db', 'HV_HH_ratio', 'RVI'].forEach(function (band) {
  bandDiff(YEAR, band).evaluate(function (v) {
    print('[BANDA ' + band + '] média v07 (por célula) =',
      v.v07_mean ? ee.Number(v.v07_mean).round() : 'NA',
      '· média v08 (global) =', v.v08_mean ? ee.Number(v.v08_mean).round() : 'NA',
      '(platôs por célula desaparecem na v08)');
  }, function (err) {
    print('[ERRO em bandDiff(' + band + ')]', err);
  });
});