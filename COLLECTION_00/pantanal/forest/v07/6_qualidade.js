/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · 6_QUALIDADE
 * ---------------------------------------------------------------------------
 * QA visual. Plota TODAS as versões (V03–V07) ao mesmo tempo, lado a lado,
 * para comparação de consistência espacial/temporal das predições.
 *
 * Robusto:
 *   - se o merge anual da versão não existir, usa o mosaic() da própria
 *     ImageCollection PREDICTIONS/COL da versão (não quebra o script);
 *   - assetExists() com try/catch (pasta ausente não aborta);
 *   - banda explícita por versão ('prediction_<ano>') + std da v07.
 *
 * A máscara LULC é APENAS de treino na v07 — comparação sobre a região comum
 * (bioma), sem exigir máscara de cobertura.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_covariate_source.js');
var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var root = c.ASSET_ROOT;
var col = ee.ImageCollection(root + '/PREDICTIONS/COL');
var PRED_VIS = {
  min: 0, max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850']
};
var STD_VIS = { min: 0, max: 40, palette: ['#ffffb2', '#fd8d3c', '#d73027', '#7f0000'] };

// Todas as versões (merge anual exportado pelo 5_merge + COL de fallback).
var VERSIONS = ['v03', 'v04', 'v05', 'v06', 'v07'].map(function (v) {
  var vv = v.toUpperCase();
  return {
    v: v,
    merge: BASE + '/' + vv + '/PREDICTIONS/agc_pred_' + v + '_merged_',
    col: BASE + '/' + vv + '/PREDICTIONS/COL',
    band: v === 'v07' ? 'prediction_' : 'prediction_'
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

print('MAPBIOMAS-CARBONO · Pantanal Forest v07 · 6_qualidade');
print('[CLASSES TREINO]', c.FOREST_CLASSES,
  '· [MASK MODE]', c.MASK_MODE, '(não mascara a predição)');

col.size().evaluate(function (n) {
  print('[V07 COL · predições de célula]', n);
});
col.aggregate_array('year').distinct().evaluate(function (years) {
  print('[V07 COL · anos]', years);
});

c.YEARS.forEach(function (year) {
  var shown = [], skipped = [];
  VERSIONS.forEach(function (p) {
    var band = p.band + year;
    var vis = { min: 0, max: 75 };  // defaults consistentes entre versões
    var label = p.v.toUpperCase() + '_merged_' + year;
    try {
      var img = yearImage(p, year).select([band]);
      Map.addLayer(img, vis, label, true);  // todas visíveis ao mesmo tempo
      shown.push(p.v);
    } catch (e) {
      skipped.push(p.v);
      print('[AVISO]', p.v, '· não plotado (' + String(e).slice(0, 120) + ')');
    }
  });

  // v07 também expõe a incerteza do ensemble (stdDev dos membros)
  try {
    var v07img = yearImage(VERSIONS[4], year);
    Map.addLayer(v07img.select('agbd_std_' + year), STD_VIS,
      'V07_std_' + year, false);
  } catch (e) {
    print('[AVISO] V07 · banda agbd_std_' + year + ' não disponível');
  }
  byYearSize(year);
  print('[QA ' + year + '] plotadas:', shown.join(', '),
    skipped.length ? '· puladas: ' + skipped.join(', ') : '');
});

function byYearSize(year) {
  col.filter(ee.Filter.eq('year', year)).size().evaluate(function (n) {
    print('[QA ' + year + '] v07 · imagens (células):', n);
  });
}

print('[bitácora] V07 predição: mediana do ensemble; agbd_std: desvio padrão dos membros.');