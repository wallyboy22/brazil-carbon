/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal v04 · Treino com matriz do cache raster
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v04/0_covariate_source.js');

var MATRIX_ROOT = src.ASSET_ROOT + '/MATRIX';
var MODEL_ROOT = src.ASSET_ROOT + '/MODELS';
var MODEL_ASSET = MODEL_ROOT + '/rf_agc_v04';
var params = { numberOfTrees: 300, bagFraction: 0.632, seed: 2021 };

var response = ee.data.listAssets(MATRIX_ROOT);
var matrixAssets = (response.assets || []).filter(function (asset) {
  return asset.type === 'TABLE' && asset.id.indexOf('/agc_matrix_v04_') > -1;
});
if (!matrixAssets.length) throw new Error('Matriz v04 não encontrada: ' + MATRIX_ROOT);

var matrix = ee.FeatureCollection(matrixAssets.map(function (asset) {
  return ee.FeatureCollection(asset.id);
})).flatten().select(src.FEATURE_BANDS.concat([src.TARGET]));
var model = ee.Classifier.smileRandomForest(params)
  .setOutputMode('REGRESSION')
  .train({ features: matrix, classProperty: src.TARGET,
    inputProperties: src.FEATURE_BANDS });

print('MAPBIOMAS-CARBONO · Pantanal v04 · 3_model_training');
print('[OK] Matrizes:', matrixAssets.length, '· features:', src.FEATURE_BANDS.length);
matrix.size().evaluate(function (n) { print('[OK] Amostras:', n); });
src.ensureFolder(MODEL_ROOT);
Export.classifier.toAsset({
  classifier: model,
  description: 'WS_CARBONO_toAsset-rf_agc_v04',
  assetId: MODEL_ASSET
});
print('[TASK] Modelo:', MODEL_ASSET);
