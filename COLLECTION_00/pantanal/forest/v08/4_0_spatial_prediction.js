/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Predição espacial
 * ---------------------------------------------------------------------------
 * Ensemble de N modelos globais (rf_agb_v08_m1..mN). Cada membro classifica no
 * seu subconjunto de bandas; combinação = MEDIANA + stdDev (incerteza).
 *
 * D1: grade de saída COMUM (crs + crsTransform do contrato) → pixels alinhados.
 * D3: GLOBAL_PREDICTION=true → a pilha é classificada UMA vez no domínio e o
 *     export é fatiado na grade fixa (cortes da MESMA imagem) → sem costura
 *     entre células. false = predição por célula (modo antigo).
 * (Costura/blending: ver docs/proposta_predicao_sem_costura.md.)
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var CELL_SPLIT = 4;
var YEAR = c.YEAR;
var ADD_LAYER = false;
var palette = ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'];
var root = c.ASSET_ROOT;
var IC = root + '/PREDICTIONS/COL';
var N = c.ENSEMBLE.NUM_MEMBERS;
// D3: predição GLOBAL única (1× no domínio) + export fatiado na grade fixa.
// false = predição por célula (cada célula monta a pilha e classifica).
var GLOBAL_PREDICTION = true;

var models = {};
for (var i = 1; i <= N; i++) {
  models['m' + i] = ee.Classifier.load(root + '/MODELS/rf_agb_v08_m' + i);
}

var domain = src.getDomain().geometry();
var defs = c.makeCellDefinitions(CELL_SPLIT);
var byId = {};
defs.forEach(function (cell) { byId[cell.id] = cell; });
var cells = c.makeCellFeatures(CELL_SPLIT).map(function (cell) {
  var geom = cell.geometry().intersection(domain, ee.ErrorMargin(30));
  return cell.set({ valid_area: geom.area(30) });
}).filter(ee.Filter.gt('valid_area', 0));

function cellGeom(id) {
  var def = byId[id];
  return ee.Geometry.BBox(def.bbox[0], def.bbox[1], def.bbox[2], def.bbox[3])
    .intersection(domain, ee.ErrorMargin(30));
}

/** Ensemble sobre uma pilha: mediana (predição) + stdDev (incerteza). */
function ensembleImage(stack) {
  var members = [];
  for (var i = 1; i <= N; i++) {
    members.push(stack.select(src.getMemberBands(i))
      .classify(models['m' + i]).toFloat().rename('m' + i));
  }
  var MC = ee.Image.cat(members);
  var median = MC.reduce(ee.Reducer.median()).rename('prediction_' + YEAR);
  var std = MC.reduce(ee.Reducer.stdDev()).rename('agbd_std_' + YEAR);
  return median.addBands(std).toFloat();
}

function exportCell(image, id, geom) {
  var out = image.clip(geom)
    .set('year', YEAR).set('cell_id', id)
    .set('system:time_start', ee.Date.fromYMD(YEAR, 1, 1).millis());
  var name = 'agb_pred_v08_' + id + '_' + YEAR;
  if (ADD_LAYER) Map.addLayer(out.select('prediction_' + YEAR),
    { min: 0, max: 75, palette: palette }, name, false);
  Export.image.toAsset({ image: out,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: IC + '/' + name,
    overwrite: false,
    region: geom, crs: c.CRS, crsTransform: c.CRS_TRANSFORM, maxPixels: 1e13,
    pyramidingPolicy: { '.default': 'mean' } });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 4_0_spatial_prediction');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label, '· raiz', root);
print('[DOMÍNIO]', c.BAP_ASSET, '— saída NÃO mascarada por LULC');
print('[ENSEMBLE] N =', N, '· mediana + stdDev');
print('[GRADE DE SAÍDA]', c.CRS, '· crsTransform comum (D1)');
print('[MODO]', GLOBAL_PREDICTION ? 'GLOBAL (D3, sem costura)' : 'por célula');
print('[MODELOS]', Object.keys(models).join(', '));
src.ensureFolder(root + '/PREDICTIONS');
src.ensureImageCollection(IC);

cells.aggregate_array('cell_id').evaluate(function (ids) {
  print('[CÉLULAS]', ids.length);
  if (GLOBAL_PREDICTION) {
    var image = ensembleImage(src.buildTypedCovariatesStack(domain, YEAR));
    ids.forEach(function (id) { exportCell(image, id, cellGeom(id)); });
  } else {
    ids.forEach(function (id) {
      var g = cellGeom(id);
      exportCell(ensembleImage(src.buildTypedCovariatesStack(g, YEAR)), id, g);
    });
  }
});
