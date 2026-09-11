/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_1_TOASSET_SAMPLES_TREINO
 * ---------------------------------------------------------------------------
 * Exporta as AMOSTRAS de TREINO (footprints filtrados pela máscara de treino
 * = LULC florestal + palsar_nodata) para um ASSET — entrada do gate offline
 * (2_3_gcn) e do treino (3_).
 *
 * O script lê ano e iteração/lote de TRAIN_YEARS (0_contract.js); basta rodar
 * uma vez por ano. Os lotes de uma mesma rodada diferenciam-se por
 * SAMPLES/forest_footprint_v08_<ANO> (sobrescreve) ou _<ANO>_<LOTE>.
 * A amostragem preserva agbd_se etc. (SAMPLE_PROPS) para o peso 1/agbd_se².
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

// TRAIN_YEARS (0_contract.js): ano do lote atual; LOTE opcional p/ reexportar
var N = c.YEAR;        // ano do lote atual (ex.: 2023)
var LOTE = 1;          // setor/reesporte: 1 salva forest_footprint_v08_<ANO>; >1 anexa _<LOTE>

var raw = ee.FeatureCollection(c.FOOTPRINT_ASSET);
var labeled = src.applyTrainingMask(raw, N);
var nome = 'forest_footprint_v08_' + N + (LOTE > 1 ? '_' + LOTE : '');
var asset = c.ASSET_ROOT + '/SAMPLES/' + nome;

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_1_toAsset_samples_treino');
print('[MASCARA DE TREINO] LULC', c.FOREST_CLASSES,
  '+ extras', c.TRAINING_MASKS.map(function (m) { return m.name; }));
labeled.size().evaluate(function (n) { print('[AMOSTRAS]', n); });
src.ensureFolder(c.ASSET_ROOT + '/SAMPLES');
Export.table.toAsset({
  collection: labeled,
  description: 'WS_CARBONO_toAsset-' + nome,
  assetId: asset
});
print('[TASK]', asset);