/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Predição espacial
 * ---------------------------------------------------------------------------
 * v07:
 *   - ensemble de N modelos globais (rf_agc_v07_m1..mN): cada membro usa só
 *     o seu subconjunto de bandas; resultado = MEDIANA + stdDev (incerteza)
 *   - SE c.LOG_TARGET, cada membro prediz ln(1+agbd)/ln(agbd) e a conversão
 *     para agbd usa o fator de Duan (SMEAR_FACTOR) e LOG_OFFSET do champion
 *   - SEM máscara LULC na saída (MASK_MODE='training_only'): a predição cobre
 *     toda a região de interseção com o bioma (D18)
 *   - SMOKE_CELLS: nessas células o export preserva também as bandas membro
 *     m1..mN (auditoria do ensemble — F25)
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v07/0_covariate_source.js');
var CELL_SPLIT = 4;
var YEARS = c.YEARS;
var ADD_LAYER = false;
var palette = ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'];
var root = c.ASSET_ROOT;
var IC = root + '/PREDICTIONS/COL';
var N = c.ENSEMBLE.NUM_MEMBERS;

var models = {};
for (var i = 1; i <= N; i++) {
  models['m' + i] = ee.Classifier.load(root + '/MODELS/rf_agc_v07_m' + i +
    '_' + (c.LOG_TARGET ? 'log' : 'lin'));
}

var biome = src.getBiome().geometry();
var defs = c.makeCellDefinitions(CELL_SPLIT);
var byId = {};
defs.forEach(function (cell) { byId[cell.id] = cell; });
var cells = c.makeCellFeatures(CELL_SPLIT).map(function (cell) {
  var geom = cell.geometry().intersection(biome, ee.ErrorMargin(30));
  return cell.set({ valid_area: geom.area(30) });
}).filter(ee.Filter.gt('valid_area', 0));

function backTransform(im) {
  // im = predição do membro (unidade do modelo: agbd ou ln)
  if (!c.LOG_TARGET) return im.toFloat();
  var exp = im.exp();
  return c.LOG_OFFSET === 1
    ? exp.multiply(c.SMEAR_FACTOR).subtract(1)   // y = exp(z)*smear - 1
    : exp.multiply(c.SMEAR_FACTOR);              // y = exp(z)*smear
}

function predictCell(id, year) {
  var def = byId[id];
  var geom = ee.Geometry.BBox(def.bbox[0], def.bbox[1], def.bbox[2], def.bbox[3])
    .intersection(biome, ee.ErrorMargin(30));
  var stack = src.buildTypedCovariatesStack(geom, year);

  var members = [];
  for (var i = 1; i <= N; i++) {
    var bands = src.getMemberBands(i);
    var cls = models['m' + i];
    // classifica no subconjunto de bandas do membro e devolve em unidades de agbd
    var p = backTransform(stack.select(bands).classify(cls));
    members.push(p.rename('m' + i).toFloat());
  }
  var MC = ee.Image.cat(members);
  var median = MC.reduce(ee.Reducer.median()).rename('prediction_' + year);
  var std = MC.reduce(ee.Reducer.stdDev()).rename('agbd_std_' + year);
  var image = median.addBands(std).toFloat().clip(geom)
    .set('year', year).set('cell_id', id)
    .set('system:time_start', ee.Date.fromYMD(year, 1, 1).millis());

  // células de auditoria preservam as bandas membro do ensemble
  if (c.SMOKE_CELLS.indexOf(id) > -1) {
    image = MC.addBands(image);
  }

  var name = 'agc_pred_v07_' + id + '_' + year;
  if (ADD_LAYER) Map.addLayer(image.select('prediction_' + year),
    { min: 0, max: 150, palette: palette }, name, false);
  Export.image.toAsset({ image: image,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: IC + '/' + name,
    overwrite: false,
    region: geom, scale: c.SCALE, maxPixels: 1e13,
    pyramidingPolicy: { '.default': 'mean' } });
}

function createExports(ids) {
  ids.forEach(function (id) {
    YEARS.forEach(function (year) { predictCell(id, year); });
  });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v07 · 4_spatial_prediction');
print('[MASK MODE]', c.MASK_MODE,
  '— saída NÃO mascarada por LULC; máscara restringe APENAS o treino');
print('[ENSEMBLE] N =', N, '· combinação mediana + stdDev');
print('[MODELOS]', Object.keys(models).join(', '));
print('[SMOKE CELLS]', c.SMOKE_CELLS.length
  ? c.SMOKE_CELLS.join(', ') : 'nenhuma (definir p/ auditoria F25)');
print('[IMPORTANTE] As predições por célula entram na ImageCollection ' + IC);
src.ensureFolder(root + '/PREDICTIONS');
src.ensureImageCollection(IC);
cells.aggregate_array('cell_id').evaluate(function (ids) {
  print('[CÉLULAS]', ids.length); createExports(ids);
});