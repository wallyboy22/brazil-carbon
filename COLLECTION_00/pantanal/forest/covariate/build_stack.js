/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/build_stack.js
 * ---------------------------------------------------------------------------
 * Orquestrador do stack de covariáveis (36 bandas):
 *   HLS P10/P50/P90/AMP (24) + PALSAR-2 (4) + HAND (2) + ERA5/CWD (5) +
 *   MapBiomas C11 (1).
 * Política since_vNN: montagem e tipagem herdadas da v01 (registradas em
 * _metadata.js COVARIATES_REGISTRY). Este módulo é lido por TODAS as versões
 * v03+; mudanças de formulação entram como overrides nos orquestradores das
 * versões (ex.: PALSAR global na v08), nunca editando este acervo.
 ******************************************************************************/
var hls = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_hls.js');
var palsar = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_palsar.js');
var hand = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_hand.js');
var era5 = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_era5.js');
var lulc = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_lulc.js');

/** Parte HLS do ano (composição por percentis) — extraível p/ overrides v08. */
exports.buildHlsPart = function (aoi, yearUsed) {
  var dStart = yearUsed + '-01-01';
  var dEnd = (yearUsed + 1) + '-01-01';  // fim EXCLUSIVO — filterDate é [inicio, fim)
  var hlsL = ee.ImageCollection('NASA/HLS/HLSL30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(hls.BAND_L, hls.BAND_NAME).map(hls.maskHlsClouds).map(hls.addSpectralIndices);
  var hlsS = ee.ImageCollection('NASA/HLS/HLSS30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(hls.BAND_S, hls.BAND_NAME).map(hls.maskHlsClouds).map(hls.addSpectralIndices);
  return hls.percentileComposite(hlsL.merge(hlsS), hls.IDX_BANDS);
};

/** Stack cru (sem tipagem) — formulação since_v01, PALSAR per-célula.
 *  Restrição espacial por MÁSCARA (sem clip — regra AGENTS.md). */
exports.buildCovariatesStack = function (aoi, yearUsed) {
  return exports.buildHlsPart(aoi, yearUsed)
    .addBands(palsar.buildPalsarPerCell(aoi, yearUsed))
    .addBands(hand.buildHand(aoi))
    .addBands(era5.buildClimateStack(aoi, yearUsed))
    .addBands(lulc.buildLulc(aoi, yearUsed))
    .updateMask(ee.Image().paint(ee.FeatureCollection(aoi)).eq(0));
};

/**
 * Stack tipado — `bands` = { continuous, categorical, feature } vindos do
 * contrato da versão (que congela quais bandas entram no modelo).
 */
exports.buildTypedCovariatesStack = function (aoi, year, bands) {
  var raw = exports.buildCovariatesStack(aoi, year);
  var continuous = raw.select(bands.continuous).toFloat();
  var categorical = raw.select(bands.categorical).toUint8();
  return continuous.addBands(categorical)
    .select(bands.feature)
    .updateMask(ee.Image().paint(ee.FeatureCollection(aoi)).eq(0));
};