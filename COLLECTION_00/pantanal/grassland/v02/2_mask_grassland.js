/******************************************************************************
 * Pantanal Grassland v02 · Máscaras (análise) — produção é em todo o bioma
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');
var mask = src.getGrasslandMask(c.YEAR);
var water = src.getWaterMask(c.YEAR);

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 2_mask_grassland');
print('[MOLDE] Na v02 os produtos NÃO são mascarados pela LULC (full-biome).');
print('        A máscara campestre passa a ser subconjunto de ANÁLISE/rotulação.');
print('[MASK] Classes C11:', c.GRASSLAND_CLASSES,
  '· cobrimento estimado (grassland/bioma, %)');
var cover = mask.reduceRegion({
  reducer: ee.Reducer.sum(), scale: c.SCALE, maxPixels: 1e13,
  geometry: src.getBiome().geometry()
});
var areaGrass = cover.getNumber('grassland_mask').multiply(c.SCALE * c.SCALE / 10000);
var areaWater = water.reduceRegion({
  reducer: ee.Reducer.sum(), scale: c.SCALE, maxPixels: 1e13,
  geometry: src.getBiome().geometry()
}).getNumber('water_mask').multiply(c.SCALE * c.SCALE / 10000);
var areaBiome = ee.Image.pixelArea().divide(10000).reduceRegion({
  reducer: ee.Reducer.sum(), scale: 1000, maxPixels: 1e9,
  geometry: src.getBiome().geometry()
}).getNumber('area');
areaGrass.divide(areaBiome).multiply(100).evaluate(function (pct) {
  print('[COBERTURA] campestre C11 ≈', pct.toFixed(1), '% do bioma');
});
areaWater.evaluate(function (ha) {
  print('[AGUA] permanente ≈', (ha / 10000).toFixed(0), 'mil ha');
});
Map.addLayer(mask, { palette: ['#86b074'] }, 'Grassland mask C11 (análise)', true);
Map.addLayer(water, { palette: ['#3288bd'] }, 'Água permanente', false);