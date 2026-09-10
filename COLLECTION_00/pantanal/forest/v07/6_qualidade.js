/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · 6_QUALIDADE
 * ---------------------------------------------------------------------------
 * QA visual. Plota TODAS as coleções anteriores (V03, V04, V05, V06) e a v07
 * (mediana + stdDev) lado a lado, para comparação de consistência temporal e
 * espacial das predições; além do panorama da ImageCollection COL da v07.
 *
 * A máscara LULC é APENAS de treino na v07 — a comparação é feita sobre a
 * região comum (bioma), sem exigir máscara de cobertura.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_covariate_source.js');
var root = c.ASSET_ROOT;
var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var col = ee.ImageCollection(root + '/PREDICTIONS/COL');
var PRED_VIS = {
  min: 0, max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850']
};
var STD_VIS = { min: 0, max: 40, palette: ['#ffffb2', '#fd8d3c', '#d73027', '#7f0000'] };

// Coleções anteriores (mosaico anual do 5_merge de cada versão)
var PREV = [
  { v: 'v03', merge: BASE + '/V03/PREDICTIONS/agc_pred_v03_merged_' },
  { v: 'v04', merge: BASE + '/V04/PREDICTIONS/agc_pred_v04_merged_' },
  { v: 'v05', merge: BASE + '/V05/PREDICTIONS/agc_pred_v05_merged_' },
  { v: 'v06', merge: BASE + '/V06/PREDICTIONS/agc_pred_v06_merged_' }
];

function exists(assetId) {
  var parts = assetId.split('/');
  parts.pop();
  var parent = parts.join('/');
  var r = ee.data.listAssets(parent);
  return (r.assets || []).some(function (a) { return a.id === assetId; });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v07 · 6_qualidade');
print('[CLASSES TREINO]', c.FOREST_CLASSES,
  '· [MASK MODE]', c.MASK_MODE, '(não mascara a predição)');

col.size().evaluate(function (n) {
  print('[V07 COL · predições de célula]', n);
});
col.aggregate_array('year').distinct().evaluate(function (years) {
  print('[V07 COL · anos]', years);
});

c.YEARS.forEach(function (year) {
  PREV.forEach(function (p) {
    var id = p.merge + year;
    if (!exists(id)) { print('[AVISO] coleção anterior não encontrada:', id); return; }
    Map.addLayer(ee.Image(id), PRED_VIS, 'V0' + p.v.replace('v', '') + '_merged_' + year, false);
  });

  var byYear = col.filter(ee.Filter.eq('year', year));
  var mosaic = byYear.mosaic().toFloat();
  Map.addLayer(mosaic.select('prediction_' + year), PRED_VIS,
    'V07_merged_' + year, true);
  Map.addLayer(mosaic.select('agbd_std_' + year), STD_VIS,
    'V07_std_' + year, false);
  byYear.size().evaluate(function (n) {
    print('[QA ' + year + '] v07 · imagens (células):', n);
  });
});

col.first().bandNames().evaluate(function (b) {
  print('[V07 COL · bandNames do primeiro membro]', b);
});
print('[bitácora] V07 predição: mediana do ensemble; agbd_std: desvio padrão dos membros.');