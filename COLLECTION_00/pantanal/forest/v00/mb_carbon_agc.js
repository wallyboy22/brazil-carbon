/**
 * MAPBIOMAS-CARBONO — Coleção 0 · PANTANAL · AGC (amostras GEDI)
 * Porta do notebook mb_carbon_agc.py (apenas SAÍDAS — sem análise).
 * Extrai footprints GEDI L4A v002 filtrados, monta o stack de covariáveis
 * (HLS/PALSAR/HAND/ERA5-CWD/MapBiomas C11) e exporta em loop por região,
 * duplicado para Drive (CSV) e Assets GEE (FC). Assíncrono: os exports só
 * são criados após baixar, via evaluate(), a lista de granules e o total de
 * pegadas filtradas. Ver mb_carbon_flow_map.md e COLLECTION_00/README.md.
 *
 * SCRIPT DEDICADO AO BIOMA PANTANAL — pode divergir do script do Cerrado
 * (COLLECTION_00/cerrado/mb_carbon_agc.js) em grids, covariáveis, filtros e
 * parâmetros.
 *
 * COMO USAR:
 *   1) Crie as pastas-pai no Assets GEE:
 *        MAPBIOMAS / CARBON / MAPPING / COLLECTION_00 / PANTANAL_FOREST / SAMPLES
 *   2) Configure YEAR e ACTIVE_GRIDS.
 *   3) Run > monitore na aba TASKS.
 */

// =============================================================================
// 0. CONFIG
// =============================================================================

// Ano de referência (GEDI, covariáveis e MapBiomas)
var YEAR = 2023;

// Escala de extração das covariáveis (m)
var SCALE = 30;

// Tamanho do batch para o export em CSV (Drive)
var BATCH_SIZE = 1000;

// Pasta de destino no Google Drive
var EXPORT_FOLDER = 'GEE_Exports_AGC-v3';

// Base dos assets (pastas-pai devem existir no Assets GEE)
var ASSET_BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/SAMPLES';

// Toggles de DESTINO
var EXPORT_TO_DRIVE = false;   // CSV no Google Drive
var EXPORT_TO_ASSET = true;   // FeatureCollection em Assets GEE

// Toggles de PRODUTO
var EXPORT_FOOTPRINTS = true; // footprints GEDI filtrados (sem covariáveis)
var EXPORT_SAMPLES    = true; // amostras com o stack de covariáveis

// Bioma (IBGE/IPAM) — camada de diagnóstico
var BIOME_FC = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
var BIOME_PROP = 'Bioma';
var BIOME_NAME = 'Pantanal';

// =============================================================================
// 1. GRIDS / REGIÕES
// =============================================================================
// 'id' -> { label, bbox: [xmin, ymin, xmax, ymax] }. Descomente para ativar.
var GRIDS = {
  // PANTANAL — bioma completo (grid principal deste script)
  'pantanal': { label: 'Pantanal (bioma completo)', bbox: [-60.678789762675464, -22.813804973745906, -52.548906950175464, -12.958681301038263] },
  // Outras regiões (exemplo — ajuste as coordenadas):
  // 'maranhao': { label: 'Maranhao', bbox: [-48.75, -10.25, -41.25, -1.0] },
};

// =============================================================================
// 2. REGIÕES ATIVAS — LOOP DE EXPORT
// =============================================================================
var ACTIVE_GRIDS = ['pantanal'];   // ou Object.keys(GRIDS) para todas

// =============================================================================
// 3. FUNÇÕES — FILTROS GEDI
// =============================================================================

// Filtros de qualidade do GEDI L4A v002 (porta exata do notebook)
function filterGedi(fc, aoi) {
  fc = fc.filter(ee.Filter.eq('l4_quality_flag', 1));
  fc = fc.filter(ee.Filter.eq('degrade_flag', 0));
  fc = fc.filter(ee.Filter.gt('agbd', 0));
  fc = fc.map(function (f) {
    var agbd = ee.Number(f.get('agbd'));
    var agbd_se = ee.Number(f.get('agbd_se'));
    var rel = ee.Algorithms.If(agbd.gt(0), agbd_se.divide(agbd), ee.Number(99));
    return f.set('rel_error', rel);
  });
  fc = fc.filter(ee.Filter.lt('rel_error', 0.5));                     // erro relativo < 50%
  fc = fc.filter(ee.Filter.gte('sensitivity', 0.95));
  fc = fc.filter(ee.Filter.inList('beam', [0, 1, 2, 3, 5, 6, 8, 11])); // 8 beams
  fc = fc.filter(ee.Filter.lt('solar_elevation', 0));                 // apenas noturno
  return fc.filterBounds(aoi);
}

// Descobre os granules (table_id) do GEDI no AOI + janela [inicio, fim) (fim exclusivo).
// O índice tem 'time_start' como STRING ISO 8601 — filtra com comparação string.
// Assíncrona: resultado via callback (estratégia evaluate — sem getInfo).
function discoverGranules(aoi, start, end, callback) {
  var idx = ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002_INDEX')
    .filter(ee.Filter.gt('time_start', start + 'T00:00:00Z'))
    .filter(ee.Filter.lt('time_start', end + 'T00:00:00Z'))
    .filterBounds(aoi);
  idx.aggregate_array('table_id').distinct().evaluate(function (assets) {
    print('[OK] Granules encontrados:', assets.length);
    callback({ assets: assets, n: assets.length, yearUsed: parseInt(start.slice(0, 4), 10) });
  });
}

// =============================================================================
// 4. FUNÇÕES — COVARIÁVEIS (server-side)
// =============================================================================

// --- 4a. HLS: máscara Fmask + índices espectrais ---
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

  // --- 4b. HLS: composição anual P10/P50/P90/AMP ---
  var hlsL = ee.ImageCollection('NASA/HLS/HLSL30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_L, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsS = ee.ImageCollection('NASA/HLS/HLSS30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_S, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsStack = percentileComposite(hlsL.merge(hlsS), IDX_BANDS);

  // --- 4c. PALSAR-2: retroespalhamento (dB), razão HV/HH e RVI ---
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

  // --- 4d. HAND: altura em relação à drenagem + classes geomorfológicas ---
  var handCont = ee.ImageCollection('users/gena/global-hand/hand-100').mosaic().rename('HAND_m');
  var handClass = ee.Image(0)
    .where(handCont.lt(5), 1)
    .where(handCont.gte(5).and(handCont.lt(15)), 2)
    .where(handCont.gte(15).and(handCont.lt(45)), 3)
    .where(handCont.gte(45), 4)
    .rename('geomorph_class');
  var handStack = handCont.addBands(handClass);

  // --- 4e. ERA5-Land: CWD (atual/climatológico/3yr) + temperatura + precipitação ---
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

  // --- 4f. MapBiomas: classe de uso e cobertura do ano (Coleção 11) ---
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
}

// =============================================================================
// 5. PIPELINE POR REGIÃO — ESTRATÉGIA evaluate (sem getInfo)
// =============================================================================
// Os exports só são criados após baixar, via evaluate(): a lista de granules
// (EVALUATE #1) e o total de pegadas filtradas (EVALUATE #2, p/ batching).

var GEDI_SELECTORS = [
  'lon_lowestmode', 'lat_lowestmode', 'agbd', 'agbd_se',
  'agbd_pi_lower', 'agbd_pi_upper', 'sensitivity', 'beam',
  'selected_algorithm', 'pft_class', 'region_class', 'landsat_treecover',
  'shot_number', 'delta_time'
];

var SAMPLE_PROPS = [
  'agbd', 'agbd_se', 'pft_class', 'shot_number',
  'lon_lowestmode', 'lat_lowestmode'
];

function pad3(n) { return ('000' + n).slice(-3); }

function processRegion(gridId, grid) {
  var aoi = ee.Geometry.BBox(grid.bbox[0], grid.bbox[1], grid.bbox[2], grid.bbox[3]);
  print('====== REGIAO:', grid.label, '(' + gridId + ') ======');
  Map.addLayer(aoi, { color: 'yellow' }, grid.label + ' - AOI', false);

  var DATE_START_STR = YEAR + '-01-01';
  var DATE_END_STR = (YEAR + 1) + '-01-01';

  // EVALUATE #1 — baixa a lista de granules antes de prosseguir
  discoverGranules(aoi, DATE_START_STR, DATE_END_STR, function (res) {
    var yearUsed = res.yearUsed;
    if (res.n === 0) {
      print('[AVISO] Sem granules em', YEAR, 'para', grid.label, '— tentando ano anterior...');
      discoverGranules(aoi, (YEAR - 1) + '-01-01', YEAR + '-01-01', function (res2) {
        yearUsed = res2.yearUsed;
        if (res2.n === 0) {
          print('[ERRO] Nenhum granule GEDI para', grid.label);
          return;
        }
        onGranulesReady(gridId, grid, aoi, res2.assets, yearUsed);
      });
    } else {
      onGranulesReady(gridId, grid, aoi, res.assets, yearUsed);
    }
  });
}

// Roda SÓ depois do EVALUATE #1 (granules baixados).
function onGranulesReady(gridId, grid, aoi, assets, yearUsed) {
  print('[OK] Granules:', assets.length, '· ano:', yearUsed);

  // FeatureCollection filtrada (server-side) — junta todos os granules
  var fcServer = ee.FeatureCollection(assets.map(function (tid) {
    return filterGedi(ee.FeatureCollection(tid), aoi);
  })).flatten();
  
  print('fcServer',fcServer.limit(10))
  Map.addLayer(fcServer,{},'fcServer');
  // EVALUATE #2 — baixa o total de pegadas filtradas
  fcServer.size().evaluate(function (total) {
    print('[OK] Pegadas filtradas:', total);
    if (total === 0) {
      print('[AVISO] Nenhuma pegada após filtros para', grid.label, '— pulando.');
      return;
    }
    runMain(gridId, grid, aoi, fcServer, yearUsed, total);
  });
}

// FUNÇÃO PRINCIPAL — roda SÓ depois dos dois evaluates (granules + total).
function runMain(gridId, grid, aoi, fcServer, yearUsed, total) {
  var stack = buildCovariateStack(aoi, yearUsed);

  // Diagnóstico não-bloqueante
  stack.bandNames().evaluate(function (bands) {
    print('[OK] Stack:', bands.length, 'bandas');
  });

  // Teste sampleRegions em 3 features
  var testSample = stack.sampleRegions({
    collection: fcServer.limit(3), properties: SAMPLE_PROPS,
    scale: SCALE, geometries: false, tileScale: 8
  });
  testSample.evaluate(function (sample) {
    print('[DEBUG] sampleRegions teste (3):', sample);
  });

  createFootprintExports(gridId, grid, fcServer, yearUsed);
  createSampleExports(gridId, grid, fcServer, stack, yearUsed, total);
  print('[FIM]', grid.label);
}

// Saída 1 — footprints GEDI filtrados (sem covariáveis)
function createFootprintExports(gridId, grid, fcServer, yearUsed) {
  if (!EXPORT_FOOTPRINTS) return;

  if (EXPORT_TO_DRIVE) {
    var nameFoot = 'GEDI_L4A_AGB_' + yearUsed + '_' + gridId + '_filtered';
    Export.table.toDrive({
  collection: fcServer, description: "WS_CARBONO_toDrive-"+ nameFoot, folder: EXPORT_FOLDER,
      fileNamePrefix: nameFoot, fileFormat: 'CSV', selectors: GEDI_SELECTORS
    });
    print('[EXPORT] Drive:', nameFoot + '.csv');
  }

  if (EXPORT_TO_ASSET) {
    var assetFoot = ASSET_BASE + '/footprint_' + gridId + '_' + yearUsed;
    Export.table.toAsset({
  collection: fcServer, description: "WS_CARBONO_toAsset-"+ 'footprint_' + gridId + '_' + yearUsed,
      assetId: assetFoot
    });
    print('[EXPORT] Asset:', assetFoot);
  }
}

// Saída 2 — amostras com covariáveis (sampleRegions)
function createSampleExports(gridId, grid, fcServer, stack, yearUsed, total) {
  if (!EXPORT_SAMPLES) return;

  // Asset: uma FeatureCollection única (sem batch — o toAsset lida com o volume)
  if (EXPORT_TO_ASSET) {
    var sampledAll = stack.sampleRegions({
      collection: fcServer, properties: SAMPLE_PROPS,
      scale: SCALE, geometries: false, tileScale: 8
    });
    var assetSamp = ASSET_BASE + '/AGC_samples_' + gridId + '_' + yearUsed;
    Export.table.toAsset({
      collection: sampledAll, description:"WS_CARBONO_toAsset-"+ 'AGC_samples_' + gridId + '_' + yearUsed,
      assetId: assetSamp
    });
    print('[EXPORT] Asset:', assetSamp);
  }

  // Drive: batches de BATCH_SIZE (padrão do notebook)
  if (EXPORT_TO_DRIVE) {
    var fcList = fcServer.toList(total);
    var nBatches = Math.ceil(total / BATCH_SIZE);
    for (var b = 0; b < nBatches; b++) {
      var offset = b * BATCH_SIZE;
      var size = Math.min(BATCH_SIZE, total - offset);
      var fcBatch = ee.FeatureCollection(fcList.slice(offset, offset + size));
      var sampledBatch = stack.sampleRegions({
        collection: fcBatch, properties: SAMPLE_PROPS,
        scale: SCALE, geometries: false, tileScale: 8
      });
      var fname = 'AGC_samples_' + gridId + '_' + yearUsed + '_batch' + pad3(b + 1);
      Export.table.toDrive({
        collection: sampledBatch, description: fname, folder: EXPORT_FOLDER,
        fileNamePrefix: fname, fileFormat: 'CSV'
      });
      print('[EXPORT] Drive:', fname + '.csv');
    }
  }
}

// =============================================================================
// 6. EXECUÇÃO — LOOP SOBRE AS REGIÕES ATIVAS
// =============================================================================

print('MAPBIOMAS-CARBONO · Coleção 0 · AGC GEDI (Drive + Asset)');
print('Grids:', ACTIVE_GRIDS.join(', '));
ACTIVE_GRIDS.forEach(function (gridId) {
  var grid = GRIDS[gridId];
  if (!grid) { print('[ERRO] Grid', gridId, 'não encontrado'); return; }
  processRegion(gridId, grid);
});

// =============================================================================
// 7. LEGENDA MAPBIOMAS COL. 11 — INTELIGÊNCIA (BLOCO COPÁVEL)
// =============================================================================
// Legenda oficial da Coleção 11 (paleta brasil.mapbiomas.org), incl. classes
// novas: 7 Savana Alagada (β), 77 Formação Herbácea Arbustiva, 84 Marisma (β)
// e 91 Parque eólico (β). MAPBIOMAS_VIS usa bands/min/max/palette; a legenda
// discreta é adicionada por addMapBiomasLegend() (canto inferior esquerdo).

var MAPBIOMAS_LEGEND = {
  3:  { nome: 'Formação Florestal',             cor: '#1f8d49' },
  4:  { nome: 'Formação Savânica',               cor: '#7dc975' },
  5:  { nome: 'Mangue',                           cor: '#04381d' },
  6:  { nome: 'Floresta Alagável',               cor: '#007785' },
  7:  { nome: 'Savana Alagada (β)',              cor: '#228c70' },
  9:  { nome: 'Silvicultura',                     cor: '#7a5900' },
  11: { nome: 'Campo Alagado e Área Pantanosa',  cor: '#519799' },
  12: { nome: 'Formação Campestre',               cor: '#86b074' },
  15: { nome: 'Pastagem',                         cor: '#edde8e' },
  18: { nome: 'Agricultura',                      cor: '#e974ed' },
  19: { nome: 'Lavoura Temporária',               cor: '#c27ba0' },
  20: { nome: 'Cana',                             cor: '#db7093' },
  21: { nome: 'Mosaico de Usos',                  cor: '#ffefc3' },
  23: { nome: 'Praia, Duna e Areal',              cor: '#ffa07a' },
  24: { nome: 'Área Urbanizada',                   cor: '#d4271e' },
  25: { nome: 'Outras Áreas Não Vegetadas',       cor: '#db4d4f' },
  29: { nome: 'Afloramento Rochoso',               cor: '#ad5100' },
  30: { nome: 'Mineração',                         cor: '#9c0027' },
  31: { nome: 'Aquicultura',                       cor: '#091077' },
  32: { nome: 'Apicum',                            cor: '#fc8114' },
  33: { nome: 'Rio, Lago e Oceano',               cor: '#2532e4' },
  35: { nome: 'Dendê',                             cor: '#9065d0' },
  36: { nome: 'Lavoura Perene',                    cor: '#d082de' },
  39: { nome: 'Soja',                              cor: '#f5b3c8' },
  40: { nome: 'Arroz',                             cor: '#c71585' },
  41: { nome: 'Outras Lavouras Temporárias',      cor: '#f54ca9' },
  46: { nome: 'Café',                              cor: '#d68fe2' },
  47: { nome: 'Citrus',                            cor: '#9932cc' },
  48: { nome: 'Outras Lavouras Perenes',          cor: '#e6ccff' },
  49: { nome: 'Restinga Arbórea',                  cor: '#02d659' },
  50: { nome: 'Restinga Herbácea ou Arbustiva',   cor: '#ffaa5f' },
  62: { nome: 'Algodão (β)',                       cor: '#ff69b4' },
  75: { nome: 'Usina Fotovoltaica',                cor: '#757272' },
  77: { nome: 'Formação Herbácea Arbustiva',      cor: '#86b074' },
  84: { nome: 'Marisma (β)',                       cor: '#81dbbf' },
  91: { nome: 'Parque eólico (β)',                 cor: '#403d3e' }
};

// Nível 1 da legenda (5 classes) — resumo para navegação
var MAPBIOMAS_LEVEL1 = [
  { codigo: 1,  nome: 'Floresta',                   cor: '#1f8d49' },
  { codigo: 10, nome: 'Veg. Herbácea e Arbustiva',  cor: '#d6bc74' },
  { codigo: 14, nome: 'Agropecuária',               cor: '#ffefc3' },
  { codigo: 22, nome: 'Área não Vegetada',          cor: '#d4271e' },
  { codigo: 26, nome: "Corpo d'Água",               cor: '#2532e4' }
];

// visParams prontos (bands/min/max/palette), palette alinhada por código.
var MAPBIOMAS_VIS = (function () {
  var codes = Object.keys(MAPBIOMAS_LEGEND).map(function (k) { return parseInt(k, 10); });
  var maxCode = Math.max.apply(null, codes);
  var palette = [];
  for (var i = 0; i <= maxCode; i++) { palette.push('#000000'); }
  codes.forEach(function (c) { palette[c] = MAPBIOMAS_LEGEND[c].cor; });
  return { bands: ['classification'], min: 0, max: maxCode, palette: palette };
})();

function addMapBiomasLegend() {
  var legend = ui.Panel({
    style: {
      position: 'bottom-left',
      margin: '0px',
      padding: '0px',
      fontSize: '12px',
      maxHeight: '60%'
    }
  });
  legend.add(ui.Label('MapBiomas Col. 11', { fontWeight: 'bold', margin: '0px', padding: '0px' }));
  Object.keys(MAPBIOMAS_LEGEND).forEach(function (code) {
    var item = MAPBIOMAS_LEGEND[code];
    var swatch = ui.Label('', { backgroundColor: item.cor, width: '12px', height: '12px', margin: '0px', padding: '0px' });
    var label = ui.Label(item.nome + ' (' + code + ')', { margin: '0px', padding: '0px' });
    legend.add(ui.Panel([swatch, label], ui.Panel.Layout.flow('horizontal'), { margin: '0px', padding: '0px' }));
  });
  Map.add(legend);
}

// Diagnóstico (não interfere nos exports): LULC C11 + limite do bioma + legenda.
var lulcVis = ee.Image(
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/'
  + 'mapbiomas_brazil_collection11_coverage_v3')
  .select('classification_' + YEAR)
  .rename('classification');
Map.addLayer(lulcVis, MAPBIOMAS_VIS, 'MapBiomas LULC Col 11', false);
Map.addLayer(
  ee.FeatureCollection(BIOME_FC).filter(ee.Filter.eq(BIOME_PROP, BIOME_NAME)),
  { color: 'red' }, 'Limite ' + BIOME_NAME, false);
addMapBiomasLegend();