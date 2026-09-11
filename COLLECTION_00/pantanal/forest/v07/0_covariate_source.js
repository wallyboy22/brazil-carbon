/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Fonte de covariáveis
 * ---------------------------------------------------------------------------
 * Política de contratos/covariáveis (set/2026): arquivo ÚNICO e autossuficiente
 * (sem require de outras versões). Lê o próprio contrato (v07/0_contract.js) +
 * biblioteca compartilhada covariate/* (formulações desde_vNN em _metadata.js).
 * v07 introduz (desde_v07):
 *   · getTrainingMask — floresta LULC AND máscaras extras do registry
 *   · applyTrainingMask — sampleRegions filtrando só forest_mask==1
 *   · getMemberBands(i) — subconjunto determinístico (ensemble ~80% bandas)
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_contract.js');
var infra = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_infra.js');
var training = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_training.js');
var ens = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_ensemble.js');
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
exports.CONTINUOUS_BANDS = c.CONTINUOUS_BANDS;
exports.CATEGORICAL_BANDS = c.CATEGORICAL_BANDS;
exports.TRAINING_MASKS = c.TRAINING_MASKS;
exports.ENSEMBLE = c.ENSEMBLE;
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
// Bioma, máscaras de treino (desde_v07)
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

// v07 não tem mascarar extras registradas — registry de extras vazio
var EXTRA_MASK_BUILDERS = {};

exports.getTrainingMask = function (year) {
  return training.getTrainingMask({
    lulcAsset: c.LULC_ASSET,
    biomeFc: c.BIOME_FC, biomeProp: c.BIOME_PROP, biomeName: c.BIOME_NAME,
    forestClasses: c.FOREST_CLASSES,
    trainingMasks: c.TRAINING_MASKS,
    extraBuilders: EXTRA_MASK_BUILDERS
  }, year);
};

exports.applyTrainingMask = function (fc, year) {
  return training.applyTrainingMask({
    lulcAsset: c.LULC_ASSET,
    biomeFc: c.BIOME_FC, biomeProp: c.BIOME_PROP, biomeName: c.BIOME_NAME,
    forestClasses: c.FOREST_CLASSES,
    trainingMasks: c.TRAINING_MASKS,
    extraBuilders: EXTRA_MASK_BUILDERS,
    sampleProps: infra.SAMPLE_PROPS,
    scale: c.SCALE
  }, fc, year);
};

exports.getMemberBands = function (i) {
  return ens.getMemberBands({ ensemble: c.ENSEMBLE, featureBands: c.FEATURE_BANDS }, i);
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