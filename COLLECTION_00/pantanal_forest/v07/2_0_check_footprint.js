/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Check do footprint de entrada
 * ---------------------------------------------------------------------------
 * Conta raw vs training-mask (LULC 3,4,6,7,49 + TRAINING_MASKS extras).
 * Somente as amostras da máscara de treino seguem para a matriz (2_2).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v07/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v07/0_covariate_source.js');
var raw = ee.FeatureCollection(src.FOOTPRINT_ASSET);
var labeled = src.applyTrainingMask(raw, c.YEAR);

print('MAPBIOMAS-CARBONO · Pantanal Forest v07 · 2_0_check_footprint');
raw.size().evaluate(function (n) { print('[RAW]', n); });
labeled.size().evaluate(function (n) { print('[TREINO (mask C11 + extras)]', n); });
labeled.distinct('pft_class').aggregate_array('pft_class')
  .evaluate(function (p) { print('[PFT]', p); });