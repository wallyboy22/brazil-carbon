/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Preflight da máscara de treino
 * ---------------------------------------------------------------------------
 * Mostra a máscara florestal LULC (3,4,6,7,49) + TRAINING_MASKS extras e a
 * pilha de covariáveis. Na v07 a máscara NÃO mascarará a saída da predição —
 * ela existe apenas para filtrar as amostras de treino.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v07/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v07/0_covariate_source.js');
var mask = src.getTrainingMask(c.YEAR);
var stack = src.buildTypedCovariatesStack(src.getBiome().geometry(), c.YEAR);

print('MAPBIOMAS-CARBONO · Pantanal Forest v07 · 1_preflight');
print('[MODELO]', 'v07 — ensemble RF N=' + c.ENSEMBLE.NUM_MEMBERS +
  ', minLeaf=' + c.MIN_LEAF_POP + ', log=' + c.LOG_TARGET);
print('[CLASSES FLORESTAIS C11 (treino)]', c.FOREST_CLASSES);
print('[TRAINING_MASKS]', c.TRAINING_MASKS.map(function (m) { return m.name; }));
print('[MASK MODE]', c.MASK_MODE, '— a saída da predição NÃO será mascarada por LULC');
print('[MASK]', mask.bandTypes());
print('[STACK]', stack.bandNames(), stack.bandTypes());
print('[IMPORTANTE] ImageCollection de predições criada automaticamente em ' +
  c.ASSET_ROOT + '/PREDICTIONS/COL no passo 4.');
Map.addLayer(mask, { palette: ['#1a9850'] }, 'Treino mask C11 (v07)', true);
Map.addLayer(stack.select('mapbiomas_lulc'), { min: 0, max: 91 }, 'LULC C11 (v07)', false);