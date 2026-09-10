/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal v03 · Validação do footprint persistido
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v03/0_covariate_source.js');
var footprints = ee.FeatureCollection(src.FOOTPRINT_ASSET);

print('MAPBIOMAS-CARBONO · Pantanal v03 · 2_0_check_footprint');
print('[INFO] Entrada:', src.FOOTPRINT_ASSET);

footprints.size().evaluate(function (n) {
  print(n > 0 ? '[OK] Footprints:' : '[ERRO] Footprint vazio:', n);
});
footprints.geometry().bounds().evaluate(function (bounds) {
  print('[OK] Extensão:', bounds);
});
footprints.first().propertyNames().evaluate(function (props) {
  print('[OK] Propriedades:', props);
});
