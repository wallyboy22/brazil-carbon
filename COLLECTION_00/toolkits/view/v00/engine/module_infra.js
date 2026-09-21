/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · engine/module_infra
 * ---------------------------------------------------------------------------
 * Infra mínima: existência de asset.
 * Usa `ee.data.getAsset` DIRETO (com cache): não depende de listar a pasta-pai,
 * então funciona também para assets públicos (evita o falso-negativo do
 * `listAssets`, que exige acesso à listagem da pasta).
 ******************************************************************************/
var _cache = {};

/** true se o asset existe (e é acessível). */
exports.assetExists = function (assetId) {
  if (!assetId) return false;
  if (Object.prototype.hasOwnProperty.call(_cache, assetId)) {
    return _cache[assetId];
  }
  var ok;
  try { ee.data.getAsset(assetId); ok = true; }
  catch (e) { ok = false; }
  _cache[assetId] = ok;
  return ok;
};

/** Filtra camadas cujo asset (col || asset) existe. */
exports.filterExisting = function (layers) {
  return (layers || []).filter(function (l) {
    return exports.assetExists(l.col || l.asset);
  });
};
