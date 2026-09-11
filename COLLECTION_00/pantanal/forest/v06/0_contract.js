/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v06 · Contrato (autossuficiente)
 * ---------------------------------------------------------------------------
 * Política de contratos (decidida em set/2026): cada versão escreve TODOS os
 * termos próprios — sem require de versão anterior. O bloco comum (schema de
 * bandas + grade) é a referência da v03 (0_contract.js) copiada literalmente;
 * o contexto geoespacial, da cadeia iniciada na v06 (coincide com v03 para
 * o bioma/grade, mas é reafirmado aqui enquanto contrato próprio da v06).
 *
 * Delta vs v05:
 *   + contexto geoespacial explícito (BIOME_*, LULC_ASSET, SCALE,
 *     FOOTPRINT_ASSET);
 *   + MASK_MODE = 'prediction_year' — a v06 mascara a PREDIÇÃO pelo ano.
 *     (A v07 muda para 'training_only': LULC passa a filtrar só o treino.
 *     NÃO reutilizar a v06 como referência de máscara.)
 *   + caminhos próprios (ASSET_ROOT V06).
 ******************************************************************************/

exports.VERSION = 'v06';

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
// Bloco 3 — Ano de referência [definido v06]
// =========================================================================
exports.YEAR = 2023;
exports.YEARS = [2023];

// =========================================================================
// Bloco 4 — Máscara da PREDIÇÃO [definido v06; evolução v07]
// IMPORTANTE: MASK_MODE mudou na v07 para 'training_only'. Este valor só é
// válido estritamente para a v06.
// =========================================================================
exports.MASK_MODE = 'prediction_year';
exports.FOREST_CLASSES = [3, 4, 6, 7, 49];

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
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V06';