/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_training.js
 * ---------------------------------------------------------------------------
 * Máscaras de TREINO (LULC florestal AND extras) — NÃO mascaram a predição.
 * Política since_vNN (ver _metadata.js):
 *   · getForestMask   — since_v06
 *   · getTrainingMask — since_v07 (registry EXTRA_MASK_BUILDERS)
 *   · applyTrainingMask — since_v07
 * Módulo independente: o orquestrador da versão injeta `cfg` com os valores
 * do contrato (lulcAsset, biomeFc/prop/name, forestClasses, trainingMasks,
 * extraBuilders, sampleProps, scale).
 ******************************************************************************/

/** Máscara florestal por LULC (classes do contrato) — consistência do rótulo. */
exports.getForestMask = function (cfg, year) {
  var lulc = ee.Image(cfg.lulcAsset).select('classification_' + year);
  var biome = ee.FeatureCollection(cfg.biomeFc)
    .filter(ee.Filter.eq(cfg.biomeProp, cfg.biomeName));
  return lulc.updateMask(ee.Image().paint(biome, 1))
    .remap(cfg.forestClasses,
      cfg.forestClasses.map(function () { return 1; }), 0)
    .selfMask().rename('forest_mask').toUint8();
};

/**
 * Máscara composta de TREINO = floresta LULC (AND) extras.
 * cfg.extraBuilders: objeto { nome_mascara: function(def, year) } montado pelo
 * orquestrador da versão (que injeta as entradas específicas, ex. palsar_nodata).
 */
exports.getTrainingMask = function (cfg, year) {
  var mask = exports.getForestMask(cfg, year);
  cfg.trainingMasks.forEach(function (def) {
    if (def.name === 'lulc_forest') return;
    var builder = cfg.extraBuilders[def.name];
    if (!builder) {
      throw new Error('Máscara extra não registrada em extraBuilders: ' + def.name);
    }
    var extra = builder(def, year).updateMask(mask).selfMask()
      .rename('mask_' + def.name);
    mask = mask.updateMask(extra).rename('forest_mask').toUint8();
  });
  return mask;
};

/** Aplica a máscara de treino a uma FeatureCollection de amostras. */
exports.applyTrainingMask = function (cfg, fc, year) {
  return exports.getTrainingMask(cfg, year).sampleRegions({
    collection: fc, properties: cfg.sampleProps,
    scale: cfg.scale, geometries: true, tileScale: 16
  }).filter(ee.Filter.eq('forest_mask', 1));
};