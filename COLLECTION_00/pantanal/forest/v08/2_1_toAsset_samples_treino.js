/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_1_TOASSET_SAMPLES_TREINO
 * ---------------------------------------------------------------------------
 * Exporta os FOOTPRINTS de treino NORMALIZADOS (GEDI: merge dos anos; IFN:
 * centroide + AGB_Mg_ha→agbd) como UMA TASK POR RECORTE da grade (`TILE_SPLIT`).
 *
 * SEM mascaramento aqui: o filtro florestal (mapbiomas_lulc ∈ FOREST_CLASSES)
 * e o descarte de nodata (notNull) são aplicados no 2_2, por célula. Isso
 * elimina a máscara `palsar_nodata` (redundante e cara) e deixa o 2_1 leve.
 *
 * GEDI: preserva agbd_se (peso 1/agbd_se²); IFN: sem agbd_se (w = 1).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

var N = c.YEAR;   // ano do lote atual (ex.: 2023)

// Subdivisão da grade: 1 → 16 tiles · 2 → 64 · 4 → 256 recortes (1 task cada).
var TILE_SPLIT = 2;

var raw = src.getFootprints();
var props = c.SOURCE_CFG.sampleProps;   // só o que o 2_2 precisa (enxuga o export)
var baseName = 'forest_footprint_' + c.SOURCE + '_' + N;
var root = c.ASSET_ROOT + '/SAMPLES';
var cells = c.makeCellDefinitions(TILE_SPLIT);

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_1_toAsset_samples_treino');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
print('[FILTRO] floresta (mapbiomas_lulc ∈ ' + c.FOREST_CLASSES +
  ') e notNull → aplicados no 2_2');
print('[TILE_SPLIT]', TILE_SPLIT, '→', cells.length, 'recortes (tasks)');
src.ensureFolder(root);

cells.forEach(function (cell) {
  var g = ee.Geometry.BBox(cell.bbox[0], cell.bbox[1], cell.bbox[2], cell.bbox[3]);
  var fc = raw.filterBounds(g).select(props);
  var name = baseName + '_' + cell.id;
  Export.table.toAsset({
    collection: fc,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: root + '/' + name
  });
  print('[TASK]', root + '/' + name);
});
print('[FIM]', cells.length, 'tasks agendadas · aguarde antes do 2_2.');
