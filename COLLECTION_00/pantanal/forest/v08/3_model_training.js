/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Treino florestal
 * ---------------------------------------------------------------------------
 * v08 (fix pós-v07):
 *   - covariáveis com PALSAR GLOBAL (0_covariate_source.js) + máscara de
 *     treino palsar_nodata — enfrentar o artefato de excesso;
 *   - parametrização herdada da v07 (champion: minLeaf 10, linear, N=5).
 *
 * MODELO GLOBAL ÚNICO (não por célula): a matriz agrega TODAS as células.
 * Um classificador por membro do ensemble é exportado para
 * ASSET_ROOT/MODELS/rf_agc_v08_m1..mN.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var root = c.ASSET_ROOT;
var N = c.ENSEMBLE.NUM_MEMBERS;

var response = ee.data.listAssets(root + '/MATRIX');
var assets = (response.assets || []).filter(function (a) {
  return a.type === 'TABLE' && a.id.indexOf('/agc_matrix_' + c.SOURCE + '_v08_') > -1;
});
if (!assets.length) throw new Error('Matriz florestal v08 não encontrada.');
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

// Export.classifier.toAsset não aceita 'overwrite' (API atual); para permitir
// re-treino, o asset existente é removido antes do export.
function deleteModelAsset(assetId) {
  var exists = false;
  try {
    ee.data.getAsset(assetId);
    exists = true;
  } catch (e) {
    // Asset ainda não existe — primeira execução.
  }
  if (exists) {
    try {
      ee.data.deleteAsset(assetId);
      print('[AUTO] asset de modelo removido:', assetId);
    } catch (e) {
      print('[AVISO] falha ao remover asset:', assetId, '—', e.message);
    }
  }
}

function trainMember(i) {
  var bands = src.getMemberBands(i);
  var model = ee.Classifier.smileRandomForest({
    numberOfTrees: 300,
    bagFraction: c.ENSEMBLE.TRAIN_FRACTION,   // ~80% das linhas (bootstrap)
    minLeafPopulation: c.MIN_LEAF_POP,        // regularização (champion v07)
    variablesPerSplit: c.VARIABLES_PER_SPLIT, // ~sqrt(#bandas)
    seed: c.ENSEMBLE.SEED_BASE + i
  }).setOutputMode('REGRESSION').train({
    features: matrix.select(bands.concat([target])),
    classProperty: target,
    inputProperties: bands
  });
  // Proveniência de covariáveis anexada ao modelo exportado (asset properties)
  model = model.set({
    covariates_registry: JSON.stringify(src.COVARIATES_REGISTRY),
    covariate_version: src.COVARIATES_VERSION,
    model_version: 'v08',
    ensemble_member: i
  });
  var modelAsset = root + '/MODELS/rf_agc_v08_m' + i + '_' +
    (c.LOG_TARGET ? 'log' : 'lin');
  deleteModelAsset(modelAsset);
  print('[TASK]', modelAsset, '· bandas', bands.length, '· seed',
    c.ENSEMBLE.SEED_BASE + i);
  Export.classifier.toAsset({ classifier: model,
    description: 'WS_CARBONO_toAsset-rf_agc_v08_m' + i,
    assetId: modelAsset });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 3_model_training');
print('[CHAMPION (v07 herdado)] minLeafPopulation =', c.MIN_LEAF_POP,
  '· variablesPerSplit =', c.VARIABLES_PER_SPLIT,
  '· log_target =', c.LOG_TARGET, '· log_offset =', c.LOG_OFFSET);
print('[ENSEMBLE] N =', N, '· seed_base =', c.ENSEMBLE.SEED_BASE,
  '· band_fraction =', c.ENSEMBLE.BAND_FRACTION,
  '· train_fraction =', c.ENSEMBLE.TRAIN_FRACTION);
print('[FIX] PALSAR global + máscara palsar_nodata no treino');
print('[COVARIATES] versão', src.COVARIATES_VERSION, '· n temas =',
  src.COVARIATES_REGISTRY.length);
print('[COVARIATES] registro compacto:',
  JSON.stringify(src.COVARIATES_REGISTRY.map(function (r) {
    return { id: r.id, nbands: r.bands.length, versions: r.versions };
  })));
print('[MATRIZES]', assets.length, '· [TARGET]', target);
matrix.size().evaluate(function (n) { print('[AMOSTRAS]', n); });
src.ensureFolder(root + '/MODELS');
for (var i = 1; i <= N; i++) trainMember(i);