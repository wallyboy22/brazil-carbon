/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v03 · Fonte tipada de covariáveis
 * ---------------------------------------------------------------------------
 * Política de contratos/covariáveis (set/2026): cada versão é um arquivo
 * ÚNICO e autossuficiente — este módulo NÃO requer versões anteriores; ele
 * lê o próprio contrato (v03/0_contract.js) e a biblioteca compartilhada
 * (covariate/*), que congela a formulação desde_vNN (ver _metadata.js).
 * v03 = referência da cadeia tipada (buildTypedCovariatesStack).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v03/0_contract.js');
var infra = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_infra.js');
var build_stack = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/build_stack.js');

// ---------------------------------------------------------------------------
// Config (contrato da própria versão)
// ---------------------------------------------------------------------------
exports.ASSET_ROOT = c.ASSET_ROOT;
exports.FOOTPRINT_ASSET = c.FOOTPRINT_ASSET;
exports.BIOME_FC = c.BIOME_FC;
exports.BIOME_PROP = c.BIOME_PROP;
exports.BIOME_NAME = c.BIOME_NAME;
exports.SCALE = c.SCALE;
exports.FEATURE_BANDS = c.FEATURE_BANDS;
exports.TARGET = c.TARGET;
exports.makeTiles = c.makeTiles;
exports.makeCellDefinitions = c.makeCellDefinitions;
exports.makeCellFeatures = c.makeCellFeatures;

// ---------------------------------------------------------------------------
// Infra de assets (biblioteca compartilhada)
// ---------------------------------------------------------------------------
exports.ensureFolder = infra.ensureFolder;
exports.ensureImageCollection = infra.ensureImageCollection;
exports.SAMPLE_PROPS = infra.SAMPLE_PROPS;

// ---------------------------------------------------------------------------
// Stack tipado — rebuild com contrato numérico explícito (sem bandas duplas)
// ---------------------------------------------------------------------------
exports.buildTypedCovariatesStack = function (aoi, year) {
  return build_stack.buildTypedCovariatesStack(aoi, year, {
    continuous: c.CONTINUOUS_BANDS,
    categorical: c.CATEGORICAL_BANDS,
    feature: c.FEATURE_BANDS
  });
};