/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · engine/module_regions
 * ---------------------------------------------------------------------------
 * Território do app: lista valores distintos de um nível (bioma/uf/região/
 * brasil) e devolve a FEATURE COLLECTION (para máscara) ou os bounds.
 * A máscara usa a FC com `ee.Image().paint(fc).eq(0)` (nunca `clip`).
 ******************************************************************************/
var TER = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_territories.js');

exports.levels = TER.LEVELS;
exports.order = TER.LEVEL_ORDER;

/** Nomes das regiões de um nível (assíncrono via evaluate quando 'fc'). */
exports.regionNames = function (levelId, callback) {
  var lv = TER.LEVELS[levelId];
  if (!lv || lv.kind === 'all') { callback(['Brasil']); return; }
  if (lv.kind === 'custom') {
    callback(lv.regions.map(function (r) { return r.name; }));
    return;
  }
  ee.FeatureCollection(lv.asset).aggregate_array(lv.prop).distinct().sort()
    .evaluate(function (names) { callback(names || []); });
};

/** FeatureCollection do território (vazio = nível inteiro). */
exports.featuresFor = function (levelId, values) {
  var lv = TER.LEVELS[levelId];
  if (!lv || lv.kind === 'all' || !values || !values.length) {
    return ee.FeatureCollection(TER.LEVELS.bioma.asset);
  }
  if (lv.kind === 'custom') {
    var fcs = values.map(function (v) {
      var r = lv.regions.filter(function (x) { return x.name === v; })[0];
      return ee.FeatureCollection(r.asset);
    });
    return ee.FeatureCollection(fcs).flatten();
  }
  return ee.FeatureCollection(lv.asset)
    .filter(ee.Filter.inList(lv.prop, values));
};

/** Bounds do território (uso NÃO-máscara: centerObject/region). */
exports.boundsFor = function (levelId, values) {
  return exports.featuresFor(levelId, values).geometry().bounds();
};
