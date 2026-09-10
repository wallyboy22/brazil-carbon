/******************************************************************************
 * Pantanal Grassland v01 · Máscara Coleção 11
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v01/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v01/0_sensor_landsat_modis.js');
var mask = src.getGrasslandMask(c.YEAR);
print('MAPBIOMAS-CARBONO · Pantanal Grassland v01 · 2_mask_grassland');
print('[MASK] Classes C11:', c.GRASSLAND_CLASSES);
Map.addLayer(mask, { palette: ['#86b074'] }, 'Pantanal grassland C11', true);
