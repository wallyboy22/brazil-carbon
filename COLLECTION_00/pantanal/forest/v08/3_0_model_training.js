/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Treino florestal
 * ---------------------------------------------------------------------------
 * v08 (fix pós-v07):
 *   - covariáveis com PALSAR GLOBAL (0_covariate_source.js);
 *   - champion do gate v08 (minLeafPopulation POR FONTE: gedi=5, ifn=10; linear, N=5);
 *   - `maxNodes: 40` (teto de nós/árvore) para o modelo ficar pequeno — sem ele
 *     o RF exportado passa de ~896 MB e o `classify` estoura a memória.
 *
 * MODELO GLOBAL ÚNICO (não por célula): a matriz agrega TODAS as células.
 * Um classificador por membro do ensemble é exportado para
 * <ASSET_ROOT>/MODELS/rf_agb_v08_m1..mN.
 *
 * FONTE: com `SOURCE=null` (ambíguo) dispara as DUAS fontes em sequência.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var N = c.ENSEMBLE.NUM_MEMBERS;

// CHAMPION (gate v08, POR FONTE) — valores do 2_3_gcn (`champion.json`).
// Sweep de minLeafPopulation (RMSE CV espacial, t/ha):
//   gedi: 5→69.27 · 10→69.30 · 20→69.41 · 30→69.51
//   ifn : 5→36.12 · 10→36.05 · 20→36.07 · 30→36.45
// `maxNodes`: teto de nós por árvore. SEM ele as árvores crescem demais
// (matriz de ~1,65 M amostras) e o classificador exportado passa de ~896 MB,
// o que estoura o limite de memória do `classify`/`Map.addLayer`. O Solo usa
// `maxNodes: 40`; aqui adotamos o mesmo teto para manter o modelo pequeno.
var CHAMPION = {
  gedi: { minLeafPopulation: c.SOURCES.gedi.minLeafPop, variablesPerSplit: c.VARIABLES_PER_SPLIT, numberOfTrees: 300, maxNodes: c.MAX_NODES },
  ifn:  { minLeafPopulation: c.SOURCES.ifn.minLeafPop,  variablesPerSplit: c.VARIABLES_PER_SPLIT, numberOfTrees: 300, maxNodes: c.MAX_NODES }
};

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 3_0_model_training');
print('[ENSEMBLE] N =', N, '· seed_base =', c.ENSEMBLE.SEED_BASE,
  '· band_fraction =', c.ENSEMBLE.BAND_FRACTION,
  '· train_fraction =', c.ENSEMBLE.TRAIN_FRACTION);
print('[COVARIATES] versão', src.COVARIATES_VERSION, '· n temas =',
  src.COVARIATES_REGISTRY.length);
print('[FONTES]', c.sourcesToRun().join(', '),
  '(SOURCE=' + c.SOURCE + ')');

c.sourcesToRun().forEach(function (source) {
  var S = c.SOURCES[source];
  var root = S.assetRoot;
  var champ = CHAMPION[source];
  print('\n' + c.RULE);
  print('# FONTE:', source, '·', S.label, '· raiz', root);
  print(c.RULE);
  if (!champ) {
    print('[AVISO] sem champion para', source, '— pulando.');
    return;
  }

  var response = ee.data.listAssets(root + '/MATRIX');
  var assets = (response.assets || []).filter(function (a) {
    return a.type === 'TABLE' && a.id.indexOf('/agb_matrix_' + source + '_v08_') > -1;
  });
  if (!assets.length) {
    print('[AVISO] sem matriz (agb_matrix_' + source + '_v08_*) em',
      root + '/MATRIX — rode o 2_2 da fonte e aguarde.');
    return;
  }
  var matrix = ee.FeatureCollection(assets.map(function (a) {
    return ee.FeatureCollection(a.id).select(c.FEATURE_BANDS.concat([c.TARGET]));
  })).flatten();
  var target = c.TARGET;   // alvo linear (sem log-target)

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
      numberOfTrees: champ.numberOfTrees,         // champion (gate v08)
      bagFraction: c.ENSEMBLE.TRAIN_FRACTION,     // ~80% das linhas (bootstrap)
      minLeafPopulation: champ.minLeafPopulation, // champion POR FONTE (5/10)
      variablesPerSplit: champ.variablesPerSplit, // ~sqrt(#bandas)
      maxNodes: champ.maxNodes,                   // teto de nós/árvore (modelo pequeno)
      seed: c.ENSEMBLE.SEED_BASE + i
    }).setOutputMode('REGRESSION').train({
      features: matrix.select(bands.concat([target])),
      classProperty: target,
      inputProperties: bands
    });
    // NOTA: `ee.Classifier` NÃO é `ee.Element` (nem aceita propriedades de asset).
    // A proveniência vai num ASSET COMPANHEIRO pelo passo `3_1_model_metadata.js`.
    var modelAsset = root + '/MODELS/rf_agb_v08_m' + i;
    deleteModelAsset(modelAsset);
    print('[TASK]', modelAsset, '· bandas', bands.length, '· seed',
      c.ENSEMBLE.SEED_BASE + i);
    Export.classifier.toAsset({ classifier: model,
      description: 'WS_CARBONO_toAsset-rf_agb_v08_' + source + '_m' + i,
      assetId: modelAsset });
  }

  print('[CHAMPION] minLeafPopulation =', champ.minLeafPopulation,
    '· variablesPerSplit =', champ.variablesPerSplit,
    '· numberOfTrees =', champ.numberOfTrees,
    '· maxNodes =', champ.maxNodes);
  print('[MATRIZES]', assets.length, '· [TARGET]', target);
  matrix.size().evaluate(function (n) { print('[AMOSTRAS]', source, n); });
  src.ensureFolder(root + '/MODELS');
  for (var i = 1; i <= N; i++) trainMember(i);
});
