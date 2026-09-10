/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal v05 · Predição em memória por célula
 * ---------------------------------------------------------------------------
 * A lista de células é filtrada server-side. ADD_LAYER=true permite inspeção
 * das imagens no mapa sem alterar o fluxo de export.
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v05/0_covariate_source.js');

var YEARS = [2023];
var CELL_SPLIT = 4;
var ADD_LAYER = false;
var PRED_PALETTE = ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'];
var ROOT = src.ASSET_ROOT;
var IC = ROOT + '/PREDICTIONS/COL';
var model = ee.Classifier.load(ROOT + '/MODELS/rf_agc_v05');
var biome = ee.FeatureCollection(src.BIOME_FC)
  .filter(ee.Filter.eq(src.BIOME_PROP, src.BIOME_NAME)).geometry();
var definitions = src.makeCellDefinitions(CELL_SPLIT);
var definitionById = {};
definitions.forEach(function (cell) { definitionById[cell.id] = cell; });
var cells = src.makeCellFeatures(CELL_SPLIT).map(function (cell) {
  var geom = cell.geometry().intersection(biome, ee.ErrorMargin(30));
  return cell.set({ valid_area: geom.area(30) });
}).filter(ee.Filter.gt('valid_area', 0));

function createExports(cellIds) {
  cellIds.forEach(function (cellId) {
    var definition = definitionById[cellId];
    if (!definition) return;
    var geom = ee.Geometry.BBox(definition.bbox[0], definition.bbox[1],
      definition.bbox[2], definition.bbox[3]).intersection(biome, ee.ErrorMargin(30));
    YEARS.forEach(function (year) {
      var image = src.buildTypedCovariatesStack(geom, year)
        .classify(model).rename('prediction_' + year).toFloat().clip(geom)
        .set('year', year).set('cell_id', cellId)
        .set('system:time_start', ee.Date.fromYMD(year, 1, 1).millis());
      var name = 'agc_pred_v05_' + cellId + '_' + year;
      if (ADD_LAYER) Map.addLayer(image,
        { min: 0, max: 75, palette: PRED_PALETTE }, name, false);
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

print('MAPBIOMAS-CARBONO · Pantanal v05 · 4_spatial_prediction');
print('[INFO] ADD_LAYER:', ADD_LAYER, '· anos:', YEARS);
print('[IMPORTANTE] As predições por célula entram na ImageCollection ' + IC);
src.ensureFolder(ROOT + '/PREDICTIONS');
src.ensureImageCollection(IC);
cells.aggregate_array('cell_id').evaluate(function (cellIds) {
  print('[OK] Células válidas:', cellIds.length);
  createExports(cellIds);
});
