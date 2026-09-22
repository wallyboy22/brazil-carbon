/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Merge (OPCIONAL)
 * ---------------------------------------------------------------------------
 * [OPCIONAL no momento] A predição D3 (4_0_spatial_prediction) já é GLOBAL e
 * fatiada na grade comum → a `PREDICTIONS/COL` já é um mosaico sem costura.
 * Este passo só consolida a COL num asset único (`agb_pred_v08_merged_<ano>`);
 * pode ser PULADO (o QA 6_0_quality usa a COL como fallback).
 *
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

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 5_0_merge (opcional)');
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
    region: region, crs: c.CRS, crsTransform: c.CRS_TRANSFORM, maxPixels: 1e13,
    pyramidingPolicy: { '.default': 'mean' } });
});