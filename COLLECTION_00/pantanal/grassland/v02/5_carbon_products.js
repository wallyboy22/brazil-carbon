/******************************************************************************
 * Pantanal Grassland v02 · Estoque de carbono derivado — TODO o bioma
 * ---------------------------------------------------------------------------
 * carbon_stock = biomassa_anual × CARBON_FRACTION × (1 + ROOT_SHOOT_K) / 1000
 *   · ROOT_SHOOT_K = 0 → parte aérea (AGC, padrão).
 *   · Banda de elegibilidade (STABILITY_YEARS, fase 4): pixel estável nas
 *     classes campestres durante os N anos → elegível p/ carbono.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');
var ROOT = c.ASSET_ROOT + '/CARBON';
var biomass = ee.Image(
  c.ASSET_ROOT + '/BIOMASS/grassland_biomass_annual_v02_2023');
var carbon = biomass.multiply(c.CARBON_FRACTION)
  .multiply(1 + c.ROOT_SHOOT_K).divide(1000)
  .rename('carbon_stock_MgC_ha').toFloat();

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 5_carbon_products');
print('[WARNING] Fração de carbono provisória:', c.CARBON_FRACTION,
  '· raiz:parte aérea (AGC):', c.ROOT_SHOOT_K);
var out = carbon;
if (c.STABILITY_YEARS.length) {
  var stability = null;
  c.STABILITY_YEARS.forEach(function (y) {
    var ok = src.getGrasslandMask(y);
    stability = stability === null ? ok : stability.and(ok);
  });
  out = carbon.addBands(stability.rename('elig_carbon').toUint8());
  print('[ELEGIBILIDADE] banda elig_carbon com estabilidade',
    c.STABILITY_YEARS.join('/'));
}
src.ensureFolder(ROOT);
Export.image.toAsset({
  image: out,
  description: 'WS_CARBONO_toAsset-grassland_carbon_stock_v02_2023',
  assetId: ROOT + '/grassland_carbon_stock_v02_2023',
  region: src.getBiome().geometry(), scale: c.SCALE, maxPixels: 1e13,
  pyramidingPolicy: { '.default': 'mean' }
});