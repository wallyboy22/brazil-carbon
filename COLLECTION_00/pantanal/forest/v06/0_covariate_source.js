/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v06 · Fonte com máscara florestal
 * ---------------------------------------------------------------------------
 * Política de contratos/covariáveis (set/2026): arquivo ÚNICO e autossuficiente
 * (sem require de outras versões). Lê o próprio contrato (v06/0_contract.js) +
 * biblioteca compartilhada covariate/* (formulações desde_vNN em _metadata.js).
 * v06 introduz getBiome e getForestMask (LULC florestal) — ver _metadata.js
 * tag 'since_v06' em training_masks.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_contract.js');
var infra = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_infra.js');
var training = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_training.js');
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
exports.LULC_ASSET = c.LULC_ASSET;
exports.FOREST_CLASSES = c.FOREST_CLASSES;
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
// Bioma e máscara florestal (desde_v06)
// ---------------------------------------------------------------------------
exports.getBiome = function () {
  return infra.getBiome(c.BIOME_FC, c.BIOME_PROP, c.BIOME_NAME);
};

exports.getForestMask = function (year) {
  return training.getForestMask({
    lulcAsset: c.LULC_ASSET,
    biomeFc: c.BIOME_FC, biomeProp: c.BIOME_PROP, biomeName: c.BIOME_NAME,
    forestClasses: c.FOREST_CLASSES
  }, year);
};

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