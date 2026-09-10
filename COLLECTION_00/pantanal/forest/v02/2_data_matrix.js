/******************************************************************************
 * MAPBIOMAS-CARBONO — Coleção 0 · PANTANAL · v02 · Matriz de treino (AGC)
 * ---------------------------------------------------------------------------
 * Subetapa 2.1. Processa o footprint validado por 2_0_check_footprint em tiles
 * espaciais. Cada tile monta apenas
 * o stack da sua área, amostra lotes pequenos e exporta Assets independentes.
 * Isso evita tanto geometrias nulas quanto o grafo global de toList(total).
 ******************************************************************************/

var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v02/0_covariate_source.js');

// =============================================================================
// CONFIG
// =============================================================================

var YEAR = 2023;
var VERSION = 'v02';
var SCALE = src.SCALE;
var ASSET_BATCH_SIZE = 500;
var TILE_SCALE = 16;
var EXPORT_FOLDER = 'GEE_Exports_AGC-v02';

var ASSET_SAMPLES = src.ASSET_ROOT + '/SAMPLES';
var ASSET_MATRIX = src.ASSET_ROOT + '/MATRIX';
var FOOTPRINT_ASSET = ASSET_SAMPLES + '/footprint_pantanal_' + YEAR;

var EXPORT_TO_DRIVE = false;
var EXPORT_TO_ASSET = true;
var EXPORT_SAMPLES = true;

// O Pantanal é dividido em 4 x 4 tiles. Reduza ASSET_BATCH_SIZE se necessário.
var X_EDGES = [-60.678789762675464, -58.646318, -56.613847,
  -54.581376, -52.548906950175464];
var Y_EDGES = [-22.813804973745906, -20.350024, -17.886244,
  -15.422463, -12.958681301038263];

// =============================================================================
// TILES E FOOTPRINT EXISTENTE
// =============================================================================

var footprints = ee.FeatureCollection(FOOTPRINT_ASSET);
var tileDefinitions = [];
for (var y = 0; y < Y_EDGES.length - 1; y++) {
  for (var x = 0; x < X_EDGES.length - 1; x++) {
    tileDefinitions.push({
      id: 'tile' + ('00' + (y * 4 + x + 1)).slice(-2),
      bbox: [X_EDGES[x], Y_EDGES[y], X_EDGES[x + 1], Y_EDGES[y + 1]]
    });
  }
}

function pad3(n) { return ('000' + n).slice(-3); }

function processTile(tileDef) {
  var tile = ee.Geometry.BBox(
    tileDef.bbox[0], tileDef.bbox[1], tileDef.bbox[2], tileDef.bbox[3]);
  var tileFootprints = footprints.filterBounds(tile);

  tileFootprints.size().evaluate(function (total) {
    if (total === 0) {
      print('[AVISO]', tileDef.id, 'sem footprints — pulando.');
      return;
    }
    print('[OK]', tileDef.id, '· footprints:', total);
    createTileExports(tileDef, tile, tileFootprints, total);
  });
}

function createTileExports(tileDef, tile, tileFootprints, total) {
  print('[AGUARDE]', tileDef.id,
    'calculando stack e preparando os exports.');
  print('[AGUARDE] As tasks de', tileDef.id,
    'aparecerão em alguns segundos ou minutos.');

  var stack = src.buildCovariatesStack(tile, YEAR);
  var nBatches = Math.ceil(total / ASSET_BATCH_SIZE);
  var batchCount = 0;

  for (var b = 0; b < nBatches; b++) {
    var offset = b * ASSET_BATCH_SIZE;
    var size = Math.min(ASSET_BATCH_SIZE, total - offset);

    // Pagina apenas o tile atual, nunca a coleção completa do Pantanal.
    var fcBatch = ee.FeatureCollection(tileFootprints.toList(size, offset));
    var sampledBatch = stack.sampleRegions({
      collection: fcBatch,
      properties: src.SAMPLE_PROPS,
      scale: SCALE,
      geometries: true,
      tileScale: TILE_SCALE
    });
    var name = 'agc_matrix_' + VERSION + '_pantanal_' + tileDef.id
      + '_batch' + pad3(b + 1);

    if (EXPORT_TO_ASSET) {
      Export.table.toAsset({
        collection: sampledBatch,
        description: 'WS_CARBONO_toAsset-' + name,
        assetId: ASSET_MATRIX + '/' + name
      });
      print('[EXPORT] Asset:', ASSET_MATRIX + '/' + name,
        '· amostras máximas:', size);
      batchCount++;
    }

    if (EXPORT_TO_DRIVE) {
      Export.table.toDrive({
        collection: sampledBatch,
        description: 'WS_CARBONO_toDrive-' + name,
        folder: EXPORT_FOLDER,
        fileNamePrefix: name,
        fileFormat: 'CSV'
      });
      print('[EXPORT] Drive:', name + '.csv');
    }
  }
  print('[FIM]', tileDef.id, '· tasks de Asset:', batchCount);
}

print('MAPBIOMAS-CARBONO · v02 · 2_data_matrix · Pantanal · ano ' + YEAR);
print('[INFO] Footprints de entrada:', FOOTPRINT_ASSET);
print('[INFO] Entrada validada previamente por 2_0_check_footprint.');
print('[INFO] Tiles:', tileDefinitions.length,
  '· batch máximo:', ASSET_BATCH_SIZE, '· tileScale:', TILE_SCALE);

if (EXPORT_TO_ASSET) src.ensureFolder(ASSET_MATRIX);
tileDefinitions.forEach(processTile);
