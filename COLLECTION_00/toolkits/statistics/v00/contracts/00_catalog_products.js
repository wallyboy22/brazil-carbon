/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Catálogo de PRODUTOS
 * ---------------------------------------------------------------------------
 * Fonte única dos produtos finais (mapas/predições) cujas estatísticas são
 * geradas pelo motor: versões florestais (AGC) e produtos campestres
 * (biomassa/ANPP/carbono), todos 2023.
 *
 *   FOREST   → mosaicos anuais por versão (V03–V07 + V08_GEDI/V08_IFN),
 *              banda de predição + banda de incerteza de ensemble quando houver.
 *   GRASSLAND_PRODUCTS → produtos ANUAIS (tabela principal).
 *   GRASSLAND_MONTHLY  → produtos MENSAIS (bandas <prefix>_1..12).
 ******************************************************************************/

// ---- Florestal (Pantanal) ----------------------------------------------------
var FOREST_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';

// stdBand: null para versões sem incerteza de ensemble (incerteza = 0).
exports.FOREST = [
  { id: 'v03', band: 'prediction_2023', stdBand: null,
    mosaic: FOREST_BASE + '/V03/PREDICTIONS/agc_pred_v03_merged_2023' },
  { id: 'v04', band: 'prediction_2023', stdBand: null,
    mosaic: FOREST_BASE + '/V04/PREDICTIONS/agc_pred_v04_merged_2023' },
  { id: 'v05', band: 'prediction_2023', stdBand: null,
    mosaic: FOREST_BASE + '/V05/PREDICTIONS/agc_pred_v05_merged_2023' },
  { id: 'v06', band: 'prediction_2023', stdBand: null,
    mosaic: FOREST_BASE + '/V06/PREDICTIONS/agc_pred_v06_merged_2023' },
  { id: 'v07', band: 'prediction_2023', stdBand: 'agbd_std_2023',
    mosaic: FOREST_BASE + '/V07/PREDICTIONS/agc_pred_v07_merged_2023' },
  // v08 tem sub-versões por FONTE de amostra (domínio BAP): GEDI e IFN.
  { id: 'v08_gedi', band: 'prediction_2023', stdBand: 'agbd_std_2023',
    mosaic: FOREST_BASE + '/V08_GEDI/PREDICTIONS/agc_pred_v08_merged_2023' },
  { id: 'v08_ifn', band: 'prediction_2023', stdBand: 'agbd_std_2023',
    mosaic: FOREST_BASE + '/V08_IFN/PREDICTIONS/agc_pred_v08_merged_2023' }
];

// ---- Campestre (Pantanal) ----------------------------------------------------
var GRASS_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND';
var MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// toTFactor converte a banda para t/ha antes de multiplicar pela área:
// kg → t (÷1000); Mg → t (÷1).
function anualP(version, id, name, asset, band, unit, toTFactor) {
  return { version: version, id: id, name: name, asset: asset, band: band,
    unit: unit, toTFactor: toTFactor === undefined ? 1 / 1000 : toTFactor };
}
function v1(id, name, asset, band, unit, toTFactor) {
  return anualP('v01', id, name, GRASS_BASE + '/V01/' + asset, band, unit, toTFactor);
}
function v2(id, name, asset, band, unit, toTFactor) {
  return anualP('v02', id, name, GRASS_BASE + '/V02/' + asset, band, unit, toTFactor);
}
function mensalP(version, id, name, folder, prefix, bandPrefix, unit) {
  return { version: version, id: id, name: name,
    asset: GRASS_BASE + '/V' + version.toUpperCase() + '/' + folder + '/' +
      prefix + '_' + version + '_2023',
    bandPrefix: bandPrefix, unit: unit, meses: MESES };
}

exports.MESES = MESES;

exports.GRASSLAND_PRODUCTS = [
  v1('biomass', 'Biomassa seca (MS) anual',
    'BIOMASS/grassland_biomass_annual_v01_2023', 'biomass_annual', 't'),
  v1('carbon', 'Carbono (estoque)',
    'CARBON/grassland_carbon_stock_v01_2023', 'carbon_stock_MgC_ha', 't', 1),
  v1('anpp', 'ANPP anual',
    'ANPP/grassland_anpp_annual_v01_2023', 'anpp_annual', 't'),
  v2('biomass', 'Biomassa seca (MS) anual — v02 bioma',
    'BIOMASS/grassland_biomass_annual_v02_2023', 'biomass_annual', 't'),
  v2('carbon', 'Carbono (estoque) — v02 bioma',
    'CARBON/grassland_carbon_stock_v02_2023', 'carbon_stock_MgC_ha', 't', 1),
  v2('anpp', 'ANPP anual — v02 bioma',
    'ANPP/grassland_anpp_annual_v02_2023', 'anpp_annual', 't')
];

exports.GRASSLAND_MONTHLY = [
  mensalP('v01', 'biomass_mensal', 'Biomassa mensal (MS)',
    'BIOMASS', 'grassland_biomass_monthly', 'biomass_', 't'),
  mensalP('v01', 'anpp_mensal', 'ANPP mensal',
    'ANPP', 'grassland_anpp_monthly', 'anpp_', 't'),
  mensalP('v02', 'biomass_mensal', 'Biomassa mensal (MS) — v02 bioma',
    'BIOMASS', 'grassland_biomass_monthly', 'biomass_', 't'),
  mensalP('v02', 'anpp_mensal', 'ANPP mensal — v02 bioma',
    'ANPP', 'grassland_anpp_monthly', 'anpp_', 't')
];

/** Versões campestres disponíveis (derivadas dos produtos). */
exports.GRASSLAND_VERSIONS = ['v01', 'v02'];

/** Versões florestais disponíveis (derivadas do catálogo). */
exports.FOREST_VERSIONS = exports.FOREST.map(function (v) { return v.id; });
