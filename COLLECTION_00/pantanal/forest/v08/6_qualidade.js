/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 6_QUALIDADE
 * ---------------------------------------------------------------------------
 * QA visual. Plota TODAS as versões (V03–V08) ao mesmo tempo, lado a lado,
 * para comparação de consistência espacial/temporal das predições.
 *
 * Robusto:
 *   - se o merge anual da versão não existir, usa o mosaic() da própria
 *     ImageCollection PREDICTIONS/COL da versão (não quebra o script);
 *   - assetExists() com try/catch (pasta ausente não aborta);
 *   - banda explícita por versão ('prediction_<ano>') + std da v08.
 *
 * A máscara LULC é APENAS de treino — comparação sobre a região comum
 * (bioma), sem exigir máscara de cobertura.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var root = c.ASSET_ROOT;
var col = ee.ImageCollection(root + '/PREDICTIONS/COL');
var STD_VIS = { min: 0, max: 40, palette: ['#ffffb2', '#fd8d3c', '#d73027', '#7f0000'] };

// Todas as versões (merge anual exportado pelo 5_merge + COL de fallback).
// v08 tem sub-versões por fonte (V08_GEDI / V08_IFN), com prefixo de merge
// próprio (agc_pred_v08_merged_).
var VERSIONS = [
  { v: 'v03', root: BASE + '/V03', prefix: 'agc_pred_v03_merged_' },
  { v: 'v04', root: BASE + '/V04', prefix: 'agc_pred_v04_merged_' },
  { v: 'v05', root: BASE + '/V05', prefix: 'agc_pred_v05_merged_' },
  { v: 'v06', root: BASE + '/V06', prefix: 'agc_pred_v06_merged_' },
  { v: 'v07', root: BASE + '/V07', prefix: 'agc_pred_v07_merged_' },
  { v: 'v08_gedi', root: BASE + '/V08_GEDI', prefix: 'agc_pred_v08_merged_' },
  { v: 'v08_ifn', root: BASE + '/V08_IFN', prefix: 'agc_pred_v08_merged_' }
].map(function (p) {
  return {
    v: p.v,
    merge: p.root + '/PREDICTIONS/' + p.prefix,
    col: p.root + '/PREDICTIONS/COL'
  };
});

function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) {
    return false;
  }
}

/** Imagem anual da versão: merge se existir; senão COL mosaic (fallback). */
function yearImage(p, year) {
  var mergeId = p.merge + year;
  if (assetExists(mergeId)) return ee.Image(mergeId);
  print('[AVISO] merge não encontrado — usando COL mosaic de', p.v, '→', p.col);
  return ee.ImageCollection(p.col)
    .filter(ee.Filter.eq('year', year)).mosaic();
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 6_qualidade');
print('[CLASSES TREINO]', c.FOREST_CLASSES,
  '· [MASK MODE]', c.MASK_MODE, '(não mascara a predição)');
print('[FIX] v08 usa PALSAR global — comparar platôs por célula vs v07');

col.size().evaluate(function (n) {
  print('[V08 COL · predições de célula]', n);
});
col.aggregate_array('year').distinct().evaluate(function (years) {
  print('[V08 COL · anos]', years);
});

c.YEARS.forEach(function (year) {
  var shown = [], skipped = [];
  VERSIONS.forEach(function (p) {
    var label = p.v.toUpperCase() + '_merged_' + year;
    try {
      var img = yearImage(p, year).select(['prediction_' + year]);
      Map.addLayer(img, { min: 0, max: 75 }, label, true);  // todas visíveis
      shown.push(p.v);
    } catch (e) {
      skipped.push(p.v);
      print('[AVISO]', p.v, '· não plotado (' + String(e).slice(0, 120) + ')');
    }
  });

  // v08 também expõe a incerteza do ensemble (stdDev dos membros)
  try {
    var v08img = yearImage(VERSIONS[5], year);
    Map.addLayer(v08img.select('agbd_std_' + year), STD_VIS,
      'V08_std_' + year, false);
  } catch (e) {
    print('[AVISO] V08 · banda agbd_std_' + year + ' não disponível');
  }
  col.filter(ee.Filter.eq('year', year)).size().evaluate(function (n) {
    print('[QA ' + year + '] v08 · imagens (células):', n);
  });
  print('[QA ' + year + '] plotadas:', shown.join(', '),
    skipped.length ? '· puladas: ' + skipped.join(', ') : '');
});

print('[bitácora] V08 predição: mediana do ensemble (PALSAR global); ' +
  'agbd_std: desvio padrão dos membros.');