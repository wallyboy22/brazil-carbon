/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Fonte de covariáveis
 * ---------------------------------------------------------------------------
 * v07:
 *   - getForestMask / getTrainingMask: LULC (3,4,6,7,49) + TRAINING_MASKS
 *     extras — SÓ para filtrar amostras de treino (não mascara a predição)
 *   - getMemberBands(i): subconjunto determinístico de FEATURE_BANDS para o
 *     membro i do ensemble (~BAND_FRACTION das bandas, hash por seed)
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_contract.js');
var base = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_covariate_source.js');

// ---------------------------------------------------------------------------
// Re-exports herdados
// ---------------------------------------------------------------------------
exports.ASSET_ROOT = c.ASSET_ROOT;
exports.FOOTPRINT_ASSET = c.FOOTPRINT_ASSET;
exports.BIOME_FC = c.BIOME_FC;
exports.BIOME_PROP = c.BIOME_PROP;
exports.BIOME_NAME = c.BIOME_NAME;
exports.LULC_ASSET = c.LULC_ASSET;
exports.FOREST_CLASSES = c.FOREST_CLASSES;
exports.SCALE = c.SCALE;
exports.SAMPLE_PROPS = base.SAMPLE_PROPS;
exports.FEATURE_BANDS = c.FEATURE_BANDS;
exports.TARGET = c.TARGET;
exports.CONTINUOUS_BANDS = c.CONTINUOUS_BANDS;
exports.CATEGORICAL_BANDS = c.CATEGORICAL_BANDS;
exports.TRAINING_MASKS = c.TRAINING_MASKS;
exports.ENSEMBLE = c.ENSEMBLE;
exports.makeTiles = c.makeTiles;
exports.makeCellDefinitions = c.makeCellDefinitions;
exports.makeCellFeatures = c.makeCellFeatures;
exports.ensureFolder = base.ensureFolder;
exports.ensureImageCollection = base.ensureImageCollection;

exports.getBiome = function () {
  return ee.FeatureCollection(c.BIOME_FC)
    .filter(ee.Filter.eq(c.BIOME_PROP, c.BIOME_NAME));
};

// Máscara florestal LULC (3,4,6,7,49) — consistência do rótulo (treino)
exports.getForestMask = function (year) {
  var lulc = ee.Image(c.LULC_ASSET).select('classification_' + year);
  return lulc.updateMask(ee.Image().paint(exports.getBiome(), 1))
    .remap(c.FOREST_CLASSES,
      c.FOREST_CLASSES.map(function () { return 1; }), 0)
    .selfMask().rename('forest_mask').toUint8();
};

// Registry de máscaras extras independentes do LULC. Para adicionar uma nova
// máscara: item novo em c.TRAINING_MASKS + entrada aqui em buildExtraMask.
var EXTRA_MASK_BUILDERS = {
  // Exemplo: máscara de distância a dreno (HAND) <= limite, para excluir
  // amostras em terreno de baixada mal mapeado. Descomentar junto com o item
  // correspondente em TRAINING_MASKS.
  // hand_dreno: function (def, year) {
  //   var hand = ee.Image('projects/.../HAND'); // deixar caminho real
  //   return hand.lte(def.max_hand).rename('mask_' + def.name).toUint8();
  // }
};

function buildExtraMask(def, year) {
  var builder = EXTRA_MASK_BUILDERS[def.name];
  if (!builder) {
    throw new Error('Máscara extra não registrada em 0_covariate_source.js: ' + def.name);
  }
  return builder(def, year);
}

// Máscara composta de TREINO = floresta LULC (AND) máscaras extras
exports.getTrainingMask = function (year) {
  var mask = exports.getForestMask(year);
  c.TRAINING_MASKS.forEach(function (def) {
    if (def.name === 'lulc_forest') return;
    var extra = buildExtraMask(def, year).updateMask(mask).selfMask()
      .rename('mask_' + def.name);
    mask = mask.updateMask(extra).rename('forest_mask').toUint8();
  });
  return mask;
};

// Aplica a máscara de treino a uma FeatureCollection de amostras (sampleRegions)
exports.applyTrainingMask = function (fc, year) {
  return exports.getTrainingMask(year).sampleRegions({
    collection: fc, properties: exports.SAMPLE_PROPS,
    scale: c.SCALE, geometries: true, tileScale: 16
  }).filter(ee.Filter.eq('forest_mask', 1));
};

exports.buildTypedCovariatesStack = function (aoi, year) {
  var raw = base.buildTypedCovariatesStack(aoi, year);
  return raw.select(c.CONTINUOUS_BANDS).toFloat()
    .addBands(raw.select(c.CATEGORICAL_BANDS).toUint8())
    .select(c.FEATURE_BANDS).clip(aoi);
};

// ---------------------------------------------------------------------------
// Ensemble — subconjunto determinístico de bandas para o membro i
// ---------------------------------------------------------------------------
function hashString(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ~BAND_FRACTION das FEATURE_BANDS, escolhidas por hash banda+i (determinístico)
exports.getMemberBands = function (i) {
  var frac = c.ENSEMBLE.BAND_FRACTION;
  var chosen = c.FEATURE_BANDS.filter(function (b) {
    return (hashString(b + '::' + i) % 1000) / 1000 < frac;
  });
  if (chosen.length < 3) {
    return c.FEATURE_BANDS.slice(0, Math.max(3, chosen.length));
  }
  return chosen;
};