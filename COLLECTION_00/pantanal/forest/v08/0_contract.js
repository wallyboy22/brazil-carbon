/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Contrato (v08)
 * ---------------------------------------------------------------------------
 * Estratégia v08 (fix do artefato de excesso de carbono pós-v07):
 *   - PALSAR-2 resconstruído como mosaico GLOBAL determinístico (não célula a
 *     célula): `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH` combinado por MEDIANA sobre
 *     as observações válidas do ano, com DN <= 0 mascarado como nodata
 *   - máscara de nodata do PALSAR registrada em TRAINING_MASKS (exclui
 *     footprints em áreas sem dado SAR válido do treino)
 *   - demais decisões herdadas INTEGRALMENTE da v07 (champion + ensemble):
 *     minLeafPopulation 10, variablesPerSplit 6, linear, N=5 membros,
 *     máscara LULC (3,4,6,7,49) só no treino, predição não mascarada
 *   - stats/QA herdados (compareAll agora cobre V03–V08)
 ******************************************************************************/
var base = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_contract.js');

exports.VERSION = 'v08';

// Bandas alvo/covariáveis e grade herdadas da cadeia v07→v06→v05→v04→v03
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
exports.TRAIN_YEARS = [2023];

// ---- Máscara de TREINO ----
// v08 herda LULC (3,4,6,7,49) + acrescenta palsar_nodata (fix da v08).
exports.MASK_MODE = 'training_only';
exports.FOREST_CLASSES = [3, 4, 6, 7, 49];
exports.TRAINING_MASKS = base.TRAINING_MASKS.concat([
  // Exclui do treino footprints onde o mosaico PALSAR global é nodata
  // (construção em 0_covariate_source.js, função buildPalsarGlobal).
  { name: 'palsar_nodata', apply: 'training' }
]);

exports.BIOME_FC = base.BIOME_FC;
exports.BIOME_PROP = base.BIOME_PROP;
exports.BIOME_NAME = base.BIOME_NAME;
exports.LULC_ASSET = base.LULC_ASSET;
exports.SCALE = base.SCALE;
exports.FOOTPRINT_ASSET = base.FOOTPRINT_ASSET;
exports.ASSET_ROOT =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V08';

// =========================================================================
// CHAMPION — herdado da v07 (gate 10/09/2026). A v08 altera COVARIADAS
// (PALSAR global) e TREINO (máscara palsar_nodata), NÃO a parametrização.
// Se o gate offline da v08 indicar revisão, atualizar aqui após 2_3_gcn.
// =========================================================================
exports.MIN_LEAF_POP = base.MIN_LEAF_POP;        // 10 (champion v07)
exports.VARIABLES_PER_SPLIT = base.VARIABLES_PER_SPLIT;  // 6
exports.LOG_TARGET = base.LOG_TARGET;            // false (linear)
exports.SMEAR_FACTOR = base.SMEAR_FACTOR;
exports.LOG_OFFSET = base.LOG_OFFSET;

// =========================================================================
// ENSEMBLE (herdado da v07)
// =========================================================================
exports.ENSEMBLE = {
  NUM_MEMBERS: 5,
  SEED_BASE: 2021,
  BAND_FRACTION: 0.8,
  TRAIN_FRACTION: 0.8
};

// Células de auditoria / smoke test (F25). Preencher com ids reais da grade
// após diagnóstico (0_diagnose_tiles.js) — ver também 4_spatial_prediction.
exports.SMOKE_CELLS = [];