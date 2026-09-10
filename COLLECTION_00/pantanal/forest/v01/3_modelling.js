/******************************************************************************
 * MAPBIOMAS-CARBONO — Coleção 0 · PANTANAL · v01 · Modelagem e predição (AGC)
 * ----------------------------------------------------------------------------
 * Etapa 3 da pipeline modular: carrega a matriz de treino da pasta MATRIX
 * (produzida pelo 2_data_matrix), treina o modelo de ML escolhido
 * (MODEL_TYPE: rf | gbm | svm — espelham o GEE) no alvo `agbd` e gera a
 * predição espaço-temporal multibanda do estoque de carbono acima do solo,
 * exportando para Assets GEE (e opcionalmente Drive).
 *
 * SAÍDAS (baldes GEE — fluxo de predição):
 *   PREDICTIONS/agc_pred_{version}{subversion}   → imagem multibanda prediction_{ano}
 *   (MODELS: toggle SAVE_MODEL_TO_ASSET, desligado por padrão)
 *   (Drive: ligar EXPORT_TO_DRIVE p/ GeoTIFF de diagnóstico)
 *
 * PRÉ-REQUISITO: rodar 2_data_matrix antes (asset MATRIX/agc_matrix_{version}).
 * A escolha do modelo/covariáveis vem da análise offline (ANALYSIS/).
 *
 * ORDEM DA PIPELINE v01:
 *   0_covariate_source → 1_check_covariates → 2_data_matrix → [3_modelling]
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v01/0_covariate_source.js');

// =============================================================================
// 0. CONFIG
// =============================================================================

// Versão — deve casar com a usada no 2_data_matrix
var VERSION = 'v01';

// Tag de subversão (experimento). '' = base. Ex.: '_rf', '_gbm', '_svm', '_noPalsar'.
// Diferentes MODEL_TYPE/params/covariáveis → subversões (ver ANALYSIS/EXPERIMENTS.md).
var SUBVERSION = '_rf';

// Sufixo dos assets/nomes = versão + subversão (não editar)
var SUFFIX = VERSION + SUBVERSION;

// Modelo de ML (espelha o GEE): 'rf' | 'gbm' | 'svm'
var MODEL_TYPE = 'rf';

// Variável-alvo da regressão (AGC do GEDI L4A, Mg/ha)
var TARGET = 'agbd';

// Asset da matriz de treino (saída da etapa 2)
var MATRIX_ASSET = src.ASSET_ROOT + '/MATRIX/agc_matrix_' + VERSION;

// Anos da predição espaço-temporal. Janela segura: HLS (2013+) + PALSAR
// SAR_EPOCH + GEDI (2019+). Estenda conforme disponibilidade das fontes.
var YEARS = [2019, 2020, 2021, 2022, 2023];

// Hiperparâmetros por modelo (espelham o GEE; alinhados ao offline em ANALYSIS/)
var MODEL_PARAMS = {
  rf:  { numberOfTrees: 300, bagFraction: 0.632, seed: 2021 },
  gbm: { numberOfTrees: 300, shrinkage: 0.1, samplingRate: 0.9, seed: 2021 },
  svm: { svmType: 'EPSILON_SVR', kernelType: 'RBF', gamma: 0.01, cost: 100, epsilon: 0.1 }
};

// Salvar o modelo treinado como asset? (padrão OFF — ver decisão no README v01)
var SAVE_MODEL_TO_ASSET = false;

// Destino dos exports — Assets GEE (fluxo de predição)
var EXPORT_TO_ASSET = true;

// Export de diagnóstico no Google Drive (desligado por padrão)
var EXPORT_TO_DRIVE = false;

// Pasta de destino no Google Drive
var EXPORT_FOLDER = 'GEE_Exports_AGC-v01';

// Bases dos baldes de asset
var ASSET_PREDICTIONS = src.ASSET_ROOT + '/PREDICTIONS';
var ASSET_MODELS      = src.ASSET_ROOT + '/MODELS';

// =============================================================================
// 1. MATRIZ DE TREINO E COVARIÁVEIS
// =============================================================================

var matrix = ee.FeatureCollection(MATRIX_ASSET);
print('[OK] Matriz:', MATRIX_ASSET);
matrix.size().evaluate(function (n) { print('[OK] Amostras:', n); });

// Covariáveis = todas as propriedades da matriz menos metadados/alvos GEDI.
// Assim novas bandas do stack entram automaticamente na próxima versão.
var EXCLUDE_PROPS = [
  'agbd', 'agbd_se', 'agbd_pi_lower', 'agbd_pi_upper',
  'sensitivity', 'beam', 'selected_algorithm', 'pft_class',
  'region_class', 'landsat_treecover', 'shot_number', 'delta_time',
  'lon_lowestmode', 'lat_lowestmode'
];
var inputProps = ee.Feature(matrix.first()).propertyNames().removeAll(EXCLUDE_PROPS);
print('[OK] Covariáveis:', inputProps);

// =============================================================================
// 2. TREINO DO MODELO (MODEL_TYPE: rf | gbm | svm)
// =============================================================================

// Constrói o classificador GEE correspondente a MODEL_TYPE (regressão)
function buildModel() {
  if (MODEL_TYPE === 'rf') {
    return ee.Classifier.smileRandomForest(MODEL_PARAMS.rf).setOutputMode('REGRESSION');
  }
  if (MODEL_TYPE === 'gbm') {
    return ee.Classifier.smileGradientTreeBoost(MODEL_PARAMS.gbm).setOutputMode('REGRESSION');
  }
  if (MODEL_TYPE === 'svm') {
    return ee.Classifier.libsvm(MODEL_PARAMS.svm).setOutputMode('REGRESSION');
  }
  throw new Error('MODEL_TYPE inválido: ' + MODEL_TYPE + ' (use rf, gbm ou svm)');
}

var model = buildModel().train({
  features: matrix,
  classProperty: TARGET,
  inputProperties: inputProps
});
print('[OK] Modelo treinado:', MODEL_TYPE, '· subversão:', SUBVERSION);

// Importância das variáveis (diagnóstico não-bloqueante; SVM não expõe importance)
if (MODEL_TYPE !== 'svm') {
  model.explain().evaluate(function (exp) {
    var imp = exp.importance;
    var pairs = Object.keys(imp).map(function (k) { return [imp[k], k]; });
    pairs.sort(function (a, b) { return b[0] - a[0]; });
    print('[OK] Importância (top 15):',
      pairs.slice(0, 15).map(function (p) { return p[1] + ': ' + p[0].toFixed(2); }));
  });
}

// Toggle opcional — salvar modelo como asset (ver README v01)
if (SAVE_MODEL_TO_ASSET) {
  src.ensureFolder(ASSET_MODELS);
  Export.classifier.toAsset({
    classifier: model,
    description: 'WS_CARBONO_toAsset-' + MODEL_TYPE + '_agc_' + SUFFIX,
    assetId: ASSET_MODELS + '/' + MODEL_TYPE + '_agc_' + SUFFIX
  });
  print('[EXPORT] Modelo:', ASSET_MODELS + '/' + MODEL_TYPE + '_agc_' + SUFFIX);
}

// =============================================================================
// 3. PREDIÇÃO ESPAÇO-TEMPORAL (multibanda prediction_{ano})
// =============================================================================

// AOI padrão: bioma completo (mesma fonte do diagnóstico e do stack)
var biomeFc = ee.FeatureCollection(src.BIOME_FC)
  .filter(ee.Filter.eq(src.BIOME_PROP, src.BIOME_NAME));
var aoiBounds = biomeFc.geometry().bounds();

var predictions = ee.Image().select([]);
YEARS.forEach(function (year) {
  var stackYear = src.buildCovariatesStack(aoiBounds, year);
  var predYear = stackYear
    .classify(model)
    .rename('prediction_' + year)
    .round()
    .int16();
  predictions = predictions.addBands(predYear);
});
predictions = predictions.clip(aoiBounds);

predictions.bandNames().evaluate(function (bands) {
  print('[OK] Predições:', bands.length, 'anos —', bands);
});

// =============================================================================
// 4. EXPORTS — DRIVE (GeoTIFF) + PREDICTIONS (Asset, toggle)
// =============================================================================

if (EXPORT_TO_ASSET) {
  src.ensureFolder(ASSET_PREDICTIONS);

  Export.image.toAsset({
    image: predictions,
    description: 'WS_CARBONO_toAsset-agc_pred_' + SUFFIX,
    assetId: ASSET_PREDICTIONS + '/agc_pred_' + SUFFIX,
    region: aoiBounds,
    scale: src.SCALE,
    maxPixels: 1e13,
    pyramidingPolicy: { '.default': 'mean' }
  });
  print('[EXPORT] Asset:', ASSET_PREDICTIONS + '/agc_pred_' + SUFFIX);
}

if (EXPORT_TO_DRIVE) {
  Export.image.toDrive({
    image: predictions,
    description: 'WS_CARBONO_toDrive-agc_pred_' + SUFFIX,
    folder: EXPORT_FOLDER,
    fileNamePrefix: 'agc_pred_' + SUFFIX,
    region: aoiBounds,
    scale: src.SCALE,
    maxPixels: 1e13
  });
  print('[EXPORT] Drive:', 'agc_pred_' + SUFFIX + '.tif');
}

print('MAPBIOMAS-CARBONO · v01 · 3_modelling · Pantanal · modelo ' + MODEL_TYPE
  + ' · subversão ' + SUBVERSION + ' · anos ' + YEARS.join(','));
