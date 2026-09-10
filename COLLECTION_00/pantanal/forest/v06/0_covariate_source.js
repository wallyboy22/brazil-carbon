/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v06 · Fonte com máscara florestal
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_contract.js');
var base = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v05/0_covariate_source.js');

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
exports.makeTiles = c.makeTiles;
exports.makeCellDefinitions = c.makeCellDefinitions;
exports.makeCellFeatures = c.makeCellFeatures;
exports.ensureFolder = base.ensureFolder;

exports.ensureImageCollection = function (collectionPath) {
  var parent = collectionPath.slice(0, collectionPath.lastIndexOf('/'));
  exports.ensureFolder(parent);
  try {
    var info = ee.data.getAsset(collectionPath);
    if (info.type !== 'IMAGE_COLLECTION' && info.type !== 'ImageCollection') {
      print('[ERRO] ' + collectionPath + ' existe, mas NÃO é ImageCollection (' +
        info.type + '). Excluir/recriar antes de rodar.');
      return;
    }
    print('[OK] ImageCollection já existe:', collectionPath);
  } catch (e) {
    try {
      ee.data.createAsset({ type: 'ImageCollection' }, collectionPath);
      print('[OK] ImageCollection criada:', collectionPath);
    } catch (e2) {
      print('[AVISO] Falha ao criar ImageCollection', collectionPath, '—', e2.message);
    }
  }
};

exports.getBiome = function () {
  return ee.FeatureCollection(c.BIOME_FC)
    .filter(ee.Filter.eq(c.BIOME_PROP, c.BIOME_NAME));
};

exports.getForestMask = function (year) {
  var lulc = ee.Image(c.LULC_ASSET).select('classification_' + year);
  return lulc.updateMask(ee.Image().paint(exports.getBiome(), 1))
    .remap(c.FOREST_CLASSES,
      c.FOREST_CLASSES.map(function () { return 1; }), 0)
    .selfMask().rename('forest_mask').toUint8();
};

exports.buildTypedCovariatesStack = function (aoi, year) {
  var raw = base.buildTypedCovariatesStack(aoi, year);
  return raw.select(c.CONTINUOUS_BANDS).toFloat()
    .addBands(raw.select(c.CATEGORICAL_BANDS).toUint8())
    .select(c.FEATURE_BANDS).clip(aoi);
};
