/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Contrato (v07)
 * ---------------------------------------------------------------------------
 * Estratégia v07 (decisões da consulta estratégica):
 *   - regularização direta via minLeafPopulation (varredura offline 5/10/20/30)
 *   - pesos de amostra 1/agbd_se² (erro publicado do GEDI)
 *   - ensemble de predições RF: N=5 membros (seeds + subamostragem de bandas e
 *     de treino), combinação por MEDIANA, incerteza por desvio padrão (stdDev)
 *   - máscara florestal LULC (classes 3,4,6,7,49) SÓ FILTRA AMOSTRAS DE TREINO;
 *     a saída da predição NÃO é mascarada por LULC
 *   - TRAINING_MASKS: lista extensível de máscaras independentes do LULC que
 *     restringem ainda mais as amostras que entram no treino
 *   - treino multi-ano preparado (TRAIN_YEARS); 2023 roda como piloto
 ******************************************************************************/
var base = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v06/0_contract.js');

exports.VERSION = 'v07';

// Bandas alvo/covariáveis e grade herdadas da cadeia v06→v05→v04→v03
exports.CONTINUOUS_BANDS = base.CONTINUOUS_BANDS;
exports.CATEGORICAL_BANDS = base.CATEGORICAL_BANDS;
exports.FEATURE_BANDS = base.FEATURE_BANDS;
exports.TARGET = base.TARGET;
exports.X_EDGES = base.X_EDGES;
exports.Y_EDGES = base.Y_EDGES;
exports.makeTiles = base.makeTiles;
exports.makeCellDefinitions = base.makeCellDefinitions;
exports.makeCellFeatures = base.makeCellFeatures;

exports.YEAR = 2023;
exports.YEARS = [2023];
// Anos de treino. Piloto: só 2023. Expandir para 2019-2022 exigirá footprints
// GEDI extraídos por ano (pipeline nova) + covariáveis por ano pareadas.
exports.TRAIN_YEARS = [2023];

// ---- Máscara de TREINO ----
// Mantém a classe 7 (Savana Alagada) para FILTRAR o que entra no treino.
// A predição NÃO é mascarada — o LULC não limita o resultado.
exports.MASK_MODE = 'training_only';
exports.FOREST_CLASSES = [3, 4, 6, 7, 49];
// Lista extensível de máscaras independentes do LULC que restringem amostras de
// treino. Cada item: { name, apply:'training' }. O construtor de cada máscara
// extra vive em 0_covariate_source.js (função buildExtraMask), com registry por
// name — só adicionar a entrada aqui e a função correspondente lá.
exports.TRAINING_MASKS = [
  { name: 'lulc_forest', classes: exports.FOREST_CLASSES, apply: 'training' }
  // Exemplo futuro:
  // { name: 'hidro_permanente', asset: 'projects/.../hidro', apply: 'training' },
  // { name: 'hand_dreno', max_hand: 5, apply: 'training' }
];

exports.BIOME_FC = base.BIOME_FC;
exports.BIOME_PROP = base.BIOME_PROP;
exports.BIOME_NAME = base.BIOME_NAME;
exports.LULC_ASSET = base.LULC_ASSET;
exports.SCALE = base.SCALE;
exports.FOOTPRINT_ASSET = base.FOOTPRINT_ASSET;
exports.ASSET_ROOT =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V07';

// =========================================================================
// CHAMPION — preencher manualmente a partir de 2_3_gcn/figures/champion.json
// (resultado do gate offline: CV espacial, curva de aprendizado e varredura
// minLeafPopulation). Atualizado a cada rodada do Colab.
// =========================================================================
exports.MIN_LEAF_POP = 10;        // varredura offline: 5 / 10 / 20 / 30
exports.VARIABLES_PER_SPLIT = 6;  // ~sqrt(36); testar 6-10 no gate
exports.LOG_TARGET = false;       // true se o champion usar ln(1+agbd)
exports.SMEAR_FACTOR = 1.0;       // fator de Duan (smearing) calculado offline
exports.LOG_OFFSET = 1;           // 1 se target = ln(1+agbd), 0 se ln(agbd)

// =========================================================================
// ENSEMBLE (resposta D15-17): N=5 RF — seeds + 80% bandas + 80% linhas
// =========================================================================
exports.ENSEMBLE = {
  NUM_MEMBERS: 5,
  SEED_BASE: 2021,
  BAND_FRACTION: 0.8,
  TRAIN_FRACTION: 0.8
};

// Células de auditoria / smoke test (F25). Somente nelas as bandas membro do
// ensemble são preservadas no export (m1..mN) além de median/std.
// Preencher com ids reais da grade após primeira execução da predição.
exports.SMOKE_CELLS = [];