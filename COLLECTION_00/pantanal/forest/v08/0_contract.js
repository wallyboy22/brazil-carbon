/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Contrato (autossuficiente)
 * ---------------------------------------------------------------------------
 * Política de contratos (decidida em set/2026): cada versão escreve TODOS os
 * termos próprios — sem require de versão anterior. O bloco comum (schema de
 * bandas + grade) é a referência da v03 (0_contract.js) copiada literalmente;
 * contexto geoespacial e parametrização vêm da cadeia v07→v06→v03, mas são
 * reafirmados aqui como contrato próprio da v08.
 *
 * Estratégia v08 (fix do artefato de excesso de carbono pós-v07):
 *   - PALSAR-2 reconstruído como mosaico GLOBAL determinístico (não célula a
 *     célula): `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH` combinado por MEDIANA sobre
 *     as observações válidas do ano, com DN <= 0 mascarado como nodata;
 *   - máscara de nodata do PALSAR registrada em TRAINING_MASKS (exclui do
 *     treino footprints em áreas sem dado SAR válido) — decisão v08;
 *   - demais decisões herdadas INTEGRALMENTE da v07 (champion + ensemble):
 *     minLeafPopulation 10, variablesPerSplit 6, linear, N=5 membros,
 *     máscara LULC (3,4,6,7,49) só no treino, predição não mascarada;
 *   - stats/QA herdados (comparativo entre versões montado offline no
 *     statistics_gcn, a partir dos stats_forest_* do GEE).
 *
 * Delta vs v07:
 *   + PALSAR global por mediana (0_covariate_source.js, buildPalsarGlobal);
 *   + TRAINING_MASKS += palsar_nodata (apply:'training');
 *   + domínio BAP (Bacia do Alto Paraguai) substitui o bioma Pantanal;
 *   + caminhos próprios (ASSET_ROOT V08).
 *   Parametrização do modelo NÃO mudou (champion/ensemble idênticos à v07).
 ******************************************************************************/

exports.VERSION = 'v08';

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
exports.TRAIN_YEARS = [2023];

// =========================================================================
// Bloco 4 — Máscara de TREINO [definido v07; evolução v08]
// A v08 herda LULC (3,4,6,7,49) filtering só o treino + acrescenta
// palsar_nodata (fix da v08: exclui footprints sem SAR válido).
// =========================================================================
exports.MASK_MODE = 'training_only';
exports.FOREST_CLASSES = [3, 4, 6, 7, 49];
exports.TRAINING_MASKS = [
  { name: 'lulc_forest', classes: exports.FOREST_CLASSES, apply: 'training' },
  // Exclui do treino footprints onde o mosaico PALSAR global é nodata
  // (construção em 0_covariate_source.js, função buildPalsarGlobal).
  { name: 'palsar_nodata', apply: 'training' }
];

// =========================================================================
// Bloco 5 — Contexto geoespacial [domínio BAP desde v08/BAP]
// O domínio deixou de ser o bioma Pantanal (IBGE) e passou a ser a Bacia do
// Alto Paraguai (BAP = Pantanal + Planalto): asset de 3 polígonos
// ('Pantanal', 'Planalto', 'BAP'), unidos numa feição única de domínio.
// =========================================================================
exports.BAP_ASSET = 'projects/ee-arcplan/assets/bap_pantanal_planalto';
exports.DOMAIN_PROP = 'domain';
exports.DOMAIN_NAME = 'BAP';
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.SCALE = 30;

// =========================================================================
// Bloco 5b — FONTE DE AMOSTRA [v08/BAP multi-fonte: gedi | ifn]
// O pipeline é ÚNICO e parametrizado por `SOURCE`. Cada fonte tem raiz de
// assets própria (sub-versão) e schema de amostra próprio; covariáveis e
// hiperparâmetros são idênticos entre as variantes (comparação direta).
//   · gedi — footprints GEDI L4A v2.1 sobre a BAP (footprint_bap_<ano>),
//            alvo `agbd` (t/ha), peso w = 1/agbd_se²;
//   · ifn  — parcelas IFN_2026_BR_PLOTS-v13 na BAP (floresta, centroide),
//            alvo AGB_Mg_ha (t/ha) normalizado para `agbd`, sem agbd_se.
// Para rodar a variante IFN: trocar SOURCE para 'ifn'.
// =========================================================================
var PANTANAL_FOREST = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/' +
  'COLLECTION_00/PANTANAL_FOREST';
var BAP_FOOTPRINT_YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

exports.SOURCE = 'gedi';   // 'gedi' | 'ifn'

exports.SOURCES = {
  gedi: {
    label: 'GEDI L4A v2.1 (footprints BAP)',
    assetRoot: PANTANAL_FOREST + '/V08_GEDI',
    footprintAssets: BAP_FOOTPRINT_YEARS.map(function (y) {
      return PANTANAL_FOREST + '/SAMPLES/footprint_bap_' + y;
    }),
    trainYears: [2023],
    target: 'agbd',
    targetProp: 'agbd',
    weightProp: 'agbd_se',
    sampleProps: ['agbd', 'agbd_se', 'pft_class', 'shot_number',
      'lon_lowestmode', 'lat_lowestmode'],
    pointGeometry: false
  },
  ifn: {
    label: 'IFN (IFN_2026_BR_PLOTS-v13)',
    assetRoot: PANTANAL_FOREST + '/V08_IFN',
    footprintAsset: 'projects/ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13',
    trainYears: [2023],
    target: 'agbd',
    targetProp: 'AGB_Mg_ha',
    weightProp: null,
    sampleProps: ['agbd', 'C_Mg_ha', 'n_ind', 'area_ha', 'bioma', 'fid',
      'UA', 'Subunidade', 'orientacao', 'mun'],
    pointGeometry: true
  }
};

exports.SOURCE_CFG = exports.SOURCES[exports.SOURCE];
exports.TRAIN_YEARS = exports.SOURCE_CFG.trainYears;
exports.ASSET_ROOT = exports.SOURCE_CFG.assetRoot;

// =========================================================================
// Bloco 6 — CHAMPION [definido v07 (gate 10/09/2026); idêntico na v08]
// A v08 altera COVARIADAS (PALSAR global) e TREINO (máscara palsar_nodata),
// NÃO a parametrização. Se o gate offline da v08 indicar revisão, atualizar
// aqui após 2_3_gcn.
// =========================================================================
exports.MIN_LEAF_POP = 10;        // champion v07: RMSE 52.21 t/ha (sweep best)
exports.VARIABLES_PER_SPLIT = 6;  // sqrt(n_features)=sqrt(38)=6.16 → 6
exports.LOG_TARGET = false;       // linear 52.26 < log 52.59 (champion v07)
exports.SMEAR_FACTOR = 1.0;       // fator de Duan; inerte com LOG_TARGET=false
exports.LOG_OFFSET = 1;           // 1 se target = ln(1+agbd), 0 se ln(agbd)

// =========================================================================
// Bloco 7 — ENSEMBLE [definido v07; resposta D15-17]
// N=5 RF — seeds + 80% bandas + 80% linhas. Idêntico à v07.
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
// (m1..mN) além de median/std. Preencher com ids reais da grade após o
// diagnóstico (0_diagnose_tiles.js) — ver também 4_spatial_prediction.
// =========================================================================
exports.SMOKE_CELLS = [];