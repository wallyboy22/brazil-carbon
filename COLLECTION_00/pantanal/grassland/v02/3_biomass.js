/******************************************************************************
 * Pantanal Grassland v02 · Biomassa seca mensal/anual — TODO o bioma
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');
var ROOT = c.ASSET_ROOT + '/BIOMASS';
var months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var monthly = ee.Image.cat(months.map(function (month) {
  return src.monthlyBiomass(c.YEAR, month);
}));
var annual = monthly.reduce(ee.Reducer.mean()).rename('biomass_annual').toFloat();
var region = src.getBiome().geometry();

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 3_biomass');
print('[MODEL]', c.BIOMASS_MODEL.source, '· clamp',
  JSON.stringify(c.BIOMASS_MODEL.clampMgHa), '· domínio: bioma inteiro (full)');
src.ensureFolder(ROOT);
Export.image.toAsset({
  image: monthly,
  description: 'WS_CARBONO_toAsset-grassland_biomass_monthly_v02_2023',
  assetId: ROOT + '/grassland_biomass_monthly_v02_2023',
  region: region, scale: c.SCALE, maxPixels: 1e13,
  pyramidingPolicy: { '.default': 'mean' }
});
Export.image.toAsset({
  image: annual,
  description: 'WS_CARBONO_toAsset-grassland_biomass_annual_v02_2023',
  assetId: ROOT + '/grassland_biomass_annual_v02_2023',
  region: region, scale: c.SCALE, maxPixels: 1e13,
  pyramidingPolicy: { '.default': 'mean' }
});