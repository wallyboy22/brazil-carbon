/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland · Estatísticas (contrato)
 * ---------------------------------------------------------------------------
 * Estatísticas dos produtos campestres v01 e v02 (2023) por classe LULC C11.
 * Molde herdado de `mapbiomas_solo/collection3/statistics` (mesmo esqueleto
 * do módulo florestal).
 *
 * Produtos v01 (asset em PANTANAL_GRASSLAND/V01) — mascarados p/ campos:
 *   BIOMASS/grassland_biomass_annual_v01_2023   banda biomass_annual   kg MS/ha
 *   ANPP/grassland_anpp_annual_v01_2023         banda anpp_annual      kg MS/ha/ano
 *   CARBON/grassland_carbon_stock_v01_2023      banda carbon_stock_MgC_ha  Mg C/ha
 *
 * Produtos v02 (asset em PANTANAL_GRASSLAND/V02) — TODO o bioma (full-biome):
 *   · mesmos nomes de banda; a estatística cobre todas as classes LULC do
 *     bioma, não só {11,12,50} (decisão v02 — ver reflexao_v02.md).
 ******************************************************************************/

exports.ECO = 'pantanal';
exports.SCOPE = 'grassland';
exports.YEAR = 2023;
exports.SCALE = 30;

function prod(version, id, name, asset, band, unit, toMgFactor) {
  return { version: version, id: id, name: name, asset: asset, band: band,
    unit: unit, toMgFactor: toMgFactor };
}

var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND';

function v1(id, name, asset, band, unit) {
  return prod('v01', id, name, BASE + '/V01/' + asset, band, unit, 1 / 1000);
}
function v2(id, name, asset, band, unit, toMgFactor) {
  return prod('v02', id, name, BASE + '/V02/' + asset, band, unit,
    toMgFactor === undefined ? 1 / 1000 : toMgFactor);
}

// ---- Produtos contemplados (v01 e v02, 2023) --------------------------------
// toMgFactor converte a banda para Mg/ha antes de multiplicar pela área:
// kg → Mg (÷1000); Mg → 1.
exports.PRODUCTS = [
  v1('biomass', 'Biomassa seca (MS)',
    'BIOMASS/grassland_biomass_annual_v01_2023', 'biomass_annual', 'Mg MS'),
  v1('anpp', 'ANPP',
    'ANPP/grassland_anpp_annual_v01_2023', 'anpp_annual', 'Mg MS/ano'),
  v1('carbon', 'Carbono',
    'CARBON/grassland_carbon_stock_v01_2023', 'carbon_stock_MgC_ha', 'Mg C', 1),
  v2('biomass', 'Biomassa seca (MS) — v02 bioma',
    'BIOMASS/grassland_biomass_annual_v02_2023', 'biomass_annual', 'Mg MS'),
  v2('anpp', 'ANPP — v02 bioma',
    'ANPP/grassland_anpp_annual_v02_2023', 'anpp_annual', 'Mg MS/ano'),
  v2('carbon', 'Carbono — v02 bioma',
    'CARBON/grassland_carbon_stock_v02_2023', 'carbon_stock_MgC_ha', 'Mg C', 1)
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