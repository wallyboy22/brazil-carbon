/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v05 · Fonte tipada em memória
 * ---------------------------------------------------------------------------
 * Política de contratos/covariáveis (set/2026): arquivo ÚNICO e autossuficiente
 * (sem require de outras versões). Lê o próprio contrato (v05/0_contract.js) +
 * biblioteca compartilhada covariate/* (formulações desde_vNN em _metadata.js).
 * v05: mesma tipagem da v04 — retrabalha o stack já tipado em memória.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v05/0_contract.js');
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
// Stack tipado (tipagem reaplicada em memória)
// ---------------------------------------------------------------------------
exports.buildTypedCovariatesStack = function (aoi, year) {
  var raw = build_stack.buildTypedCovariatesStack(aoi, year, {
    continuous: c.CONTINUOUS_BANDS,
    categorical: c.CATEGORICAL_BANDS,
    feature: c.FEATURE_BANDS
  });
  return raw.select(c.CONTINUOUS_BANDS).toFloat()
    .addBands(raw.select(c.CATEGORICAL_BANDS).toUint8())
    .select(c.FEATURE_BANDS).clip(aoi);
};