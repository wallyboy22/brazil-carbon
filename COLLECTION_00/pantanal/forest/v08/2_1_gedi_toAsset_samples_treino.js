/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_1_GEDI_TOASSET_SAMPLES_TREINO
 * ---------------------------------------------------------------------------
 * Exporta os FOOTPRINTS de treino NORMALIZADOS da fonte **GEDI** (merge dos
 * anos BAP) como UMA TASK POR RECORTE da grade (`TILE_SPLIT`).
 *
 * Fonte FIXA em GEDI (não depende de `c.SOURCE`). Para a variante IFN use
 * `2_1_ifn_toAsset_samples_treino.js`. Pré-requisito: `2_0_gedi_export_footprint.js`.
 * SEM mascaramento aqui: o filtro florestal (mapbiomas_lulc ∈ FOREST_CLASSES)
 * e o descarte de nodata (notNull) são aplicados no 2_2, por célula.
 * GEDI: preserva agbd_se (peso 1/agbd_se²).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

var SOURCE = 'gedi';   // script fixo nesta fonte
var S = c.SOURCES[SOURCE];
var N = c.YEAR;        // ano do lote atual (ex.: 2023)

// Subdivisão da grade: 1 → 16 tiles · 2 → 64 · 4 → 256 recortes (1 task cada).
var TILE_SPLIT = 2;

var raw = src.getFootprints(SOURCE);
var props = src.getSampleProps(SOURCE);   // só o que o 2_2 precisa
var baseName = 'forest_footprint_' + SOURCE + '_' + N;
var root = S.assetRoot + '/SAMPLES';
var cells = c.makeCellDefinitions(TILE_SPLIT);

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_1_gedi_toAsset_samples_treino');
print('[FONTE]', SOURCE, '·', S.label, '· raiz', S.assetRoot);
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
