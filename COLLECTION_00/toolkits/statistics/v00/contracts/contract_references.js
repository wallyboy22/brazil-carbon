/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Contrato de REFERÊNCIAS
 * ---------------------------------------------------------------------------
 * Configuração das estatísticas dos mapas de REFERÊNCIA (benchmarks + QCN) por
 * classe LULC C11, para TODOS os biomas do Brasil. O catálogo dos 20 refs vem
 * de 00_catalog_references.js; limites/legendas dos catálogos centrais.
 *
 * Consumido por: run/run_references.js → engine.runReferences(contract, opts).
 * Saída: stats_references_<ref_id>_2023.csv (Drive MAPBIOMAS_CARBONO_ESTATISTICAS).
 ******************************************************************************/
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_limits.js');
var REF = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_references.js');

exports.ECO = 'brazil';
exports.SCOPE = 'references';
exports.YEAR = 2023;       // ano do estrato LULC (classificação)

// ---- Magnitudes / fator de carbono ------------------------------------------
exports.CARBON_FRACTION = REF.CARBON_FRACTION;
exports.MAGNITUDES = REF.MAGNITUDES;
exports.columnSuffix = REF.columnSuffix;

// ---- Biomas (todos) ----------------------------------------------------------
exports.BIOMES = LIM.BIOMES;

// ---- Referências (20) --------------------------------------------------------
exports.REFERENCES = REF.REFERENCES;

// ---- Território --------------------------------------------------------------
// Área de análise = TODOS os biomas (1 CSV por ref; coluna `territorio`).
// Nota: as referências usam o paint por `CD_BIOMA` (código 1..6) e o rótulo de
// bioma cai para `NM_BIOMA` quando `Bioma` estiver ausente.
exports.territory = {
  biomeFc: LIM.BIOMES_FC,
  biomeCodeProp: LIM.BIOME_CODE_PROP_ALT,   // CD_BIOMA (compat. references)
  biomeNameProp: LIM.BIOME_NAME_PROP,       // Bioma
  biomeFallbackProp: LIM.BIOME_FALLBACK_PROP, // NM_BIOMA
  ufFc: LIM.UFS_FC,
  ufCodeProp: LIM.UF_CODE_PROP,             // CD_UF
  ufSiglaProp: LIM.UF_SIGLA_PROP,           // SIGLA_UF
  ufNameProp: LIM.UF_NAME_PROP,             // NM_UF
  ufEnabled: true                           // references sempre pinta UFs
};

// ---- Saída -------------------------------------------------------------------
exports.DRIVE_FOLDER = 'MAPBIOMAS_CARBONO_ESTATISTICAS';
exports.PREFIX = 'stats_references';
