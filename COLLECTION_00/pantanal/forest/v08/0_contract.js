/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Contrato (autossuficiente)
 * ===========================================================================
 * RESUMO
 *   Estimativa de AGBD (biomassa acima do solo, t/ha) para florestas da Bacia
 *   do Alto Paraguai (BAP = Pantanal + Planalto), a partir de amostras GEDI ou
 *   IFN e um stack de 36 covariáveis, com ensemble RF (N=5). Este arquivo é a
 *   ÚNICA fonte de verdade do pipeline: schema, grade, domínio, fonte de
 *   amostra, filtro de treino e hiperparâmetros.
 *
 * JUSTIFICATIVA (por que assim)
 *   - Modelo GLOBAL único (não por célula): evita descontinuidades de borda;
 *     a matriz agrega todas as células.
 *   - PALSAR como mosaico GLOBAL por mediana (não `.first()` por célula):
 *     elimina os platôs alinhados à grade que causavam excesso de carbono.
 *   - Filtro de treino no 2_2 (floresta + notNull): a máscara de imagem
 *     `palsar_nodata` era redundante com o notNull e cara — foi removida.
 *   - Grade em bbox (não CIM): mantém compatibilidade com v03–v07.
 *   - Unidade: sempre TONELADA (t/ha); nunca megagrama.
 *
 * DELTA vs v07
 *   + PALSAR global por mediana; + domínio BAP; + multi-fonte (GEDI/IFN);
 *   + filtro de treino no 2_2; + caminhos próprios (V08_GEDI/V08_IFN).
 *   Modelo (champion/ensemble) idêntico à v07; SEM log-target (linear).
 *
 * POLÍTICA DE CONTRATOS (set/2026): cada versão escreve TODOS os termos
 * próprios — sem require de versão anterior. O bloco comum (schema + grade)
 * é a referência da v03 copiada literalmente.
 ******************************************************************************/

exports.VERSION = 'v08';

// ===========================================================================
// Bloco 1 — SCHEMA de covariáveis [ref: v03/0_contract.js]
//   36 bandas = 24 HLS (6 índices × P10/P50/P90/AMP) + 4 PALSAR + 2 HAND
//   + 5 ERA5/CWD + 1 MapBiomas C11. Contínuas em Float32; categorias Uint8.
// ===========================================================================
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
exports.TARGET = 'agbd';   // alvo do modelo (t/ha); carbono derivado no stats

// ===========================================================================
// Bloco 2 — GRADE de células espaciais (bbox) [ref: v03]
//   Grade regular em graus: 4×4 tiles (Y_EDGES × X_EDGES) subdivididos em
//   `split²` células. `makeTiles` deriva o id do índice (nº de colunas =
//   X_EDGES.length-1) — não há mais magic `*4`.
// ===========================================================================
exports.DOMAIN_BBOX = [
  -60.678789762675464, -22.813804973745906,
  -52.548906950175464, -12.958681301038263
];

exports.X_EDGES = [-60.678789762675464, -58.646318, -56.613847,
  -54.581376, -52.548906950175464];
exports.Y_EDGES = [-22.813804973745906, -20.350024, -17.886244,
  -15.422463, -12.958681301038263];

exports.makeTiles = function () {
  var ncols = exports.X_EDGES.length - 1;
  var tiles = [];
  for (var y = 0; y < exports.Y_EDGES.length - 1; y++) {
    for (var x = 0; x < ncols; x++) {
      tiles.push({
        id: 'tile' + ('00' + (y * ncols + x + 1)).slice(-2),
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

// ===========================================================================
// Bloco 3 — ANO de referência e de treino
// ===========================================================================
exports.YEAR = 2023;
exports.YEARS = [2023];
exports.TRAIN_YEARS = [2023];

// ===========================================================================
// Bloco 4 — FILTRO de TREINO [aplicado no 2_2, por célula]
//   · floresta: mapbiomas_lulc ∈ FOREST_CLASSES;
//   · válidos:  notNull(FEATURE_BANDS) (cobre nodata do PALSAR etc.).
//   A predição NÃO é mascarada por LULC.
// ===========================================================================
exports.FOREST_CLASSES = [3, 4, 6, 7, 49];

// ===========================================================================
// Bloco 5 — DOMÍNIO geoespacial (BAP) + LULC
//   Domínio = Bacia do Alto Paraguai (Pantanal + Planalto): asset de 3
//   polígonos ('Pantanal','Planalto','BAP') unidos numa feição única.
// ===========================================================================
exports.BAP_ASSET = 'projects/ee-arcplan/assets/bap_pantanal_planalto';
exports.DOMAIN_PROP = 'domain';
exports.DOMAIN_NAME = 'BAP';
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.SCALE = 30;

// Grade de SAÍDA comum (D1): todos os exports de célula usam o MESMO crs e
// crsTransform → pixels alinhados entre células (sem emenda de grade).
// Origem = canto superior esquerdo do DOMAIN_BBOX; passo ~30 m em graus.
exports.CRS = 'EPSG:4326';
exports.CRS_TRANSFORM = [
  0.00026949458523585647, 0, -60.678789762675464,
  0, -0.00026949458523585647, -12.958681301038263
];

// ===========================================================================
// Bloco 6 — FONTE DE AMOSTRA [multi-fonte: gedi | ifn]
//   O pipeline é ÚNICO e parametrizado por `SOURCE`. Cada fonte tem raiz de
//   assets própria (sub-versão) e schema de amostra próprio; covariáveis e
//   hiperparâmetros são idênticos entre as variantes (comparação direta).
//     · gedi — footprints GEDI L4A v2.1 na BAP (footprint_bap_<ano>),
//              alvo `agbd` (t/ha), peso w = 1/agbd_se²;
//     · ifn  — parcelas IFN_2026_BR_PLOTS-v13 na BAP (floresta, centroide),
//              alvo AGB_Mg_ha (t/ha) normalizado para `agbd`, sem agbd_se.
//   Para rodar a variante IFN: trocar SOURCE para 'ifn'.
// ===========================================================================
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

// ===========================================================================
// Bloco 7 — CHAMPION [gate v07, 10/09/2026; SEM log-target]
//   Regularização direta do RF. RMSE ~52.2 t/ha (sweep offline).
// ===========================================================================
exports.MIN_LEAF_POP = 10;        // minLeafPopulation (regularização)
exports.VARIABLES_PER_SPLIT = 6;  // ~sqrt(36) bandas por split

// ===========================================================================
// Bloco 8 — ENSEMBLE [resposta D15-17]
//   N=5 RF — seeds distintas + ~80% das bandas + ~80% das linhas. Combinação
//   por MEDIANA (predição) e stdDev (incerteza).
// ===========================================================================
exports.ENSEMBLE = {
  NUM_MEMBERS: 5,
  SEED_BASE: 2021,
  BAND_FRACTION: 0.8,
  TRAIN_FRACTION: 0.8
};
