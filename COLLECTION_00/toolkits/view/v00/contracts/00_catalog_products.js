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
var CERRADO_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/Cerrado/mapa_biomassa_vbeta1';
var VIS = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_vis.js');

exports.YEAR = 2023;

/** vis padrão de AGBD (t/ha) — MESMA rampa p/ toda quantidade por área. */
exports.AGBD_VIS = VIS.AREA;
/** vis de AGBD do Cerrado (t/ha) — mesma rampa compartilhada. */
exports.CERRADO_VIS = VIS.AREA;
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
    band: 'biomass_annual', unit: 't/ha', vis: VIS.AREA },
  { id: 'v01_carbon', label: 'v01 carbono',
    asset: GRASS_BASE + '/V01/CARBON/grassland_carbon_stock_v01_2023',
    band: 'carbon_stock_MgC_ha', unit: 't C/ha', vis: VIS.AREA }
];

/** Cerrado Florestal — AGB 2020 (vbeta1). Imagem única, banda `b1`.
 *  `mosaico_final_agb_2020_vbeta1_1`     → AGB (b2 = constante, ignorada);
 *  `mosaico_final_agb_2020_mask_vbeta1_1`→ AGB mascarada às classes nativas.
 *  Ver `COLLECTION_00/docs/Resultado - Cerrado Florestal (assets).md`. */
exports.CERRADO = [
  { id: 'vbeta1', label: 'vbeta1 (2020)', unit: 't/ha', year: 2020,
    asset: CERRADO_BASE + '/mosaico_final_agb_2020_vbeta1_1', band: 'b1',
    vis: exports.CERRADO_VIS },
  { id: 'vbeta1_nativo', label: 'vbeta1 nativo (2020)', unit: 't/ha', year: 2020,
    asset: CERRADO_BASE + '/mosaico_final_agb_2020_mask_vbeta1_1', band: 'b1',
    vis: exports.CERRADO_VIS }
];
