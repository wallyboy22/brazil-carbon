/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_lulc.js
 * ---------------------------------------------------------------------------
 * MapBiomas Coleção 11 — classe de uso e cobertura do ano.
 * Política since_v01 — registrado em _metadata.js. Módulo independente.
 ******************************************************************************/

exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';

/** Banda `mapbiomas_lulc` (Uint8/Int16 → Float p/ consistência do stack). */
exports.buildLulc = function (aoi, yearUsed) {
  return ee.Image(exports.LULC_ASSET)
    .select('classification_' + yearUsed)
    .rename('mapbiomas_lulc')
    .toFloat();
};