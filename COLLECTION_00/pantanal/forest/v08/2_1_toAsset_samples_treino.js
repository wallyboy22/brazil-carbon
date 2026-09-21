/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_1_TOASSET_SAMPLES_TREINO
 * ---------------------------------------------------------------------------
 * Exporta as AMOSTRAS de TREINO (footprints filtrados pela máscara de treino
 * = LULC florestal + palsar_nodata) como UMA TASK POR RECORTE da grade
 * (`TILE_SPLIT`). Cada task é pequena e roda em paralelo, evitando o
 * "Image.reduceRegions: Computed value is too large" da BAP multi-ano
 * (~2,3M pegadas). O 2_2 mescla os recortes por prefixo.
 *
 * GEDI: preserva agbd_se (peso 1/agbd_se²); IFN: sem agbd_se (w = 1).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

var N = c.YEAR;   // ano do lote atual (ex.: 2023)

// Subdivisão da grade: 1 → 16 tiles · 2 → 64 · 4 → 256 recortes (1 task cada).
// Aumentar se algum recorte ainda estourar o limite do reduceRegions.
var TILE_SPLIT = 2;

var raw = src.getFootprints();
var baseName = 'forest_footprint_' + c.SOURCE + '_' + N;
var root = c.ASSET_ROOT + '/SAMPLES';
var cells = c.makeCellDefinitions(TILE_SPLIT);

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_1_toAsset_samples_treino');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
print('[MASCARA DE TREINO] LULC', c.FOREST_CLASSES,
  '+ extras', c.TRAINING_MASKS.map(function (m) { return m.name; }));
print('[TILE_SPLIT]', TILE_SPLIT, '→', cells.length, 'recortes (tasks)');
src.ensureFolder(root);

cells.forEach(function (cell) {
  var g = ee.Geometry.BBox(cell.bbox[0], cell.bbox[1], cell.bbox[2], cell.bbox[3]);
  var fc = src.applyTrainingMask(raw.filterBounds(g), N);
  var name = baseName + '_' + cell.id;
  Export.table.toAsset({
    collection: fc,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: root + '/' + name
  });
  print('[TASK]', root + '/' + name);
});
print('[FIM]', cells.length, 'tasks agendadas · aguarde antes do 2_2.');
