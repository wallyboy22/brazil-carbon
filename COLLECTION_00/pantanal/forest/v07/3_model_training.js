/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Treino florestal
 * ---------------------------------------------------------------------------
 * v07 (decisões da consulta estratégica):
 *   - regularização direta: minLeafPopulation + variablesPerSplit (champion)
 *   - pesos de amostra 1/agbd_se² (peso do rótulo GEDI — recomendação A4)
 *   - ensemble: N=5 RF (seeds + ~80% bandas + ~80% linhas via bagFraction)
 *   - objetivo: agbd ou ln(1+agbd) conforme c.LOG_TARGET (Duan no passo 4)
 *
 * MODELO GLOBAL ÚNICO (não por célula): a matriz agrega TODAS as células
 * (D18). Um classificador por membro do ensemble é exportado para
 * ASSET_ROOT/MODELS/rf_agc_v07_m1..mN.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_covariate_source.js');
var root = c.ASSET_ROOT;
var N = c.ENSEMBLE.NUM_MEMBERS;

var response = ee.data.listAssets(root + '/MATRIX');
var assets = (response.assets || []).filter(function (a) {
  return a.type === 'TABLE' && a.id.indexOf('/agc_matrix_v07_') > -1;
});
if (!assets.length) throw new Error('Matriz florestal v07 não encontrada.');
var matrix = ee.FeatureCollection(assets.map(function (a) {
  return ee.FeatureCollection(a.id).select(c.FEATURE_BANDS.concat([c.TARGET]));
})).flatten();

// Objetivo: se LOG_TARGET, o modelo aprende z = ln(1+agbd) ou ln(agbd)
var target = c.TARGET;
if (c.LOG_TARGET) {
  matrix = matrix.map(function (f) {
    var z = c.LOG_OFFSET === 1
      ? ee.Number(f.get(c.TARGET)).add(1).log()
      : ee.Number(f.get(c.TARGET)).log();
    return f.set('agbd_log', z);
  });
  target = 'agbd_log';
}

function trainMember(i) {
  var bands = src.getMemberBands(i);
  var model = ee.Classifier.smileRandomForest({
    numberOfTrees: 300,
    bagFraction: c.ENSEMBLE.TRAIN_FRACTION,   // ~80% das linhas (bootstrap)
    minLeafPopulation: c.MIN_LEAF_POP,        // regularização (champion)
    variablesPerSplit: c.VARIABLES_PER_SPLIT, // ~sqrt(#bandas)
    seed: c.ENSEMBLE.SEED_BASE + i
  }).setOutputMode('REGRESSION').train({
    features: matrix.select(bands.concat([target])),
    classProperty: target,
    inputProperties: bands,
    weightProperty: 'w'                       // 1/agbd_se² (recomendação A4)
  });
  var modelAsset = root + '/MODELS/rf_agc_v07_m' + i + '_' +
    (c.LOG_TARGET ? 'log' : 'lin');
  print('[TASK]', modelAsset, '· bandas', bands.length, '· seed',
    c.ENSEMBLE.SEED_BASE + i);
  Export.classifier.toAsset({ classifier: model,
    description: 'WS_CARBONO_toAsset-rf_agc_v07_m' + i,
    assetId: modelAsset });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v07 · 3_model_training');
print('[CHAMPION] minLeafPopulation =', c.MIN_LEAF_POP,
  '· variablesPerSplit =', c.VARIABLES_PER_SPLIT,
  '· log_target =', c.LOG_TARGET, '· log_offset =', c.LOG_OFFSET);
print('[ENSEMBLE] N =', N, '· seed_base =', c.ENSEMBLE.SEED_BASE,
  '· band_fraction =', c.ENSEMBLE.BAND_FRACTION,
  '· train_fraction =', c.ENSEMBLE.TRAIN_FRACTION);
print('[MATRIZES]', assets.length, '· [TARGET]', target);
matrix.size().evaluate(function (n) { print('[AMOSTRAS]', n); });
src.ensureFolder(root + '/MODELS');
for (var i = 1; i <= N; i++) trainMember(i);