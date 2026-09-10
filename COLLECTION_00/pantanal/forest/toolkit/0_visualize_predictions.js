/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · Toolkit 1 · Visualização de predições
 * ---------------------------------------------------------------------------
 * Compara as predições (ImageCollection PREDICTIONS/COL) das versões da
 * Coleção 0 no mapa. Basta editar VERSIONS (e, se preciso, o VIS).
 ******************************************************************************/

// =============================================================================
// 0. CONFIG
// =============================================================================
var VERSIONS = [
  // '01','02',
  '03', '04', '05', '06'
  // '07'
];

var PRED_VIS = {
  min: 0,
  max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850']
};

// =============================================================================
// 1. LOOP DE VERSÕES
// =============================================================================
VERSIONS.forEach(function (version) {
  var prediction = ee.ImageCollection(
    'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V' +
    version + '/PREDICTIONS/COL');
  print('V' + version, prediction, prediction.size());
  Map.addLayer(prediction, PRED_VIS, 'prediction_V' + version);
});