/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Merge
 * ---------------------------------------------------------------------------
 * O mosaico anual consolida as imagens da ImageCollection PREDICTIONS/COL
 * (filtrada pela propriedade 'year') e é exportado como irmão da COL, com
 * nome simples, dentro de PREDICTIONS/. Preserva as duas bandas: predição
 * (mediana do ensemble) e incerteza (stdDev dos membros).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var root = c.ASSET_ROOT + '/PREDICTIONS';
var col = ee.ImageCollection(root + '/COL');
var region = src.getDomain().geometry();

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 5_merge');
c.YEARS.forEach(function (year) {
  var image = col.filter(ee.Filter.eq('year', year))
    .mosaic()
    .rename(['prediction_' + year, 'agbd_std_' + year])
    .toFloat();
  var name = 'agb_pred_v08_merged_' + year;
  print('[TASK]', root + '/' + name);
  Export.image.toAsset({ image: image,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: root + '/' + name,
    region: region, scale: c.SCALE, maxPixels: 1e13,
    pyramidingPolicy: { '.default': 'mean' } });
});