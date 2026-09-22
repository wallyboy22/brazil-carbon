/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_hand.js
 * ---------------------------------------------------------------------------
 * HAND (altura relativa à drenagem): contínuo + classes geomorfológicas.
 * Política since_vNN: bloco desde v01 — registrado em _metadata.js
 * ('since_v01'). Módulo independente: só usa `ee`.
 ******************************************************************************/

/** HAND contínuo (m) + 4 classes geomorfológicas (1-4) sobre o AOI. */
exports.buildHand = function (aoi) {
  var handCont = ee.ImageCollection('users/gena/global-hand/hand-100')
    .mosaic().rename('HAND_m').toFloat();
  var handClass = ee.Image(0)
    .where(handCont.lt(5), 1)
    .where(handCont.gte(5).and(handCont.lt(15)), 2)
    .where(handCont.gte(15).and(handCont.lt(45)), 3)
    .where(handCont.gte(45), 4)
    .rename('geomorph_class');
  return handCont.addBands(handClass);
};