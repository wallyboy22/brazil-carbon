/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_era5.js
 * ---------------------------------------------------------------------------
 * ERA5-Land climáticas: CWD (atual/climatológico/3yr), temperatura e
 * precipitação anuais. Política since_v01 — ver _metadata.js registrations.
 * Módulo independente: só usa `ee` + coleção ERA5 (passada/construída aqui).
 ******************************************************************************/

/** CWD anual (mm) = Σ max(ETP − P, 0) dos 12 meses — via ERA5-Land. */
function computeAnnualCWD(era5, year) {
  var months = ee.List.sequence(1, 12);
  function monthly(m) {
    var mm = ee.Number(m);
    var img = era5
      .filter(ee.Filter.calendarRange(year, year, 'year'))
      .filter(ee.Filter.calendarRange(mm, mm, 'month')).first();
    var prec = img.select('total_precipitation_sum').multiply(1000);   // m -> mm
    var etp = img.select('potential_evaporation_sum').abs().multiply(1000);
    return etp.subtract(prec).max(ee.Image(0)).rename('CWD_m').toFloat();
  }
  return ee.ImageCollection(months.map(monthly)).sum().toFloat();  // sum -> double
}

var ERA5 = 'ECMWF/ERA5_LAND/MONTHLY_AGGR';

/** Stack climático anual: CWD_current, CWD_clim, CWD_3yr, Tmean_C, Prec_mm. */
exports.buildClimateStack = function (aoi, yearUsed) {
  var era5 = ee.ImageCollection(ERA5).filterBounds(aoi);
  var cwdCurr = computeAnnualCWD(era5, yearUsed).rename('CWD_current').toFloat();
  var cwdClim = ee.ImageCollection(
    ee.List.sequence(2010, 2020).map(function (y) {
      return computeAnnualCWD(era5, ee.Number(y));
    })
  ).mean().rename('CWD_clim').toFloat();
  var cwd3yr = ee.ImageCollection(
    ee.List.sequence(yearUsed - 3, yearUsed - 1).map(function (y) {
      return computeAnnualCWD(era5, ee.Number(y));
    })
  ).sum().rename('CWD_3yr').toFloat();   // sum -> double
  var tMean = era5
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .select('temperature_2m').mean().subtract(273.15).rename('Tmean_C').toFloat();
  var precAnn = era5
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .select('total_precipitation_sum').sum().multiply(1000)
    .rename('Prec_mm').toFloat();        // sum -> double
  return cwdCurr.addBands([cwdClim, cwd3yr, tMean, precAnn]).toFloat();
};