/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal v05 · QA
 ******************************************************************************/
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v05/0_covariate_source.js');
var roots = ['/MATRIX', '/MODELS'];
var col = ee.ImageCollection(src.ASSET_ROOT + '/PREDICTIONS/COL');
var PRED_VIS = {
  min: 0,
  max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850']
};
print('MAPBIOMAS-CARBONO · Pantanal v05 · 6_qa');
roots.forEach(function (suffix) {
  var response = ee.data.listAssets(src.ASSET_ROOT + suffix);
  print('[QA]', suffix, (response.assets || []).map(function (a) { return a.id; }));
});
col.size().evaluate(function (n) {
  print('[QA] PREDICTIONS/COL · membros:', n);
});
col.aggregate_array('year').distinct().evaluate(function (years) {
  print('[QA] PREDICTIONS/COL · anos:', years);
  years.forEach(function (year) {
    var byYear = col.filter(ee.Filter.eq('year', year));
    var mosaic = byYear.mosaic().toFloat();
    Map.addLayer(mosaic, PRED_VIS, 'V05_merged_' + year);
    byYear.size().evaluate(function (n) {
      print('[QA] Mosaico ' + year + ' · imagens (células):', n);
    });
  });
});