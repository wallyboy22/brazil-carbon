/******************************************************************************
 * Pantanal Grassland v02 · Check de entradas
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');
var biome = src.getBiome();
var mask = src.getGrasslandMask(c.YEAR);
var water = src.getWaterMask(c.YEAR);
var biomass = src.monthlyBiomass(c.YEAR, 1);
var anpp = src.monthlyAnpp(c.YEAR, 1);

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 1_check_inputs');
print('[CONTRACT] Ano:', c.YEAR, '· classes:', c.GRASSLAND_CLASSES,
  '· full-biome:', c.PREDICT_FULL_BIOME, '· water:', c.MASK_WATER);
print('[MODEL]', c.BIOMASS_MODEL.source, '→', JSON.stringify(c.BIOMASS_MODEL.coefficients));
print('[FIELD] asset:', c.FIELD.ASSET || 'null (usando coeficientes provisórios)');
print('[BIOME]', biome);
print('[MASK TYPES]', mask.bandTypes());
print('[WATER TYPES]', water.bandTypes());
print('[BIOMASS TYPES]', biomass.bandTypes());
print('[ANPP TYPES]', anpp.bandTypes());
Map.addLayer(mask, { palette: ['#86b074'] }, 'Grassland mask C11 (análise)', false);
Map.addLayer(water, { palette: ['#3288bd'] }, 'Água permanente (mascara)', false);
Map.addLayer(biomass, { min: 0, max: 8 }, 'Biomass Jan — bioma inteiro', true);
Map.addLayer(anpp, { min: 0, max: 2000 }, 'ANPP Jan — bioma inteiro', false);