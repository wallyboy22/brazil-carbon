/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_1_TOASSET_SAMPLES_TREINO
 * ---------------------------------------------------------------------------
 * Exporta as AMOSTRAS de TREINO (footprints filtrados pela máscara de treino
 * = LULC florestal + palsar_nodata) para um ASSET.
 *
 * A aplicação da máscara (`sampleRegions` → `reduceRegions`) é FATIADA por
 * recortes da grade (`CHUNK_SPLIT`): a BAP multi-ano tem ~2,3M pegadas e um
 * único reduceRegions estoura o limite ("Computed value is too large"). Os
 * recortes são mesclados num único export.
 *
 * GEDI: preserva agbd_se (peso 1/agbd_se²); IFN: sem agbd_se (w = 1).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

var N = c.YEAR;        // ano do lote atual (ex.: 2023)
var LOTE = 1;          // setor/reesporte: 1 salva forest_footprint_<SOURCE>_<ANO>; >1 anexa _<LOTE>

// Subdivisão da grade p/ fatiar o sampleRegions: 4 → 256 recortes.
// Aumentar se ainda estourar; 1 = sem fatiamento (não recomendado p/ BAP).
var CHUNK_SPLIT = 4;

var raw = src.getFootprints();
var chunks = c.makeCellDefinitions(CHUNK_SPLIT).map(function (cell) {
  var g = ee.Geometry.BBox(cell.bbox[0], cell.bbox[1], cell.bbox[2], cell.bbox[3]);
  return src.applyTrainingMask(raw.filterBounds(g), N);
});
var labeled = ee.FeatureCollection(chunks).flatten();

var nome = 'forest_footprint_' + c.SOURCE + '_' + N +
  (LOTE > 1 ? '_' + LOTE : '');
var asset = c.ASSET_ROOT + '/SAMPLES/' + nome;

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_1_toAsset_samples_treino');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
print('[MASCARA DE TREINO] LULC', c.FOREST_CLASSES,
  '+ extras', c.TRAINING_MASKS.map(function (m) { return m.name; }));
print('[CHUNK_SPLIT]', CHUNK_SPLIT, '→', chunks.length, 'recortes');
labeled.size().evaluate(
  function (n) { print('[AMOSTRAS]', n); },
  function (e) { print('[ERRO AMOSTRAS]', e); });
src.ensureFolder(c.ASSET_ROOT + '/SAMPLES');
Export.table.toAsset({
  collection: labeled,
  description: 'WS_CARBONO_toAsset-' + nome,
  assetId: asset
});
print('[TASK]', asset);
