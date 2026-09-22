/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_palsar.js
 * ---------------------------------------------------------------------------
 * PALSAR-2 builders: retroespalhamento HH/HV em dB, razão HV/HH e RVI.
 * Duas implementações — a cadeia documenta a mudança (ver _metadata.js):
 *   · buildPalsarPerCell  — since_v01 (`.first()` por célula; platôs de grade)
 *   · buildPalsarGlobal   — v08 (mediana global determinística; fix excesso)
 * Módulo independente: usa `ee` + polígono/bioma passado como argumento.
 ******************************************************************************/

var PALSAR_COLLECTION = 'JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH';
exports.PALSAR_BANDS = ['HH_db', 'HV_db', 'HV_HH_ratio', 'RVI'];

function deriveBands(sel) {
  var hhDb = sel.select('HH').pow(2).log10().multiply(10).subtract(83.0).rename('HH_db');
  var hvDb = sel.select('HV').pow(2).log10().multiply(10).subtract(83.0).rename('HV_db');
  var hhLin = hhDb.multiply(0.1).pow(ee.Image(10));
  var hvLin = hvDb.multiply(0.1).pow(ee.Image(10));
  var ratio = hvLin.divide(hhLin).log10().multiply(10).rename('HV_HH_ratio');
  var rvi = hvLin.multiply(4).divide(hhLin.add(hvLin)).rename('RVI');
  return ee.Image.cat([hhDb, hvDb, ratio, rvi])
    .focal_mean(3, 'square', 'pixels');   // filtro de speckle (paridade da cadeia)
}

/**
 * PALSAR per-célula (since_v01): escolhe a PRIMEIRA observação do AOI/ano.
 * Não recomendado para produção — platôs de HV/HH alinhados à grade.
 */
exports.buildPalsarPerCell = function (aoi, yearUsed) {
  var raw = ee.ImageCollection(PALSAR_COLLECTION)
    .filterBounds(aoi)
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .first()
    .select(['HH', 'HV']);
  return deriveBands(raw.select(['HH', 'HV']));
};

/** Composição anual GLOBAL determinística (v08): mediana das válidas (DN>0). */
function buildPalsarComposite(biome, year) {
  return ee.ImageCollection(PALSAR_COLLECTION)
    .filterBounds(biome)
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .select(['HH', 'HV'])
    .map(function (img) { return img.updateMask(img.gt(0)); })  // DN<=0 = nodata
    .median();
}

/** Stack PALSAR global (v08) — mediana, dB, speckle; MÁSCARA no bioma (sem clip). */
exports.buildPalsarGlobal = function (biome, year) {
  return deriveBands(buildPalsarComposite(biome, year).select(['HH', 'HV']))
    .updateMask(ee.Image().paint(ee.FeatureCollection(biome)).eq(0));
};

/** Máscara de validade do PALSAR global (1 onde há dado; masked onde nodata). */
exports.getPalsarValidMask = function (biome, year) {
  return buildPalsarComposite(biome, year).select('HH')
    .selfMask().rename('mask_palsar_nodata');
};