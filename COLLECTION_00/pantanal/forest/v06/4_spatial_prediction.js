/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v06 · Predição mascarada
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_covariate_source.js');
var CELL_SPLIT = 4;
var YEARS = [2023];
var ADD_LAYER = false;
var palette = ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'];
var root = c.ASSET_ROOT;
var IC = root + '/PREDICTIONS/COL';
var model = ee.Classifier.load(root + '/MODELS/rf_agc_v06_forest_masked');
var biome = src.getBiome().geometry();
var defs = c.makeCellDefinitions(CELL_SPLIT);
var byId = {};
defs.forEach(function (cell) { byId[cell.id] = cell; });
var cells = c.makeCellFeatures(CELL_SPLIT).map(function (cell) {
  var geom = cell.geometry().intersection(biome, ee.ErrorMargin(30));
  return cell.set({ valid_area: geom.area(30) });
}).filter(ee.Filter.gt('valid_area', 0));

function createExports(ids) {
  ids.forEach(function (id) {
    var def = byId[id];
    var geom = ee.Geometry.BBox(def.bbox[0], def.bbox[1], def.bbox[2], def.bbox[3])
      .intersection(biome, ee.ErrorMargin(30));
    YEARS.forEach(function (year) {
      var mask = src.getForestMask(year);
      var image = src.buildTypedCovariatesStack(geom, year).classify(model)
        .rename('prediction_' + year).toFloat().updateMask(mask).clip(geom)
        .set('year', year).set('cell_id', id)
        .set('system:time_start', ee.Date.fromYMD(year, 1, 1).millis());
      var name = 'agc_pred_v06_' + id + '_' + year;
      if (ADD_LAYER) Map.addLayer(image, { min: 0, max: 150, palette: palette }, name, false);
      Export.image.toAsset({ image: image,
        description: 'WS_CARBONO_toAsset-' + name,
        assetId: IC + '/' + name,
        overwrite: false,
        region: geom, scale: c.SCALE, maxPixels: 1e13,
        pyramidingPolicy: { '.default': 'mean' } });
    });
  });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v06 · 4_spatial_prediction');
print('[MASK MODE]', c.MASK_MODE, '· [ADD_LAYER]', ADD_LAYER);
print('[IMPORTANTE] As predições por célula entram na ImageCollection ' + IC);
src.ensureFolder(root + '/PREDICTIONS');
src.ensureImageCollection(IC);
cells.aggregate_array('cell_id').evaluate(function (ids) {
  print('[CÉLULAS]', ids.length); createExports(ids);
});
