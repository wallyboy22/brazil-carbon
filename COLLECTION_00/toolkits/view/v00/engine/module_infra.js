/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · engine/module_infra
 * ---------------------------------------------------------------------------
 * Infra mínima: existência de asset (listAssets na pasta-pai).
 ******************************************************************************/

exports.assetExists = function (assetId) {
  if (!assetId) return false;
  var parts = assetId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === assetId; });
  } catch (e) {
    return false;
  }
};
