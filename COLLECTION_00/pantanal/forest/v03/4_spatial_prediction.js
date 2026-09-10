/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal v03 · Predição espacial
 * ---------------------------------------------------------------------------
 * A grade é filtrada server-side; apenas uma lista final de células atravessa
 * evaluate(). Os exports são criados client-side para essas células válidas.
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v03/0_covariate_source.js');

var YEARS = [2023];
var PRED_PART_SPLIT = 4;
var ADD_LAYER = false;
var PRED_PALETTE = ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'];
var ASSET_PREDICTIONS = src.ASSET_ROOT + '/PREDICTIONS';
var IC = ASSET_PREDICTIONS + '/COL';
var MODEL_ASSET = src.ASSET_ROOT + '/MODELS/rf_agc_v03';

var model = ee.Classifier.load(MODEL_ASSET);
var biomeGeom = ee.FeatureCollection(src.BIOME_FC)
  .filter(ee.Filter.eq(src.BIOME_PROP, src.BIOME_NAME)).geometry();
var cells = src.makeCellFeatures(PRED_PART_SPLIT).map(function (cell) {
  var geom = cell.geometry().intersection(biomeGeom, ee.ErrorMargin(30));
  return cell.set({ valid_area: geom.area(30) });
}).filter(ee.Filter.gt('valid_area', 0));
var cellDefinitions = {};
src.makeCellDefinitions(PRED_PART_SPLIT).forEach(function (cell) {
  cellDefinitions[cell.id] = cell;
});

function createExports(cellIds) {
  cellIds.forEach(function (cellId) {
    var definition = cellDefinitions[cellId];
    if (!definition) return;
    var geom = ee.Geometry.BBox(definition.bbox[0], definition.bbox[1],
      definition.bbox[2], definition.bbox[3]).intersection(biomeGeom, ee.ErrorMargin(30));
    YEARS.forEach(function (year) {
      var image = src.buildTypedCovariatesStack(geom, year)
        .classify(model).rename('prediction_' + year).toFloat().clip(geom)
        .set('year', year).set('cell_id', cellId)
        .set('system:time_start', ee.Date.fromYMD(year, 1, 1).millis());
      var name = 'agc_pred_v03_' + cellId + '_' + year;
      if (ADD_LAYER) Map.addLayer(image,
        { min: 0, max: 150, palette: PRED_PALETTE }, name, false);
      Export.image.toAsset({
        image: image,
        description: 'WS_CARBONO_toAsset-' + name,
        assetId: IC + '/' + name,
        overwrite: false,
        region: geom, scale: src.SCALE, maxPixels: 1e13,
        pyramidingPolicy: { '.default': 'mean' }
      });
    });
  });
}

print('MAPBIOMAS-CARBONO · Pantanal v03 · 4_spatial_prediction');
print('[INFO] Modelo:', MODEL_ASSET, '· ADD_LAYER:', ADD_LAYER);
print('[IMPORTANTE] As predições por célula entram na ImageCollection ' + IC);
src.ensureFolder(ASSET_PREDICTIONS);
src.ensureImageCollection(IC);
cells.aggregate_array('cell_id').evaluate(function (cellIds) {
  print('[OK] Células válidas:', cellIds.length);
  createExports(cellIds);
});
