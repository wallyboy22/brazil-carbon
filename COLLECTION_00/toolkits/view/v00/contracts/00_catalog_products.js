/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de RESULTADOS (produtos)
 * ---------------------------------------------------------------------------
 * Camadas de RESULTADO do projeto (TODAS as versões) para o app de QA:
 *   FOREST     → AGBD previsto (v03–v08; v08 em sub-versões gedi/ifn)
 *   GRASSLAND  → biomassa / carbono / ANPP (v01/v02)
 * Assets reescritos do toolkit statistics/v00, com vis para visualização.
 ******************************************************************************/

var FOREST_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var GRASS_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND';

/** vis padrão de AGBD (t/ha). */
exports.AGBD_VIS = { min: 0, max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'] };
/** vis de incerteza (t/ha). */
exports.STD_VIS = { min: 0, max: 40,
  palette: ['#ffffb2', '#fd8d3c', '#d73027', '#7f0000'] };

exports.YEAR = 2023;

/** Forest — mosaico anual por versão (merge) + banda de predição/incerteza. */
exports.FOREST = [
  { id: 'v03', label: 'v03', asset: FOREST_BASE + '/V03/PREDICTIONS/agc_pred_v03_merged_2023',
    band: 'prediction_2023', stdBand: null, vis: exports.AGBD_VIS },
  { id: 'v04', label: 'v04', asset: FOREST_BASE + '/V04/PREDICTIONS/agc_pred_v04_merged_2023',
    band: 'prediction_2023', stdBand: null, vis: exports.AGBD_VIS },
  { id: 'v05', label: 'v05', asset: FOREST_BASE + '/V05/PREDICTIONS/agc_pred_v05_merged_2023',
    band: 'prediction_2023', stdBand: null, vis: exports.AGBD_VIS },
  { id: 'v06', label: 'v06', asset: FOREST_BASE + '/V06/PREDICTIONS/agc_pred_v06_merged_2023',
    band: 'prediction_2023', stdBand: null, vis: exports.AGBD_VIS },
  { id: 'v07', label: 'v07', asset: FOREST_BASE + '/V07/PREDICTIONS/agc_pred_v07_merged_2023',
    band: 'prediction_2023', stdBand: 'agbd_std_2023', vis: exports.AGBD_VIS },
  { id: 'v08_gedi', label: 'v08 (GEDI)',
    asset: FOREST_BASE + '/V08_GEDI/PREDICTIONS/agb_pred_v08_merged_2023',
    band: 'prediction_2023', stdBand: 'agbd_std_2023', vis: exports.AGBD_VIS },
  { id: 'v08_ifn', label: 'v08 (IFN)',
    asset: FOREST_BASE + '/V08_IFN/PREDICTIONS/agb_pred_v08_merged_2023',
    band: 'prediction_2023', stdBand: 'agbd_std_2023', vis: exports.AGBD_VIS }
];

/** Grassland — produtos anuais por versão. */
exports.GRASSLAND = [
  { id: 'v01_biomass', label: 'v01 biomassa',
    asset: GRASS_BASE + '/V01/BIOMASS/grassland_biomass_annual_v01_2023',
    band: 'biomass_annual', vis: { min: 0, max: 15,
      palette: ['#ffffe5', '#d9f0a3', '#78c679', '#31a354', '#006837'] } },
  { id: 'v01_carbon', label: 'v01 carbono',
    asset: GRASS_BASE + '/V01/CARBON/grassland_carbon_stock_v01_2023',
    band: 'carbon_stock_MgC_ha', vis: { min: 0, max: 8,
      palette: ['#fff7fb', '#d0d1e6', '#74a9cf', '#0570b0', '#034e7b'] } },
  { id: 'v01_anpp', label: 'v01 ANPP',
    asset: GRASS_BASE + '/V01/ANPP/grassland_anpp_annual_v01_2023',
    band: 'anpp_annual', vis: { min: 0, max: 15,
      palette: ['#f7fcf0', '#ccebc5', '#7bccc4', '#2b8cbe', '#084081'] } },
  { id: 'v02_biomass', label: 'v02 biomassa (bioma)',
    asset: GRASS_BASE + '/V02/BIOMASS/grassland_biomass_annual_v02_2023',
    band: 'biomass_annual', vis: { min: 0, max: 15,
      palette: ['#ffffe5', '#d9f0a3', '#78c679', '#31a354', '#006837'] } },
  { id: 'v02_carbon', label: 'v02 carbono (bioma)',
    asset: GRASS_BASE + '/V02/CARBON/grassland_carbon_stock_v02_2023',
    band: 'carbon_stock_MgC_ha', vis: { min: 0, max: 8,
      palette: ['#fff7fb', '#d0d1e6', '#74a9cf', '#0570b0', '#034e7b'] } },
  { id: 'v02_anpp', label: 'v02 ANPP (bioma)',
    asset: GRASS_BASE + '/V02/ANPP/grassland_anpp_annual_v02_2023',
    band: 'anpp_annual', vis: { min: 0, max: 15,
      palette: ['#f7fcf0', '#ccebc5', '#7bccc4', '#2b8cbe', '#084081'] } }
];
