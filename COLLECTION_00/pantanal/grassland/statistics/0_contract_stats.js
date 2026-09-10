/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland · Estatísticas (contrato)
 * ---------------------------------------------------------------------------
 * Estatísticas dos produtos campestres v01 (2023) por classe LULC C11.
 * Molde herdado de `mapbiomas_solo/collection3/statistics` (mesmo esqueleto
 * do módulo florestal).
 *
 * Produtos v01 (asset em PANTANAL_GRASSLAND/V01):
 *   BIOMASS/grassland_biomass_annual_v01_2023   banda biomass_annual   kg MS/ha
 *   ANPP/grassland_anpp_annual_v01_2023         banda anpp_annual      kg MS/ha/ano
 *   CARBON/grassland_carbon_stock_v01_2023      banda carbon_stock_MgC_ha  Mg C/ha
 ******************************************************************************/

exports.ECO = 'pantanal';
exports.SCOPE = 'grassland';
exports.YEAR = 2023;
exports.SCALE = 30;

// ---- Produtos contemplados (v01, 2023) --------------------------------------
// toMgFactor converte a banda para Mg/ha antes de multiplicar pela área:
// kg → Mg (÷1000); Mg → 1.
exports.PRODUCTS = [
  {
    id: 'biomass',
    name: 'Biomassa seca (MS)',
    asset: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND/V01/BIOMASS/grassland_biomass_annual_v01_2023',
    band: 'biomass_annual',
    unit: 'Mg MS',
    toMgFactor: 1 / 1000
  },
  {
    id: 'anpp',
    name: 'ANPP',
    asset: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND/V01/ANPP/grassland_anpp_annual_v01_2023',
    band: 'anpp_annual',
    unit: 'Mg MS/ano',
    toMgFactor: 1 / 1000
  },
  {
    id: 'carbon',
    name: 'Carbono',
    asset: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND/V01/CARBON/grassland_carbon_stock_v01_2023',
    band: 'carbon_stock_MgC_ha',
    unit: 'Mg C',
    toMgFactor: 1
  }
];

// ---- Território -------------------------------------------------------------
// Área de análise = bioma; UF opcional (UF_LIST = ['MS','MT']). Vazio → bioma.
exports.BIOME_FC = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.BIOME_PROP = 'Bioma';
exports.BIOME_NAME = 'Pantanal';
exports.UF_LIST = [];
/** @todo preencher quando UF_LIST != [] */
exports.UF_ASSET = 'projects/mapbiomas-brazil/auxiliar/limites/UF_IBGE_2022';
exports.UF_PROP = 'SIGLA';
exports.UF_NAME = 'UF';

// ---- LULC Coleção 11 --------------------------------------------------------
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.LULC_BAND = 'classification_' + exports.YEAR;

// ---- Saída ------------------------------------------------------------------
exports.DRIVE_FOLDER = 'MAPBIOMAS_CARBONO_ESTATISTICAS';
exports.PREFIX = 'stats_grassland';