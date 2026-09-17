/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Contrato do BIOMA PANTANAL
 * ---------------------------------------------------------------------------
 * Reúne os ACORDOS do bioma Pantanal comuns à floresta e aos campos e resolve
 * as duas abrangências em contratos planos consumidos pelo motor:
 *
 *   PANTANAL.FOREST     → engine.runForest(PANTANAL.FOREST[, versionId])
 *   PANTANAL.GRASSLAND  → engine.runGrassland(PANTANAL.GRASSLAND[, versionId])
 *
 * Estrutura (para adicionar outro bioma, copie este arquivo — ex.:
 * `contract_cerrado.js` — ajuste o bloco BIOME e as versões/produtos nos
 * escopos; o motor e os drivers não mudam):
 *
 *   BIOME      — recorte territorial (nome, ano, escala, UF_LIST, territory,
 *                pasta de saída) — comum a todos os escopos do bioma.
 *   FOREST     — escopo florestal: versões (catálogo) + prefixo de saída.
 *   GRASSLAND  — escopo campestre: versões/produtos (catálogo) + prefixo.
 *
 * Os assets de produtos vêm de 00_catalog_products.js; limites/legendas dos
 * catálogos centrais (00_catalog_limits.js / 00_catalog_landcover.js).
 ******************************************************************************/
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_limits.js');
var PROD = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_products.js');

// ---- Acordos do bioma (comum a floresta e campos) ---------------------------
var BIOME = {
  ECO: 'pantanal',
  BIOME_NAME: 'Pantanal',
  YEAR: 2023,          // ano do estrato LULC (classificação)
  SCALE: 30,
  // Área de análise = bioma; UF opcional. Vazio → só o bioma; ['MS','MT']
  // habilita o detalhamento por unidade federativa (colunas UF/Unidade
  // Federativa; `territorio` continua sendo o rótulo do bioma).
  UF_LIST: [],
  territory: {
    biomeFc: LIM.BIOMES_FC,
    biomeCodeProp: LIM.BIOME_CODE_PROP,       // GEOCODE
    biomeNameProp: LIM.BIOME_NAME_PROP,       // Bioma
    biomeFallbackProp: null,
    ufFc: LIM.UFS_FC,
    ufCodeProp: LIM.UF_CODE_PROP,             // CD_UF
    ufSiglaProp: LIM.UF_SIGLA_PROP,           // SIGLA_UF
    ufNameProp: LIM.UF_NAME_PROP              // NM_UF
  },
  DRIVE_FOLDER: 'MAPBIOMAS_CARBONO_ESTATISTICAS'
};

/** Resolve um contrato plano = acordos do bioma + escopo. */
function resolve(scope) {
  var c = {};
  Object.keys(BIOME).forEach(function (k) { c[k] = BIOME[k]; });
  Object.keys(scope).forEach(function (k) { c[k] = scope[k]; });
  return c;
}

// ---- Abrangências do bioma --------------------------------------------------
exports.FOREST = resolve({
  SCOPE: 'forest',
  VERSIONS: PROD.FOREST,          // V03–V08 (mosaicos anuais + stdBand opcional)
  PREFIX: 'stats_forest',
  STOCK_UNIT: 'Mg',               // agbd (AGC) em Mg/ha × área_ha
  UNCERT_MODE: 'sd_ens'           // incerteza = stdDev do ensemble (v07/v08)
});

exports.GRASSLAND = resolve({
  SCOPE: 'grassland',
  VERSIONS: PROD.GRASSLAND_VERSIONS,
  PRODUCTS: PROD.GRASSLAND_PRODUCTS,   // tabela principal (biomassa + estoque)
  MONTHLY: PROD.GRASSLAND_MONTHLY,     // tabelas mensais (biomassa / ANPP)
  PREFIX: 'stats_grassland'
});

// ---- Acesso ao bloco comum (diagnóstico/QA) ---------------------------------
exports.BIOME = BIOME;
exports.ECO = BIOME.ECO;
