/******************************************************************************
 * MAPBIOMAS-CARBONO — Coleção 0 · PANTANAL · v01 · Fonte de covariáveis
 * ----------------------------------------------------------------------------
 * Módulo compartilhado da pipeline v01 (padrão MapBiomas Solo collection3):
 * concentra filtros GEDI, descoberta de granules, helper de pastas de asset e
 * o stack de covariáveis (HLS/PALSAR-2/HAND/ERA5-CWD/MapBiomas C11) para uso
 * via require() pelas etapas 1_check_covariates, 2_data_matrix e 3_modelling.
 *
 * USO:
 *   var src = require(
 *     'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v01/0_covariate_source.js');
 *   var stack = src.buildCovariatesStack(aoi, 2023);   // ver assinatura abaixo
 *
 * SCRIPT DEDICADO AO BIOMA PANTANAL — pode divergir do Cerrado em grids,
 * covariáveis, filtros e parâmetros.
 ******************************************************************************/

// =============================================================================
// 0. CONFIG COMPARTILHADA
// =============================================================================

// Bioma (IBGE/IPAM) — camada de diagnóstico e recorte padrão da predição
exports.BIOME_FC   = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.BIOME_PROP = 'Bioma';
exports.BIOME_NAME = 'Pantanal';

// Raiz dos assets do bioma (subpastas criadas sob demanda por ensureFolder)
exports.ASSET_ROOT =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';

// Escala de extração das covariáveis (m)
exports.SCALE = 30;

// =============================================================================
// 1. HELPER — GARANTIR PASTAS DE ASSET (nível a nível)
// =============================================================================

// O Code Editor não cria pastas de asset automaticamente ao exportar. Este
// helper percorre cada nível do caminho e cria o que faltar. Os dois primeiros
// níveis ('projects/<projeto>') são assumidos como existentes.
// Uso antes de qualquer Export.* cujo destino possa não existir.
exports.ensureFolder = function (folderPath) {
  var parts = folderPath.split('/');
  var MIN_LEVELS = 2;
  var acc = [];
  for (var i = 0; i < parts.length; i++) {
    acc.push(parts[i]);
    if (i < MIN_LEVELS) continue;
    var current = acc.join('/');
    try {
      ee.data.getAsset(current);
    } catch (e) {
      try {
        ee.data.createAsset({ type: 'Folder' }, current);
        print('[INFO] Pasta criada:', current);
      } catch (e2) {
        print('[AVISO] Falha ao criar pasta', current, '—', e2.message);
      }
    }
  }
};

// =============================================================================
// 2. FILTROS GEDI (porta do v00 / notebook mb_carbon_agc.py)
// =============================================================================

// Filtros de qualidade do GEDI L4A v002:
// qualidade, sem degradação, agbd>0, erro relativo<50%, sensitivity>=0.95,
// 8 beams válidos e apenas tiros noturnos.
exports.filterGedi = function (fc, aoi) {
  fc = fc.filter(ee.Filter.eq('l4_quality_flag', 1));
  fc = fc.filter(ee.Filter.eq('degrade_flag', 0));
  fc = fc.filter(ee.Filter.gt('agbd', 0));
  fc = fc.map(function (f) {
    var agbd = ee.Number(f.get('agbd'));
    var agbdSe = ee.Number(f.get('agbd_se'));
    var rel = ee.Algorithms.If(agbd.gt(0), agbdSe.divide(agbd), ee.Number(99));
    return f.set('rel_error', rel);
  });
  fc = fc.filter(ee.Filter.lt('rel_error', 0.5));
  fc = fc.filter(ee.Filter.gte('sensitivity', 0.95));
  fc = fc.filter(ee.Filter.inList('beam', [0, 1, 2, 3, 5, 6, 8, 11]));
  fc = fc.filter(ee.Filter.lt('solar_elevation', 0));
  return fc.filterBounds(aoi);
};

// Descobre os granules (table_id) do GEDI no AOI + janela [inicio, fim) — fim
// EXCLUSIVO. O índice tem 'time_start' como STRING ISO 8601 (sem
// system:time_start), então filtra por comparação string.
// Assíncrona: resultado via callback (estratégia evaluate — sem getInfo).
exports.discoverGranules = function (aoi, start, end, callback) {
  var idx = ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002_INDEX')
    .filter(ee.Filter.gt('time_start', start + 'T00:00:00Z'))
    .filter(ee.Filter.lt('time_start', end + 'T00:00:00Z'))
    .filterBounds(aoi);
  idx.aggregate_array('table_id').distinct().evaluate(function (assets) {
    print('[OK] Granules encontrados:', assets.length);
    callback({ assets: assets, n: assets.length, yearUsed: parseInt(start.slice(0, 4), 10) });
  });
};

// =============================================================================
// 3. COVARIÁVEIS — FUNÇÕES INTERNAS (server-side)
// =============================================================================

// --- HLS: máscara Fmask + índices espectrais -------------------------------
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
    { SWIR1: img.select('SWIR1'), Red: img.select('Red'),
      NIR: img.select('NIR'), Blue: img.select('Blue') }
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

// --- ERA5-Land: CWD anual ----------------------------------------------------
function computeAnnualCWD(era5, year) {
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

// =============================================================================
// 4. STACK INTEGRADO (36 bandas) — HLS P10/P50/P90/AMP (24) + PALSAR-2 (4) +
//    HAND (2) + ERA5/CWD (5) + MapBiomas C11 (1)
// =============================================================================

// Monta o stack anual clipado no AOI. `yearUsed` é o ano efetivo dos dados
// (após eventual fallback do discoverGranules).
exports.buildCovariatesStack = function (aoi, yearUsed) {
  var dStart = yearUsed + '-01-01';
  var dEnd = (yearUsed + 1) + '-01-01';   // fim EXCLUSIVO — filterDate é [inicio, fim)

  // --- HLS: composição anual P10/P50/P90/AMP ---------------------------------
  var hlsL = ee.ImageCollection('NASA/HLS/HLSL30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_L, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsS = ee.ImageCollection('NASA/HLS/HLSS30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_S, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsStack = percentileComposite(hlsL.merge(hlsS), IDX_BANDS);

  // --- PALSAR-2: retroespalhamento (dB), razão HV/HH e RVI -------------------
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

  // --- HAND: altura relativa à drenagem + classes geomorfológicas ------------
  var handCont = ee.ImageCollection('users/gena/global-hand/hand-100').mosaic().rename('HAND_m');
  var handClass = ee.Image(0)
    .where(handCont.lt(5), 1)
    .where(handCont.gte(5).and(handCont.lt(15)), 2)
    .where(handCont.gte(15).and(handCont.lt(45)), 3)
    .where(handCont.gte(45), 4)
    .rename('geomorph_class');
  var handStack = handCont.addBands(handClass);

  // --- ERA5-Land: CWD (atual/climatológico/3yr) + temperatura + precipitação -
  var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY_AGGR').filterBounds(aoi);
  var cwdCurr = computeAnnualCWD(era5, yearUsed).rename('CWD_current');
  var cwdClim = ee.ImageCollection(
    ee.List.sequence(2010, 2020).map(function (y) { return computeAnnualCWD(era5, ee.Number(y)); })
  ).mean().rename('CWD_clim');
  var cwd3yr = ee.ImageCollection(
    ee.List.sequence(yearUsed - 3, yearUsed - 1).map(function (y) { return computeAnnualCWD(era5, ee.Number(y)); })
  ).sum().rename('CWD_3yr');
  var tMean = era5
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .select('temperature_2m').mean().subtract(273.15).rename('Tmean_C');
  var precAnn = era5
    .filter(ee.Filter.calendarRange(yearUsed, yearUsed, 'year'))
    .select('total_precipitation_sum').sum().multiply(1000).rename('Prec_mm');
  var climateStack = cwdCurr.addBands([cwdClim, cwd3yr, tMean, precAnn]);

  // --- MapBiomas: classe de uso e cobertura do ano (Coleção 11) --------------
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
    .clip(aoi);
};

// Propriedades GEDI carregadas na matriz de treino (amostragem sampleRegions)
exports.SAMPLE_PROPS = [
  'agbd', 'agbd_se', 'pft_class', 'shot_number',
  'lon_lowestmode', 'lat_lowestmode'
];

// Seletores completos para o CSV de footprints (Drive)
exports.GEDI_SELECTORS = [
  'lon_lowestmode', 'lat_lowestmode', 'agbd', 'agbd_se',
  'agbd_pi_lower', 'agbd_pi_upper', 'sensitivity', 'beam',
  'selected_algorithm', 'pft_class', 'region_class', 'landsat_treecover',
  'shot_number', 'delta_time'
];
