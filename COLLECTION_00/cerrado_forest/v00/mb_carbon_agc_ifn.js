/**
 * MAPBIOMAS-CARBONO — Coleção 0 · CERRADO · Covariáveis para parcelas IFN
 * Extrai stack completo de covariáveis (HLS/PALSAR/HAND/ERA5-CWD/MapBiomas C11)
 * nas parcelas IFN (polígonos), exporta para Asset GEE e Drive (CSV).
 *
 * COMO USAR:
 *   1) Configure YEARS (apenas um ativo).
 *   2) Verifique IFN_ASSET e SAMPLES_BASE.
 *   3) Descomente EXPORT_FOLDER se quiser Drive.
 *   4) Run > monitore na aba TASKS.
 */

// =============================================================================
// 0. CONFIG
// =============================================================================

// Anos — apenas um ativo, outros comentados
// var YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
//var YEARS = [2023];  // ANO ATIVO
var YEARS = [2018];  // ANO ATIVO

var IFN_ASSET = 'projects/ee-ipam/assets/IFN/IFN_2026_Field_Cerrado';

var SAMPLES_BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/CERRADO_FOREST/SAMPLES';

var EXPORT_FOLDER = 'GEE_Exports_AGC-v3';

var SCALE = 30;

var EXPORT_TO_DRIVE = true;   // requer EXPORT_FOLDER descomentado
var EXPORT_TO_ASSET = true;

// =============================================================================
// 1. PROPRIEDADES IFN A PRESERVAR
// =============================================================================

var IFN_PROPS = [
  'fid', 'UA', 'Subunidade',
  'G_m2', 'G_m2_ha', 'area_ha',
  'AGB_Mg', 'AGB_Mg_ha', 'CO2e_Mg_ha', 'C_Mg_ha',
  'n_ind', 'orientacao', 'mun', 'bioma',
  'centroid_lon', 'lat_lowestmode_a1',
];

// =============================================================================
// 2. FUNÇÕES — COVARIÁVEIS (server-side)
// =============================================================================

// --- 2a. HLS: máscara Fmask + índices espectrais ---
function maskHlsClouds(img) {
  var qa = img.select('Fmask');
  var clear = qa.bitwiseAnd(1 << 1).eq(0)   // bit 1 = cloud
    .and(qa.bitwiseAnd(1 << 2).eq(0))       // bit 2 = shadow
    .and(qa.bitwiseAnd(1 << 0).eq(0));      // bit 0 = cirrus
  return img.updateMask(clear).divide(10000).copyProperties(img, ['system:time_start']);
}

function addSpectralIndices(img) {
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
    { SWIR1: img.select('SWIR1'), Red: img.select('Red'), NIR: img.select('NIR'), Blue: img.select('Blue') }
  ).rename('BSI');
  return img.addBands([ndvi, evi, ndmi, bai, savi, bsi]);
}

function percentileComposite(col, idxBands) {
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
}

var IDX_BANDS = ['NDVI', 'EVI', 'NDMI', 'BAI', 'SAVI', 'BSI'];
var BAND_L = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'Fmask'];
var BAND_S = ['B2', 'B3', 'B4', 'B8A', 'B11', 'B12', 'Fmask'];
var BAND_NAME = ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'Fmask'];

// Stack integrado (36 bandas): HLS P10/P50/P90/AMP (24) + PALSAR-2 (4) + HAND (2)
// + ERA5/CWD (5) + MapBiomas C11 (1).
function buildCovariateStack(aoi, yearUsed) {
  var dStart = yearUsed + '-01-01';
  var dEnd = (yearUsed + 1) + '-01-01';   // fim EXCLUSIVO — filterDate é [inicio, fim)

  // --- 2b. HLS: composição anual P10/P50/P90/AMP ---
  var hlsL = ee.ImageCollection('NASA/HLS/HLSL30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_L, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsS = ee.ImageCollection('NASA/HLS/HLSS30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_S, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsStack = percentileComposite(hlsL.merge(hlsS), IDX_BANDS);

  // --- 2c. PALSAR-2: retroespalhamento (dB), razão HV/HH e RVI ---
  var palsarRaw = ee.ImageCollection('JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH')
    .filterBounds(aoi)
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .first()
    .select(['HH', 'HV']);
  var hhDb = palsarRaw.select('HH').pow(2).log10().multiply(10).subtract(83.0).rename('HH_db');
  var hvDb = palsarRaw.select('HV').pow(2).log10().multiply(10).subtract(83.0).rename('HV_db');
  var hhLin = hhDb.multiply(0.1).pow(ee.Image(10));
  var hvLin = hvDb.multiply(0.1).pow(ee.Image(10));
  var ratio = hvLin.divide(hhLin).log10().multiply(10).rename('HV_HH_ratio');
  var rvi = hvLin.multiply(4).divide(hhLin.add(hvLin)).rename('RVI');
  var palsarStack = ee.Image.cat([hhDb, hvDb, ratio, rvi])
    .focal_mean(3, 'square', 'pixels');   // filtro de speckle

  // --- 2d. HAND: altura em relação à drenagem + classes geomorfológicas ---
  var handCont = ee.ImageCollection('users/gena/global-hand/hand-100').mosaic().rename('HAND_m');
  var handClass = ee.Image(0)
    .where(handCont.lt(5), 1)
    .where(handCont.gte(5).and(handCont.lt(15)), 2)
    .where(handCont.gte(15).and(handCont.lt(45)), 3)
    .where(handCont.gte(45), 4)
    .rename('geomorph_class');
  var handStack = handCont.addBands(handClass);

  // --- 2e. ERA5-Land: CWD (atual/climatológico/3yr) + temperatura + precipitação ---
  var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR').filterBounds(aoi);

  function computeAnnualCWD(year) {
    var months = ee.List.sequence(1, 12);
    function monthly(m) {
      var mm = ee.Number(m);
      var img = era5
        .filter(ee.Filter.calendarRange(year, year, 'year'))
        .filter(ee.Filter.calendarRange(mm, mm, 'month')).first();
      var prec = img.select('total_precipitation_sum').multiply(1000);   // m -> mm
      var etp = img.select('potential_evaporation_sum').abs().multiply(1000);
      return etp.subtract(prec).max(ee.Image(0)).rename('CWD_m');
    }
    return ee.ImageCollection(months.map(monthly)).sum();
  }

  var cwdCurr = computeAnnualCWD(yearUsed).rename('CWD_current');
  var cwdClim = ee.ImageCollection(
    ee.List.sequence(2010, 2020).map(function (y) { return computeAnnualCWD(ee.Number(y)); })
  ).mean().rename('CWD_clim');
  var cwd3yr = ee.ImageCollection(
    ee.List.sequence(yearUsed - 3, yearUsed - 1).map(function (y) { return computeAnnualCWD(ee.Number(y)); })
  ).sum().rename('CWD_3yr');

  var tMean = era5
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .select('temperature_2m').mean().subtract(273.15).rename('Tmean_C');
  var precAnn = era5
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .select('total_precipitation_sum').sum().multiply(1000).rename('Prec_mm');
  var climateStack = cwdCurr.addBands([cwdClim, cwd3yr, tMean, precAnn]);

  // --- 2f. MapBiomas: classe de uso e cobertura do ano (Coleção 11) ---
  var mapbiomasLulc = ee.Image(
    'projects/mapbiomas-public/assets/brazil/lulc/collection11/'
    + 'mapbiomas_brazil_collection11_coverage_v3')
    .select('classification_' + yearUsed)
    .rename('mapbiomas_lulc')
    .toFloat();

  return hlsStack
    .addBands(palsarStack)
    .addBands(handStack)
    .addBands(climateStack)
    .addBands(mapbiomasLulc)
    .updateMask(ee.Image().paint(aoi).eq(0));
}

// =============================================================================
// 3. PIPELINE — LOOP POR ANO
// =============================================================================

YEARS.forEach(function (year) {
  print('====== ANO:', year, '======');

  // Carregar IFN
  var IFN_FC = ee.FeatureCollection(IFN_ASSET);

  // Filtrar features sem geometria (evita erro "null geometry")
  var IFN_valid = IFN_FC.filter(ee.Filter.notNull(['.geo']));
  print('[INFO] IFN parcelas com geometria:', IFN_valid.size());

  // AOI = bounds do IFN válido
  var aoi = IFN_valid.geometry().bounds();
  Map.addLayer(aoi, { color: 'yellow' }, 'AOI IFN ' + year, false);
  Map.addLayer(IFN_valid, { color: 'orange' }, 'IFN parcelas ' + year, false);

  // Adiciona centroid (lat/lon) do polígono como colunas de saída
  IFN_valid = IFN_valid.map(function (f) {
    var c = ee.List(f.geometry().centroid().coordinates());
    return f.set({
      'lon_lowestmode_a1': c.get(0),
      'lat_lowestmode_a1': c.get(1)
    });
  });

  // Build stack
  var stack = buildCovariateStack(aoi, year);

  // SampleRegions nos POLÍGONOS com .first() (padrão)
  var sampled = stack.sampleRegions({
    collection: IFN_valid,
    properties: IFN_PROPS,
    scale: SCALE,
    geometries: true,      // mantém geometria do polígono
    tileScale: 8
  });

  // Export com ano no nome
  var assetId = SAMPLES_BASE + '/IFN_covariaveis_' + year;
  var desc = 'IFN_covariaveis_' + year;

  if (EXPORT_TO_ASSET) {
    Export.table.toAsset({
      collection: sampled,
      description: 'WS_CARBONO_toAsset-'+desc,
      assetId: assetId,
      overwrite: true
    });
    print('[EXPORT] Asset:', assetId);
  }

  if (EXPORT_TO_DRIVE && typeof EXPORT_FOLDER !== 'undefined') {
    Export.table.toDrive({
      collection: sampled,
      description: 'WS_CARBONO_toDrive-'+desc,
      folder: EXPORT_FOLDER,
      fileNamePrefix: desc,
      fileFormat: 'CSV'
    });
    print('[EXPORT] Drive:', EXPORT_FOLDER + '/' + desc + '.csv');
  }

  print('[FIM] IFN covariáveis', year);
});