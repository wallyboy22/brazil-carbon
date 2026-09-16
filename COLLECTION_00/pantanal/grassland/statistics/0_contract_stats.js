/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland · Estatísticas (contrato)
 * ---------------------------------------------------------------------------
 * Estatísticas dos produtos campestres v01 e v02 (2023) por classe LULC C11.
 * Molde herdado de `mapbiomas_solo/collection3/statistics` (mesmo esqueleto
 * do módulo florestal).
 *
 * Quatro classes de tabelas, 1 CSV por versão × região (2023):
 *   A) stats_grassland_<v>_<regiao>_2023.csv          → principal/ANUAL
 *        colunas: area_ha, biomassa_t, estoque_t   (biomassa + carbono na MESMA
 *        tabela, ambos em TONELADAS; biomassa = banda anual do asset BIOMASS).
 *   B) stats_grassland_<v>_biomassa_mensal_<regiao>_2023.csv → LARGA (12 mêses)
 *        colunas: area_ha, biomassa_m01_t … biomassa_m12_t (bandas mensais do
 *        asset grassland_biomass_monthly_*, kg MS/ha → t).
 *   C) stats_grassland_<v>_anpp_mensal_<regiao>_2023.csv  → LONGA (classe×mês)
 *        colunas: area_ha, classe, n0, n1, n2, marcador, mes, anpp_t
 *        (bandas do asset grassland_anpp_monthly_*, kg MS/ha/mês → t).
 *   D) stats_grassland_<v>_anpp_anual_<regiao>_2023.csv → 1 linha por classe:
 *        colunas: area_ha, classe, n0, n1, n2, marcador, anpp_t (fluxo anual).
 *
 * Unidade de saída padronizada: TONELADAS (t) — sem `Mg` em colunas/labels.
 * (1 Mg = 1 t; bandas kg/ha → t apenas no rótulo e na conversão kg→t.)
 *
 * Produtos v01 (asset em PANTANAL_GRASSLAND/V01) — mascarados p/ campos:
 *   BIOMASS/grassland_biomass_annual_v01_2023      banda biomass_annual   kg MS/ha
 *   BIOMASS/grassland_biomass_monthly_v01_2023     12 bandas biomass_<m>   kg MS/ha/mês
 *   ANPP/grassland_anpp_monthly_v01_2023           12 bandas anpp_<m>      kg MS/ha/mês
 *   ANPP/grassland_anpp_annual_v01_2023            banda anpp_annual      kg MS/ha/ano
 *   CARBON/grassland_carbon_stock_v01_2023         banda carbon_stock_MgC_ha  Mg C/ha
 *
 * Produtos v02 (asset em PANTANAL_GRASSLAND/V02) — TODO o bioma (full-biome):
 *   · mesmas bandas; a estatística cobre todas as classes LULC do
 *     bioma, não só {11,12,50} (decisão v02 — ver reflexao_v02.md).
 ******************************************************************************/

exports.ECO = 'pantanal';
exports.SCOPE = 'grassland';
exports.YEAR = 2023;
exports.SCALE = 30;

// ---- Produto anual com capitalização: kg → t (÷1000); Mg → 1. ----------------
// toTFactor converte a banda para t/ha antes de multiplicar pela área:
// kg → t (÷1000); Mg → t (÷1).
function anualP(version, id, name, asset, band, unit, toTFactor) {
  return { version: version, id: id, name: name, asset: asset, band: band,
    unit: unit, toTFactor: toTFactor === undefined ? 1 / 1000 : toTFactor };
}

var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND';
var MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function v1(id, name, asset, band, unit, toTFactor) {
  return anualP('v01', id, name, BASE + '/V01/' + asset, band, unit, toTFactor);
}
function v2(id, name, asset, band, unit, toTFactor) {
  return anualP('v02', id, name, BASE + '/V02/' + asset, band, unit, toTFactor);
}

// ---- Produtos ANUAIS (tabela principal A + ANPP anual D) --------------------
exports.PRODUCTS = [
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

// ---- Produto MENSAL (biomassa — larga; ANPP — longa) -------------------------
// Bandas: grassland_biomass_monthly_<v>_2023 → biomass_1..12;
//         grassland_anpp_monthly_<v>_2023    → anpp_1..12.
function mensalP(version, id, name, folder, prefix, bandPrefix, unit) {
  return { version: version, id: id, name: name,
    asset: BASE + '/V' + version.toUpperCase() + '/' + folder + '/' +
      prefix + '_' + version + '_2023',
    bandPrefix: bandPrefix, unit: unit, meses: MESES };
}
exports.MONTHLY = [
  mensalP('v01', 'biomass', 'Biomassa mensal (MS)',
    'BIOMASS', 'grassland_biomass_monthly', 'biomass_', 't'),
  mensalP('v01', 'anpp', 'ANPP mensal',
    'ANPP', 'grassland_anpp_monthly', 'anpp_', 't'),
  mensalP('v02', 'biomass', 'Biomassa mensal (MS) — v02 bioma',
    'BIOMASS', 'grassland_biomass_monthly', 'biomass_', 't'),
  mensalP('v02', 'anpp', 'ANPP mensal — v02 bioma',
    'ANPP', 'grassland_anpp_monthly', 'anpp_', 't')
];

// ---- Território -------------------------------------------------------------
// Área de análise = bioma; UF opcional (UF_LIST = ['MS','MT']). Vazio → bioma.
exports.BIOME_FC = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.BIOME_PROP = 'Bioma';
exports.BIOME_NAME = 'Pantanal';
exports.UF_LIST = [];
exports.UF_ASSET = 'projects/mapbiomas-brazil/auxiliar/limites/UF_IBGE_2022';
exports.UF_PROP = 'SIGLA';
exports.UF_NAME = 'UF';

// ---- LULC Coleção 11 ---------------------------------------------------------
// Asset oficial único (mesmo de forest/statistics e de module_lulc_legends.js).
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.LULC_BAND = 'classification_' + exports.YEAR;

// ---- Saída ---------------------------------------------------------------------
exports.DRIVE_FOLDER = 'MAPBIOMAS_CARBONO_ESTATISTICAS';
exports.PREFIX = 'stats_grassland';
