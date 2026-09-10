/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v06 · Footprints florestais
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_covariate_source.js');
var raw = ee.FeatureCollection(c.FOOTPRINT_ASSET);
var mask = src.getForestMask(c.YEAR);
var filtered = mask.sampleRegions({
  collection: raw,
  properties: src.SAMPLE_PROPS,
  scale: c.SCALE,
  geometries: true,
  tileScale: 16
}).filter(ee.Filter.eq('forest_mask', 1));
var asset = c.ASSET_ROOT + '/SAMPLES/forest_footprint_v06_' + c.YEAR;

print('MAPBIOMAS-CARBONO · Pantanal Forest v06 · 2_1_filter_footprint');
print('[CLASSES]', c.FOREST_CLASSES);
src.ensureFolder(c.ASSET_ROOT + '/SAMPLES');
Export.table.toAsset({
  collection: filtered,
  description: 'WS_CARBONO_toAsset-forest_footprint_v06_' + c.YEAR,
  assetId: asset
});
print('[TASK]', asset);
