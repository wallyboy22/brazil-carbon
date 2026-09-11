/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_hls.js
 * ---------------------------------------------------------------------------
 * HLS spectral builders (composição anual de índices por percentis).
 * Política since_vNN: este bloco não muda desde v01 — registrado em
 * _metadata.js (COVARIATES_REGISTRY) com tag 'since_v01'.
 * Módulo independente: só usa `ee`, nenhum require de versão ou de outro _*.
 ******************************************************************************/

exports.IDX_BANDS = ['NDVI', 'EVI', 'NDMI', 'BAI', 'SAVI', 'BSI'];
exports.BAND_L = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'Fmask'];
exports.BAND_S = ['B2', 'B3', 'B4', 'B8A', 'B11', 'B12', 'Fmask'];
exports.BAND_NAME = ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'Fmask'];

/** Máscara de nuvem/sombra/cirrus via Fmask (bits 0-2). */
exports.maskHlsClouds = function (img) {
  var qa = img.select('Fmask');
  var clear = qa.bitwiseAnd(1 << 1).eq(0)   // bit 1 = cloud
    .and(qa.bitwiseAnd(1 << 2).eq(0))       // bit 2 = shadow
    .and(qa.bitwiseAnd(1 << 0).eq(0));      // bit 0 = cirrus
  return img.updateMask(clear).divide(10000).copyProperties(img, ['system:time_start']);
};

/** Índices espectrais (NDVI, EVI, NDMI, BAI, SAVI, BSI) sobre reflectância 0-1. */
exports.addSpectralIndices = function (img) {
  var ndvi = img.normalizedDifference(['NIR', 'Red']).rename('NDVI');
  var evi = img.expression(
    '2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))',
    { NIR: img.select('NIR'), Red: img.select('Red'), Blue: img.select('Blue') }
  ).rename('EVI');
  var ndmi = img.normalizedDifference(['NIR', 'SWIR1']).rename('NDMI');
  var bai = img.expression(
    '1.0 / ((0.1 - Red) ** 2 + (0.06 - NIR) ** 2)',
    { Red: img.select('Red'), NIR: img.select('NIR') }
  ).rename('BAI');
  var savi = img.expression(
    '1.5 * (NIR - Red) / (NIR + Red + 0.5)',
    { Red: img.select('Red'), NIR: img.select('NIR') }
  ).rename('SAVI');
  var bsi = img.expression(
    '(SWIR1 + Red - NIR - Blue) / (SWIR1 + Red + NIR + Blue)',
    { SWIR1: img.select('SWIR1'), Red: img.select('Red'),
      NIR: img.select('NIR'), Blue: img.select('Blue') }
  ).rename('BSI');
  return img.addBands([ndvi, evi, ndmi, bai, savi, bsi]);
};

/** Composição anual P10/P50/P90/AMP sobre os índices do ano. */
exports.percentileComposite = function (col, idxBands) {
  var colSel = col.select(idxBands);
  var p10 = colSel.reduce(ee.Reducer.percentile([10]))
    .rename(idxBands.map(function (b) { return b + '_p10'; }));
  var p50 = colSel.reduce(ee.Reducer.percentile([50]))
    .rename(idxBands.map(function (b) { return b + '_p50'; }));
  var p90 = colSel.reduce(ee.Reducer.percentile([90]))
    .rename(idxBands.map(function (b) { return b + '_p90'; }));
  var amp = p90.subtract(p10)
    .rename(idxBands.map(function (b) { return b + '_amp'; }));
  return ee.Image.cat([p10, p50, p90, amp]);
};