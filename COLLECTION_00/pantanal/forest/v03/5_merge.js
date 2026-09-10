/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal v03 · Merge das predições
 * ---------------------------------------------------------------------------
 * O mosaico anual consolida as imagens da ImageCollection PREDICTIONS/COL
 * (filtrada pela propriedade 'year') e é exportado como irmão da COL, com
 * nome simples, dentro de PREDICTIONS/.
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v03/0_covariate_source.js');
var ASSET_PREDICTIONS = src.ASSET_ROOT + '/PREDICTIONS';
var YEARS = [2019, 2020, 2021, 2022, 2023];
var col = ee.ImageCollection(ASSET_PREDICTIONS + '/COL');
var region = ee.FeatureCollection(src.BIOME_FC)
  .filter(ee.Filter.eq(src.BIOME_PROP, src.BIOME_NAME)).geometry();

function exportYear(year) {
  var mosaic = col.filter(ee.Filter.eq('year', year)).mosaic().toFloat()
    .rename('prediction_' + year);
  var name = 'agc_pred_v03_merged_' + year;
  print('[TASK] Merge:', year);
  Export.image.toAsset({
    image: mosaic,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: ASSET_PREDICTIONS + '/' + name,
    region: region,
    scale: src.SCALE,
    maxPixels: 1e13,
    pyramidingPolicy: { '.default': 'mean' }
  });
}

print('MAPBIOMAS-CARBONO · Pantanal v03 · 5_merge');
col.aggregate_array('year').distinct().evaluate(function (years) {
  print('[PREDICTIONS · anos na COL]', years);
  YEARS.forEach(function (year) {
    if (years.indexOf(year) > -1) exportYear(year);
  });
});