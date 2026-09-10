/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal v04 · Matriz a partir do cache raster
 ******************************************************************************/
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v04/0_covariate_source.js');
var YEAR = 2023;
var TILE_SCALE = 16;
var COVARIATES = src.ASSET_ROOT + '/COVARIATES';
var MATRIX = src.ASSET_ROOT + '/MATRIX';
var biome = ee.FeatureCollection(src.BIOME_FC)
  .filter(ee.Filter.eq(src.BIOME_PROP, src.BIOME_NAME)).geometry();
var footprints = ee.FeatureCollection(src.FOOTPRINT_ASSET).filterBounds(biome);
var response = ee.data.listAssets(COVARIATES);
var assets = (response.assets || []).filter(function (a) {
  return a.type === 'IMAGE' && a.id.slice(-4) === String(YEAR);
});

print('MAPBIOMAS-CARBONO · Pantanal v04 · 2_2_data_matrix_from_assets');
print('[INFO] Células raster:', assets.length);
src.ensureFolder(MATRIX);
assets.forEach(function (asset) {
  var image = ee.Image(asset.id);
  var points = footprints.filterBounds(image.geometry());
  var sampled = image.sampleRegions({
    collection: points,
    properties: src.SAMPLE_PROPS,
    scale: src.SCALE,
    geometries: true,
    tileScale: TILE_SCALE
  }).filter(ee.Filter.notNull(src.FEATURE_BANDS.concat([src.TARGET])));
  var name = asset.id.split('/').pop().replace('covariates_', 'agc_matrix_');
  Export.table.toAsset({
    collection: sampled,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: MATRIX + '/' + name
  });
});
