/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de RESULTADOS (produtos)
 * ---------------------------------------------------------------------------
 * Camadas de RESULTADO do projeto (TODAS as versões) para o app de QA:
 *   FOREST     → AGBD previsto (v03–v08; v08 em sub-versões gedi/ifn)
 *   GRASSLAND  → biomassa / carbono / ANPP (v01/v02)
 *
 * Forest usa a ImageCollection `PREDICTIONS/COL` (mosaico por ano) — uniforme
 * para todas as versões (o merge só existe em v05/v07). Grassland = imagem
 * anual única.
 ******************************************************************************/

var FOREST_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var GRASS_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND';

exports.YEAR = 2023;

/** vis padrão de AGBD (t/ha). */
exports.AGBD_VIS = { min: 0, max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'] };
/** vis de incerteza (t/ha). */
exports.STD_VIS = { min: 0, max: 40,
  palette: ['#ffffb2', '#fd8d3c', '#d73027', '#7f0000'] };

/** Forest — ImageCollection COL por versão (mosaico do ano). */
function forest(id, label, root) {
  return { id: id, label: label, col: root + '/PREDICTIONS/COL',
    band: 'prediction_2023', stdBand: 'agbd_std_2023', year: 2023,
    unit: 't/ha', vis: exports.AGBD_VIS };
}

exports.FOREST = [
  forest('v03', 'v03', FOREST_BASE + '/V03'),
  forest('v04', 'v04', FOREST_BASE + '/V04'),
  forest('v05', 'v05', FOREST_BASE + '/V05'),
  forest('v06', 'v06', FOREST_BASE + '/V06'),
  forest('v07', 'v07', FOREST_BASE + '/V07'),
  forest('v08_gedi', 'v08 (GEDI)', FOREST_BASE + '/V08_GEDI'),
  forest('v08_ifn', 'v08 (IFN)', FOREST_BASE + '/V08_IFN')
];

/** Grassland — produtos anuais existentes (imagem única).
 *  NOTA: ANPP e v02 ainda não foram exportados → fora do catálogo por ora. */
exports.GRASSLAND = [
  { id: 'v01_biomass', label: 'v01 biomassa',
    asset: GRASS_BASE + '/V01/BIOMASS/grassland_biomass_annual_v01_2023',
    band: 'biomass_annual', unit: 't/ha',
    vis: { min: 0, max: 15,
      palette: ['#ffffe5', '#d9f0a3', '#78c679', '#31a354', '#006837'] } },
  { id: 'v01_carbon', label: 'v01 carbono',
    asset: GRASS_BASE + '/V01/CARBON/grassland_carbon_stock_v01_2023',
    band: 'carbon_stock_MgC_ha', unit: 't C/ha',
    vis: { min: 0, max: 8,
      palette: ['#fff7fb', '#d0d1e6', '#74a9cf', '#0570b0', '#034e7b'] } }
];
