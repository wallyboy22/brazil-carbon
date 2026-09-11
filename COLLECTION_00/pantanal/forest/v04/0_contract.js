/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v04 · Contrato (autossuficiente)
 * ---------------------------------------------------------------------------
 * Política de contratos (decidida em set/2026): cada versão escreve TODOS os
 * termos próprios — sem require de versão anterior. O bloco comum (schema de
 * bandas + grade) é a referência da v03 (0_contract.js) copiada literalmente.
 *
 * Delta vs v03:
 *   + cache persistido de covariáveis (INPUT_MATRIX_ROOT lê os assets V03);
 *   + caminhos próprios (ASSET_ROOT V04, FOOTPRINT_ASSET).
 * Reconciliação para a cadeia: PANTANAL_BBOX passa a constar em TODAS as
 * versões autossuficientes (antes existia só até a v04).
 ******************************************************************************/

exports.VERSION = 'v04';

// =========================================================================
// Bloco 1 — Schema de covariáveis [definido v03; ref: v03/0_contract.js]
// Bandas contínuas em Float32; classes/códigos em Uint8. Não usar
// propertyNames() como schema.
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
// Bloco 3 — Caminhos de assets [definido v04]
// =========================================================================
exports.ASSET_ROOT =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V04';
exports.INPUT_MATRIX_ROOT =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V03/MATRIX';
exports.FOOTPRINT_ASSET =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/SAMPLES/footprint_pantanal_2023';