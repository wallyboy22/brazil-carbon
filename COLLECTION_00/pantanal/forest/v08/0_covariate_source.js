/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Fonte de covariáveis
 * ---------------------------------------------------------------------------
 * FIX DA V08 (artefato de excesso pós-v07): o PALSAR é construído UMA VEZ
 * como mosaico GLOBAL determinístico do ano e injetado em todas as células,
 * em vez do `.first()` por célula herdado da v01 (que escolhia strips
 * arbitrárias por AOI e criava platôs de HV/HH alinhados à grade).
 *
 *   buildPalsarGlobal(year):
 *     - ImageCollection anual de SAR_EPOCH no bioma
 *     - DN <= 0 mascarado como nodata (updateMask(img.gt(0)))
 *     - combinação por MEDIANA (determinística) das observações válidas
 *     - conversão dB idêntica à cadeia (pow²·log10·10−83), HV/HH ratio, RVI
 *       e filtro de speckle focal_mean(3)
 *   getTrainingMask(year):
 *     - LULC florestal (3,4,6,7,49) + TRAINING_MASKS extras, incluindo a
 *       nova máscara palsar_nodata (exclui footprints sem dado SAR válido)
 *   buildTypedCovariatesStack(aoi, year):
 *     - curry da cadeia v07→…→v01 removendo as bandas PALSAR per-célula do
 *       stack (não computadas) e injetando as do mosaico global tipadas
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var base = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_covariate_source.js');

var PALSAR_BANDS = ['HH_db', 'HV_db', 'HV_HH_ratio', 'RVI'];

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

// ---------------------------------------------------------------------------
// PALSAR-2 global (FIX v08)
// ---------------------------------------------------------------------------
var GLOBAL_PALSAR_CACHE = {};

// Composição anual global (bioma): mediana das observações válidas.
function buildPalsarComposite(year) {
  if (GLOBAL_PALSAR_CACHE[year]) return GLOBAL_PALSAR_CACHE[year];
  var comp = ee.ImageCollection('JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH')
    .filterBounds(exports.getBiome())
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .select(['HH', 'HV'])
    .map(function (img) { return img.updateMask(img.gt(0)); })  // DN<=0 = nodata
    .median();
  GLOBAL_PALSAR_CACHE[year] = comp;
  return comp;
}

// Stack de 4 bandas PALSAR em dB (mesma derivação da cadeia, fonte global).
exports.buildPalsarGlobal = function (year) {
  var comp = buildPalsarComposite(year);
  var hhDb = comp.select('HH').pow(2).log10().multiply(10).subtract(83.0).rename('HH_db');
  var hvDb = comp.select('HV').pow(2).log10().multiply(10).subtract(83.0).rename('HV_db');
  var hhLin = hhDb.multiply(0.1).pow(ee.Image(10));
  var hvLin = hvDb.multiply(0.1).pow(ee.Image(10));
  var ratio = hvLin.divide(hhLin).log10().multiply(10).rename('HV_HH_ratio');
  var rvi = hvLin.multiply(4).divide(hhLin.add(hvLin)).rename('RVI');
  return ee.Image.cat([hhDb, hvDb, ratio, rvi])
    .focal_mean(3, 'square', 'pixels')   // filtro de speckle (paridade da cadeia)
    .clip(exports.getBiome());
};

// Máscara de validade do PALSAR global (1 onde há dado; masked onde nodata).
exports.getPalsarValidMask = function (year) {
  return buildPalsarComposite(year).select('HH')
    .selfMask().rename('mask_palsar_nodata');
};

// ---------------------------------------------------------------------------
// Máscaras de TREINO (LULC florestal AND extras) — NÃO mascara a predição
// ---------------------------------------------------------------------------
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
  palsar_nodata: function (def, year) {
    return exports.getPalsarValidMask(year);
  }
  // Exemplo futuro:
  // hand_dreno: function (def, year) { ... }
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

// ---------------------------------------------------------------------------
// Stack tipado com PALSAR GLOBAL (FIX v08)
// ---------------------------------------------------------------------------
exports.buildTypedCovariatesStack = function (aoi, year) {
  var raw = base.buildTypedCovariatesStack(aoi, year);
  var contNoPalsar = c.CONTINUOUS_BANDS.filter(function (b) {
    return PALSAR_BANDS.indexOf(b) === -1;
  });
  // Remove as bandas PALSAR per-célula (não são computadas no grafo)
  var typed = raw.select(contNoPalsar).toFloat()
    .addBands(raw.select(c.CATEGORICAL_BANDS).toUint8())
    .select(contNoPalsar.concat(c.CATEGORICAL_BANDS)).clip(aoi);
  // Injeta o mosaico global de PALSAR do ano (determinístico)
  var palsar = exports.buildPalsarGlobal(year)
    .select(PALSAR_BANDS).toFloat().clip(aoi);
  return typed.addBands(palsar).select(c.FEATURE_BANDS).clip(aoi);
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