/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Contrato (autossuficiente)
 * ---------------------------------------------------------------------------
 * Política de contratos (decidida em set/2026): cada versão escreve TODOS os
 * termos próprios — sem require de versão anterior. O bloco comum (schema de
 * bandas + grade) é a referência da v03 (0_contract.js) copiada literalmente;
 * o contexto geoespacial vem da cadeia (v06→v03), mas é reafirmado aqui como
 * contrato próprio da v07.
 *
 * Delta vs v06:
 *   + MASK_MODE 'prediction_year' → 'training_only' (decisão estratégica: a
 *     máscara florestal LULC deixa de LIMITAR a predição e passa a FILTRAR
 *     somente as amostras de treino; a saída cobre o Pantanal inteiro);
 *   + TRAIN_YEARS e TRAINING_MASKS (lista extensível de máscaras de treino);
 *   + CHAMPION (regularização minLeafPopulation 10, linear) e ENSEMBLE N=5
 *     (respostas às decisões D15–D17 da consulta estratégica);
 *   + caminhos próprios (ASSET_ROOT V07).
 ******************************************************************************/

exports.VERSION = 'v07';

// =========================================================================
// Bloco 1 — Schema de covariáveis [definido v03; ref: v03/0_contract.js]
// =========================================================================
exports.CONTINUOUS_BANDS = [
  'NDVI_p10', 'EVI_p10', 'NDMI_p10', 'BAI_p10', 'SAVI_p10', 'BSI_p10',
  'NDVI_p50', 'EVI_p50', 'NDMI_p50', 'BAI_p50', 'SAVI_p50', 'BSI_p50',
  'NDVI_p90', 'EVI_p90', 'NDMI_p90', 'BAI_p90', 'SAVI_p90', 'BSI_p90',
  'NDVI_amp', 'EVI_amp', 'NDMI_amp', 'BAI_amp', 'SAVI_amp', 'BSI_amp',
  'HH_db', 'HV_db', 'HV_HH_ratio', 'RVI', 'HAND_m',
  'CWD_current', 'CWD_clim', 'CWD_3yr', 'Tmean_C', 'Prec_mm'
];

exports.CATEGORICAL_BANDS = ['geomorph_class', 'mapbiomas_lulc'];
exports.FEATURE_BANDS = exports.CONTINUOUS_BANDS.concat(exports.CATEGORICAL_BANDS);
exports.TARGET = 'agbd';

// =========================================================================
// Bloco 2 — Grade de células espaciais [definido v03]
// =========================================================================
exports.PANTANAL_BBOX = [
  -60.678789762675464, -22.813804973745906,
  -52.548906950175464, -12.958681301038263
];

exports.X_EDGES = [-60.678789762675464, -58.646318, -56.613847,
  -54.581376, -52.548906950175464];
exports.Y_EDGES = [-22.813804973745906, -20.350024, -17.886244,
  -15.422463, -12.958681301038263];

exports.makeTiles = function () {
  var tiles = [];
  for (var y = 0; y < exports.Y_EDGES.length - 1; y++) {
    for (var x = 0; x < exports.X_EDGES.length - 1; x++) {
      tiles.push({
        id: 'tile' + ('00' + (y * 4 + x + 1)).slice(-2),
        bbox: [exports.X_EDGES[x], exports.Y_EDGES[y],
          exports.X_EDGES[x + 1], exports.Y_EDGES[y + 1]]
      });
    }
  }
  return tiles;
};

exports.makeCellDefinitions = function (split) {
  var cells = [];
  exports.makeTiles().forEach(function (tile) {
    for (var i = 0; i < split; i++) {
      for (var j = 0; j < split; j++) {
        cells.push({
          id: tile.id + '_p' + ('00' + (i * split + j + 1)).slice(-2),
          bbox: [
            tile.bbox[0] + (tile.bbox[2] - tile.bbox[0]) * j / split,
            tile.bbox[1] + (tile.bbox[3] - tile.bbox[1]) * i / split,
            tile.bbox[0] + (tile.bbox[2] - tile.bbox[0]) * (j + 1) / split,
            tile.bbox[1] + (tile.bbox[3] - tile.bbox[1]) * (i + 1) / split
          ]
        });
      }
    }
  });
  return cells;
};

exports.makeCellFeatures = function (split) {
  return ee.FeatureCollection(exports.makeCellDefinitions(split).map(function (cell) {
    return ee.Feature(ee.Geometry.BBox(cell.bbox[0], cell.bbox[1],
      cell.bbox[2], cell.bbox[3]), { cell_id: cell.id });
  }));
};

// =========================================================================
// Bloco 3 — Ano de referência e de treino
// =========================================================================
exports.YEAR = 2023;
exports.YEARS = [2023];
// Anos de treino. Piloto: só 2023. Expandir para 2019-2022 exigirá footprints
// GEDI extraídos por ano (pipeline nova) + covariáveis por ano pareadas.
exports.TRAIN_YEARS = [2023];

// =========================================================================
// Bloco 4 — Máscara de TREINO [definido v07]
// A máscara florestal LULC FILTRA só as amostras de treino; a predição NÃO é
// mascarada — o LULC não limita o resultado (mudança vs v06 'prediction_year').
// =========================================================================
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

// =========================================================================
// Bloco 5 — Contexto geoespacial [definido v06; valores comuns à cadeia]
// =========================================================================
exports.BIOME_FC = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.BIOME_PROP = 'Bioma';
exports.BIOME_NAME = 'Pantanal';
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.SCALE = 30;
exports.FOOTPRINT_ASSET =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/SAMPLES/footprint_pantanal_2023';
exports.ASSET_ROOT =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V07';

// =========================================================================
// Bloco 6 — CHAMPION [definido v07, gate 10/09/2026]
// Preenchido a partir de 2_3_gcn/figures/champion.json (10/09/2026, gate
// revalidado SEM pesos). Resultado do gate offline: CV espacial, curva de
// aprendizado e varredura minLeafPopulation. Relatório completo em
// 2_3_gcn/figures/relatorio_recomendacoes.md. O contrato pré-champion está
// arquivado em archive_contracts/0_contract_v07_pre-champion.js.
// =========================================================================
exports.MIN_LEAF_POP = 10;        // champion: RMSE 52.21 Mg/ha (sweep best);
                                  // linear 52.26 < log 52.59
exports.VARIABLES_PER_SPLIT = 6;  // sqrt(n_features)=sqrt(38)=6.16 → 6
exports.LOG_TARGET = false;       // linear 52.26 < log 52.59 (champion)
exports.SMEAR_FACTOR = 1.0;       // fator de Duan; inerte com LOG_TARGET=false
                                  // (recalculado no 3_model_training p/ log)
exports.LOG_OFFSET = 1;           // 1 se target = ln(1+agbd), 0 se ln(agbd)

// =========================================================================
// Bloco 7 — ENSEMBLE [definido v07; resposta D15-17]
// N=5 RF — seeds + 80% bandas + 80% linhas.
// =========================================================================
exports.ENSEMBLE = {
  NUM_MEMBERS: 5,
  SEED_BASE: 2021,
  BAND_FRACTION: 0.8,
  TRAIN_FRACTION: 0.8
};

// =========================================================================
// Bloco 8 — Células de auditoria / smoke test (F25)
// Somente nelas as bandas membro do ensemble são preservadas no export
// (m1..mN) além de median/std. Preencher com ids reais da grade após primeira
// execução da predição.
// =========================================================================
exports.SMOKE_CELLS = [];