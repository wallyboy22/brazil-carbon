/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · engine/module_regions
 * ---------------------------------------------------------------------------
 * Território do app (estilo toolkit de referência): lista valores distintos de
 * um nível (bioma/uf/região/brasil) e devolve a geometria para filtro/zoom.
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

/** Geometria da união dos valores selecionados (vazio = nível inteiro). */
exports.geometryFor = function (levelId, values) {
  var lv = TER.LEVELS[levelId];
  var all = ee.FeatureCollection(TER.LEVELS.bioma.asset).geometry();
  if (!lv || lv.kind === 'all' || !values || !values.length) return all;
  if (lv.kind === 'custom') {
    var geoms = values.map(function (v) {
      var r = lv.regions.filter(function (x) { return x.name === v; })[0];
      return ee.FeatureCollection(r.asset).geometry();
    });
    return ee.FeatureCollection(geoms.map(function (g) { return ee.Feature(g); }))
      .geometry();
  }
  return ee.FeatureCollection(lv.asset)
    .filter(ee.Filter.inList(lv.prop, values)).geometry();
};
