/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo MapBiomas (auxiliares)
 * ---------------------------------------------------------------------------
 * Produtos públicos do MapBiomas usados como camadas AUXILIARES no app:
 *   · Pastagem — biomassa anual (Coleção 11 LULC)
 *   · Solo     — carbono orgânico (Coleção 3 Soil)
 * Ranges (Brasil, 2023): pastagem 0,9–31,4 (p50 13,9) → vis 0–30;
 *                        solo 0–259 (p99 94,5) → vis 0–100.
 ******************************************************************************/
var PASTURE_ROOT =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_pasture_biomass_v1';
var SOIL_ROOT =
  'projects/mapbiomas-public/assets/brazil/soil/collection3/' +
  'mapbiomas_brazil_collection3_soil_carbon_v1';

/** Pastagem — biomassa (Mg/ha); banda `biomass_<ano>`. */
exports.PASTURE = {
  asset: PASTURE_ROOT,
  band: function (y) { return 'biomass_' + y; },
  unit: 'Mg/ha',
  vis: { min: 0, max: 30,
    palette: ['#ffffe5', '#d9f0a3', '#78c679', '#31a354', '#006837'] }
};

/** Solo — carbono orgânico (Mg C/ha); banda `carbon_<ano>`. */
exports.SOIL = {
  asset: SOIL_ROOT,
  band: function (y) { return 'carbon_' + y; },
  unit: 'Mg C/ha',
  vis: { min: 0, max: 100,
    palette: ['#f7f4e9', '#e6d3a3', '#c9a86a', '#9c6b3f', '#5c3b1e'] }
};
