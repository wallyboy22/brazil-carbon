/******************************************************************************
 * Pantanal Grassland v02 · ANPP Monteith mensal/anual — TODO o bioma
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');
var ROOT = c.ASSET_ROOT + '/ANPP';
var months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var monthly = ee.Image.cat(months.map(function (month) {
  return src.monthlyAnpp(c.YEAR, month);
}));
var annual = monthly.reduce(ee.Reducer.sum()).rename('anpp_annual').toFloat();
var region = src.getBiome().geometry();

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 4_anpp');
print('[ECA] mensal Pampa (provisório) · modulate CWD:',
  c.ECA_MODULATE_CWD, '· QC fPAR:', c.USE_QC, '· domínio: bioma inteiro (full)');
print('[UNITS] Mensal/anual: kg MS/ha');
src.ensureFolder(ROOT);
Export.image.toAsset({
  image: monthly,
  description: 'WS_CARBONO_toAsset-grassland_anpp_monthly_v02_2023',
  assetId: ROOT + '/grassland_anpp_monthly_v02_2023',
  region: region, scale: c.SCALE, maxPixels: 1e13,
  pyramidingPolicy: { '.default': 'mean' }
});
Export.image.toAsset({
  image: annual,
  description: 'WS_CARBONO_toAsset-grassland_anpp_annual_v02_2023',
  assetId: ROOT + '/grassland_anpp_annual_v02_2023',
  region: region, scale: c.SCALE, maxPixels: 1e13,
  pyramidingPolicy: { '.default': 'mean' }
});