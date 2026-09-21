/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Check do footprint de entrada
 * ---------------------------------------------------------------------------
 * Conta raw vs training-mask (LULC 3,4,6,7,49 + palsar_nodata da v08).
 * Somente as amostras da máscara de treino seguem para a matriz (2_2).
 * A máscara palsar_nodata exclui footprints onde o mosaico PALSAR global é
 * nodata (fix da v08).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var raw = src.getFootprints();
var labeled = src.applyTrainingMask(raw, c.YEAR);

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_0_check_footprint');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
raw.size().evaluate(function (n) { print('[RAW]', n); });
labeled.size().evaluate(function (n) { print('[TREINO (mask C11 + palsar)]', n); });
if (c.SOURCE === 'gedi') {
  labeled.distinct('pft_class').aggregate_array('pft_class')
    .evaluate(function (p) { print('[PFT]', p); });
}