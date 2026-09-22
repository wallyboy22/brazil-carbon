/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Predição espacial
 * ---------------------------------------------------------------------------
 * Ensemble de N modelos globais (rf_agb_v08_m1..mN). Cada membro classifica no
 * seu subconjunto de bandas; combinação = MEDIANA + stdDev (incerteza).
 *
 * D1: grade de saída COMUM (crs + crsTransform do contrato) → pixels alinhados.
 * D3: UMA predição GLOBAL por fonte; o export é fatiado por `region` (grade
 *     comum) e a restrição espacial é feita por máscara no raster.
 *
 * FONTE: com `SOURCE=null` (ambíguo) dispara as DUAS fontes em sequência.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var CELL_SPLIT = 4;
var YEAR = c.YEAR;
var ADD_LAYER = true;
var palette = ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'];
var N = c.ENSEMBLE.NUM_MEMBERS;

// Área a PREDIZER (máscara). Default = domínio do contrato; troque para
// predizer outra área (fora da máscara do contrato).
var PREDICT_FC = src.getDomain();

var domain = PREDICT_FC.geometry();
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

/** Imagem de UM membro do ensemble (1 classificador sobre o subconjunto de bandas). */
function memberImage(stack, models, i) {
  return stack.select(src.getMemberBands(i))
    .classify(models['m' + i]).toFloat().rename('m' + i);
}

/** Ensemble sobre uma pilha: mediana (predição) + stdDev (incerteza). */
function ensembleImage(stack, models) {
  var members = [];
  for (var i = 1; i <= N; i++) {
    members.push(memberImage(stack, models, i));
  }
  var MC = ee.Image.cat(members);
  var median = MC.reduce(ee.Reducer.median()).rename('prediction_' + YEAR).toFloat();
  var std = MC.reduce(ee.Reducer.stdDev()).rename('agbd_std_' + YEAR).toFloat();  // stdDev -> double
  return median.addBands(std).toFloat();
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 4_0_spatial_prediction');
print('[PREDICT_FC]', c.BAP_ASSET, '— saída NÃO mascarada por LULC');
print('[ENSEMBLE] N =', N, '· mediana + stdDev');
print('[GRADE DE SAÍDA]', c.CRS, '· crsTransform comum (D1)');
print('[MÁSCARA] updateMask(paint(PREDICT_FC).eq(0))');
print('[FONTES]', c.sourcesToRun().join(', '), '(SOURCE=' + c.SOURCE + ')');

c.sourcesToRun().forEach(function (source) {
  var S = c.SOURCES[source];
  var root = S.assetRoot;
  var IC = root + '/PREDICTIONS/COL';
  print('\n' + c.RULE);
  print('# FONTE:', source, '·', S.label, '· raiz', root);
  print(c.RULE);

  var models = {};
  for (var i = 1; i <= N; i++) {
    models['m' + i] = ee.Classifier.load(root + '/MODELS/rf_agb_v08_m' + i);
  }

  // UMA predição global (mediana + std) para EXPORT; restrição por máscara.
  var stack = src.buildTypedCovariatesStack(domain, YEAR);
  var pred = ensembleImage(stack, models);
  var mask = ee.Image().paint(ee.FeatureCollection(PREDICT_FC)).eq(0);
  var image = pred.updateMask(mask);

  // PLOT: cada MEMBRO do ensemble (1 classificador → mais leve que a mediana)
  // + a MEDIANA de UMA célula (QA local leve). A mediana global estoura.
  if (ADD_LAYER) {
    for (var i = 1; i <= N; i++) {
      Map.addLayer(memberImage(stack, models, i).updateMask(mask),
        { min: 0, max: 75, palette: palette },
        'v08 ' + source + ' m' + i, false);
    }
    var qaId = defs[0].id;
    var qaStack = src.buildTypedCovariatesStack(cellGeom(qaId), YEAR);
    Map.addLayer(ensembleImage(qaStack, models).select('prediction_' + YEAR),
      { min: 0, max: 75, palette: palette },
      'v08 ' + source + ' median ' + qaId, false);
  }

  print('[MODELOS]', Object.keys(models).join(', '));
  src.ensureFolder(root + '/PREDICTIONS');
  src.ensureImageCollection(IC);

  cells.aggregate_array('cell_id').evaluate(function (ids) {
    print('[CÉLULAS]', ids.length);
    ids.forEach(function (id) {
      var geom = cellGeom(id);
      var name = 'agb_pred_v08_' + id + '_' + YEAR;
      var out = image.set('year', YEAR).set('cell_id', id).set('source', source)
        .set('system:time_start', ee.Date.fromYMD(YEAR, 1, 1).millis());
      Export.image.toAsset({ image: out,
        description: 'WS_CARBONO_toAsset-' + source + '-' + name,
        assetId: IC + '/' + name,
        overwrite: false,
        region: geom, crs: c.CRS, crsTransform: c.CRS_TRANSFORM, maxPixels: 1e13,
        pyramidingPolicy: { '.default': 'mean' } });
    });
  });
});
