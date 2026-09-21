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
var VIS = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_vis.js');

/** Pastagem — biomassa (Mg/ha); banda `biomass_<ano>`. Rampa compartilhada. */
exports.PASTURE = {
  asset: PASTURE_ROOT,
  band: function (y) { return 'biomass_' + y; },
  unit: 'Mg/ha',
  vis: VIS.AREA
};

/** Solo — carbono orgânico (Mg C/ha); banda `carbon_<ano>`. Rampa compartilhada. */
exports.SOIL = {
  asset: SOIL_ROOT,
  band: function (y) { return 'carbon_' + y; },
  unit: 'Mg C/ha',
  vis: VIS.AREA
};
