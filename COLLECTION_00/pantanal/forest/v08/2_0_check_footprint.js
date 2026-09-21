/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Check do footprint de entrada
 * ---------------------------------------------------------------------------
 * Conta os footprints crus (getFootprints) da fonte ativa. O filtro de treino
 * (floresta mapbiomas_lulc ∈ {3,4,6,7,49} + notNull) é aplicado no 2_2, por
 * célula — não há mais máscara de imagem aqui.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var raw = src.getFootprints();

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_0_check_footprint');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
print('[FILTRO] floresta (' + c.FOREST_CLASSES + ') + notNull → no 2_2 (por célula)');
raw.size().evaluate(
  function (n) { print('[RAW]', n); },
  function (e) { print('[ERRO RAW]', e); });
if (c.SOURCE === 'gedi') {
  raw.distinct('pft_class').aggregate_array('pft_class')
    .evaluate(
      function (p) { print('[PFT]', p); },
      function (e) { print('[ERRO PFT]', e); });
}
