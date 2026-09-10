/******************************************************************************
 * MAPBIOMAS-CARBONO — Coleção 0 · PANTANAL · v02 · Checagem de covariáveis
 * ---------------------------------------------------------------------------
 * Diagnóstico sem export: bandas do stack, camadas de referência e teste de
 * sampleRegions em três pontos.
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v02/0_covariate_source.js');

var YEAR = 2023;
var biomeFc = ee.FeatureCollection(src.BIOME_FC)
  .filter(ee.Filter.eq(src.BIOME_PROP, src.BIOME_NAME));
var aoi = biomeFc.geometry().bounds();
var stack = src.buildCovariatesStack(aoi, YEAR);

stack.bandNames().evaluate(function (bands) {
  print('[OK] Stack ' + YEAR + ':', bands.length, 'bandas');
  print('[OK] Bandas:', bands);
});

Map.addLayer(stack.select('NDVI_p50'), { min: 0, max: 9000 }, 'NDVI_p50', false);
Map.addLayer(stack.select('HH_db'), { min: -25, max: 0 }, 'PALSAR HH_db', false);
Map.addLayer(stack.select('HAND_m'), { min: 0, max: 100 }, 'HAND_m', false);

var lulc = ee.Image(
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/'
  + 'mapbiomas_brazil_collection11_coverage_v3')
  .select('classification_' + YEAR);
Map.addLayer(lulc, { min: 0, max: 91, palette: ['000000', '1f8d49'] },
  'MapBiomas LULC Col 11 (' + YEAR + ')', false);
Map.addLayer(biomeFc, { color: 'red' }, 'Limite Pantanal', true);

var testSample = stack.sampleRegions({
  collection: ee.FeatureCollection.randomPoints(aoi, 3, 42),
  properties: [],
  scale: src.SCALE,
  geometries: false,
  tileScale: 8
});
testSample.evaluate(function (sample) {
  var nProps = sample.features.length ?
    Object.keys(sample.features[0].properties).length : 0;
  print('[DEBUG] sampleRegions(3) — features:', sample.features.length,
    '· propriedades por feature:', nProps);
});

print('MAPBIOMAS-CARBONO · v02 · 1_check_covariates · Pantanal · ano ' + YEAR);
