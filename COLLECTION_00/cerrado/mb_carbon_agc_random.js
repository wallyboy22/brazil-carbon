/**
 * =============================================================================
 * PROJETO : MAPBIOMAS-CARBONO — Coleção 0 · CERRADO (amostras de pontos aleatórios)
 * VERSÃO  : v001
 * SCRIPT  : COLLECTION_00/cerrado/mb_carbon_agc_random.js
 * AMBIENTE: GEE Code Editor (code.earthengine.google.com)
 * -----------------------------------------------------------------------------
 * DESCRIÇÃO
 *   Variante AGNÓSTICA A GEDI do fluxo do Cerrado. Em vez de footprints GEDI
 *   L4A, gera pontos PSEUDOALEATÓRIOS (reprodutíveis via seed) no interior do
 *   bioma Cerrado e extrai o MESMO stack de covariáveis
 *   (HLS/PALSAR/HAND/ERA5-CWD/MapBiomas C11) nesses pontos.
 *
 *   GARANTIA DE LOCALIZAÇÃO: o AOI (grid) é interseccionado com o polígono do
 *   bioma Cerrado (IBGE) ANTES de gerar os pontos — todos os lat/long caem no
 *   Cerrado. Cada ponto sai com as colunas id, lon e lat + as 36 bandas de
 *   covariáveis (a "mesma informação" do fluxo GEDI).
 *
 *   Export duplicado para Google Drive (CSV) e Assets GEE (FeatureCollection).
 *   A pasta do Drive fica COMENTADA de propósito — descomente para habilitar.
 *
 *   ASSÍNCRONO (sem getInfo): evaluate() usado apenas para diagnóstico
 *   (bandNames); a contagem de pontos é conhecida (N_POINTS).
 *
 * -----------------------------------------------------------------------------
 * COMO USAR
 *   1) Crie as pastas-pai no Assets GEE (aba Assets > NEW > Folder):
 *        MAPBIOMAS / CARBON / MAPPING / COLLECTION_00 / CERRADO_FOREST / SAMPLES
 *   2) Configure YEAR, N_POINTS e RANDOM_SEED abaixo.
 *   3) Para exportar os CSVs ao Drive, DESCOMENTE a linha do EXPORT_FOLDER.
 *   4) Run > monitore na aba TASKS.
 * -----------------------------------------------------------------------------
 * EQUIPE : MAPBIOMAS-CARBONO / IPAM Amazônia
 * PORTE  : COLLECTION_00/cerrado/mb_carbon_agc.js -> mb_carbon_agc_random.js
 * -----------------------------------------------------------------------------
 * HISTÓRICO
 *   v001 (ago/2026): variante agnóstica a GEDI — pontos aleatórios no Cerrado.
 * =============================================================================
 */

// =============================================================================
// 0. CONFIG
// =============================================================================

// Ano de referência (covariáveis e MapBiomas)
var YEAR = 2023;

// Escala de extração das covariáveis (m)
var SCALE = 30;

// Número de pontos aleatórios gerados por grid (todos caem no Cerrado)
var N_POINTS = 10000;

// Semente dos pontos pseudoaleatórios (reprodutibilidade entre runs)
var RANDOM_SEED = 42;

// Tamanho do batch para o export em CSV (Drive) — evita arquivo gigante
var BATCH_SIZE = 1000;

// Pasta de destino no Google Drive.
// DEIXADA COMENTADA DE PROPÓSITO — descomente para exportar os CSVs:
// var EXPORT_FOLDER = 'GEE_Exports_AGC-v3';

// Base dos assets (pastas-pai devem existir no Assets GEE)
var ASSET_BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/CERRADO_FOREST/SAMPLES';

// Toggles de DESTINO (Drive só funciona com EXPORT_FOLDER descomentado)
var EXPORT_TO_DRIVE = true;   // CSV no Google Drive (requer EXPORT_FOLDER)
var EXPORT_TO_ASSET = true;   // FeatureCollection em Assets GEE

// Bioma de referência (IBGE) — recorta os pontos AO Cerrado
var BIOME_FC = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
var BIOME_PROP = 'Bioma';     // nome da propriedade do bioma (ajuste se preciso)
var BIOME_NAME = 'CERRADO';   // valor a filtrar

// =============================================================================
// 1. REGISTRO DE GRIDS / REGIÕES
// =============================================================================
// Cada entrada: 'id' -> { label: 'nome', bbox: [xmin, ymin, xmax, ymax] }
// Os pontos são gerados DENTRO de aoi ∩ Cerrado (bioma IBGE), então todo
// ponto exportado tem lat/long no Cerrado mesmo que o bbox "vaze" um pouco.
var GRIDS = {

  // ---------------------------------------------------------------------------
  // --- CERRADO INTERIOR: grid dedicado (GO/TO/MG) — padrão desta variante ---
  // ---------------------------------------------------------------------------
  'cerrado_interior': { label: 'Cerrado interior (GO/TO/MG)', bbox: [-50.0, -17.0, -45.0, -12.0] },

  // ---------------------------------------------------------------------------
  // --- OUTRAS OPÇÕES (14 tiles do Cerrado — descomente para usar) ------------
  // ---------------------------------------------------------------------------
  // 't0_0': { label: 'Tile 0_0 (Cerrado)', bbox: [-61.458984375, -25.2905778530068, -56.196533203125, -19.441233308006183] },
  // 't0_1': { label: 'Tile 0_1 (Cerrado)', bbox: [-56.196533203125, -25.2905778530068, -50.93408203125, -19.441233308006183] },
  // 't0_2': { label: 'Tile 0_2 (Cerrado)', bbox: [-50.93408203125, -25.2905778530068, -45.671630859375, -19.441233308006183] },
  // 't0_3': { label: 'Tile 0_3 (Cerrado)', bbox: [-45.671630859375, -25.2905778530068, -40.4091796875, -19.441233308006183] },
  // 't1_0': { label: 'Tile 1_0 (Cerrado)', bbox: [-61.458984375, -19.441233308006183, -56.196533203125, -13.591888763005564] },
  // 't1_1': { label: 'Tile 1_1 (Cerrado)', bbox: [-56.196533203125, -19.441233308006183, -50.93408203125, -13.591888763005564] },
  // 't1_2': { label: 'Tile 1_2 (Cerrado)', bbox: [-50.93408203125, -19.441233308006183, -45.671630859375, -13.591888763005564] },
  // 't1_3': { label: 'Tile 1_3 (Cerrado)', bbox: [-45.671630859375, -19.441233308006183, -40.4091796875, -13.591888763005564] },
  // 't2_0': { label: 'Tile 2_0 (Cerrado)', bbox: [-61.458984375, -13.591888763005564, -56.196533203125, -7.742544218004948] },
  // 't2_1': { label: 'Tile 2_1 (Cerrado)', bbox: [-56.196533203125, -13.591888763005564, -50.93408203125, -7.742544218004948] },
  // 't2_2': { label: 'Tile 2_2 (Cerrado)', bbox: [-50.93408203125, -13.591888763005564, -45.671630859375, -7.742544218004948] },
  // 't2_3': { label: 'Tile 2_3 (Cerrado)', bbox: [-45.671630859375, -13.591888763005564, -40.4091796875, -7.742544218004948] },
  // 't3_2': { label: 'Tile 3_2 (Cerrado)', bbox: [-50.93408203125, -7.742544218004948, -45.671630859375, -1.8931996730043288] },
  // 't3_3': { label: 'Tile 3_3 (Cerrado)', bbox: [-45.671630859375, -7.742544218004948, -40.4091796875, -1.8931996730043288] },

  // ---------------------------------------------------------------------------
  // --- OUTRAS REGIÕES (exemplos — ajuste as coordenadas para uma nova área)
  // ---------------------------------------------------------------------------
  // 'maranhao': { label: 'Maranhao', bbox: [-48.75, -10.25, -41.25, -1.0] },
};

// =============================================================================
// 2. REGIÕES ATIVAS — LOOP DE EXPORT
// =============================================================================
//   Só interior        ->  var ACTIVE_GRIDS = ['cerrado_interior'];
//   Interior + tile    ->  var ACTIVE_GRIDS = ['cerrado_interior', 't0_0'];
//   Todos              ->  var ACTIVE_GRIDS = Object.keys(GRIDS);
var ACTIVE_GRIDS = ['cerrado_interior'];

// =============================================================================
// 3. FUNÇÕES — COVARIÁVEIS (todas server-side)
// =============================================================================

// --- 3a. HLS: máscara de nuvem/sombra/cirrus (Fmask) + índices espectrais ---
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

// Monta o stack integrado de covariáveis (porta do notebook, seções 6–8).
// HLS P10/P50/P90/AMP (24) + PALSAR-2 (4) + HAND (2) + ERA5/CWD (5) + MapBiomas (1) = 36 bandas
function buildCovariateStack(aoi, yearUsed) {
  var dStart = yearUsed + '-01-01';
  var dEnd = (yearUsed + 1) + '-01-01';   // fim EXCLUSIVO — filterDate é [inicio, fim)

  // --- 3b. HLS: composição anual P10/P50/P90/AMP dos índices espectrais ---
  var hlsL = ee.ImageCollection('NASA/HLS/HLSL30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_L, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsS = ee.ImageCollection('NASA/HLS/HLSS30/v002')
    .filterBounds(aoi).filterDate(dStart, dEnd)
    .select(BAND_S, BAND_NAME).map(maskHlsClouds).map(addSpectralIndices);
  var hlsStack = percentileComposite(hlsL.merge(hlsS), IDX_BANDS);

  // --- 3c. PALSAR-2: retroespalhamento (dB), razão HV/HH e RVI ---
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

  // --- 3d. HAND: altura em relação à drenagem + classes geomorfológicas ---
  var handCont = ee.ImageCollection('users/gena/global-hand/hand-100').mosaic().rename('HAND_m');
  var handClass = ee.Image(0)
    .where(handCont.lt(5), 1)
    .where(handCont.gte(5).and(handCont.lt(15)), 2)
    .where(handCont.gte(15).and(handCont.lt(45)), 3)
    .where(handCont.gte(45), 4)
    .rename('geomorph_class');
  var handStack = handCont.addBands(handClass);

  // --- 3e. ERA5-Land: CWD (atual/climatológico/3yr) + temperatura + precipitação ---
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

  // --- 3f. MapBiomas: classe de uso e cobertura do ano (Coleção 11, coverage v3) ---
  // Obs.: se o asset da C11 ainda não estiver acessível no GEE, reverter p/ o
  // fallback da C10.1 (bloco comentado logo abaixo).
  var mapbiomasLulc = ee.Image(
    'projects/mapbiomas-public/assets/brazil/lulc/collection11/'
    + 'mapbiomas_brazil_collection11_coverage_v3')
    .select('classification_' + yearUsed)
    .rename('mapbiomas_lulc')
    .toFloat();
  // var mapbiomasLulc = ee.Image(          // FALLBACK: Coleção 10.1
  //   'projects/mapbiomas-public/assets/brazil/lulc/collection10_1/'
  //   + 'mapbiomas_brazil_collection10_1_coverage_v1')
  //   .select('classification_' + yearUsed)
  //   .rename('mapbiomas_lulc')
  //   .toFloat();

  return hlsStack
    .addBands(palsarStack)
    .addBands(handStack)
    .addBands(climateStack)
    .addBands(mapbiomasLulc)
    .clip(aoi);
}

// =============================================================================
// 4. PIPELINE — PONTOS ALEATÓRIOS NO CERRADO (sem GEDI)
// =============================================================================
// Substitui a descoberta de granules GEDI pela geração de pontos server-side:
//   aoi ∩ Cerrado -> randomPoints(N_POINTS, seed) -> id/lon/lat -> sampleRegions
// O total de pontos é conhecido (N_POINTS) — não há evaluate de contagem.

var POINT_PROPS = ['id', 'lon', 'lat'];

function pad3(n) { return ('000' + n).slice(-3); }

function makeCerradoPoints(aoi) {
  var bioma = ee.FeatureCollection(BIOME_FC)
    .filter(ee.Filter.eq(BIOME_PROP, BIOME_NAME))
    .geometry();
  var aoiCerr = aoi.intersection(bioma, 1000);
  var pts = ee.FeatureCollection.randomPoints(aoiCerr, N_POINTS, RANDOM_SEED);
  return pts.map(function (f) {
    var coords = f.geometry().coordinates();
    return f.set({
      id: f.get('system:index'),
      lon: coords.get(0),
      lat: coords.get(1)
    });
  });
}

function processRegion(gridId, grid) {
  var aoi = ee.Geometry.BBox(grid.bbox[0], grid.bbox[1], grid.bbox[2], grid.bbox[3]);
  print('==================== REGIAO: ' + grid.label + ' (' + gridId + ') ====================');
  Map.addLayer(aoi, { color: 'yellow' }, grid.label + ' - AOI', false);

  var pts = makeCerradoPoints(aoi);
  var stack = buildCovariateStack(aoi, YEAR);

  // Diagnóstico não-bloqueante (não atrasa a criação dos exports)
  stack.bandNames().evaluate(function (bands) {
    print('[OK] Stack de covariáveis montado (' + bands.length + ' bandas).');
  });

  createSampleExports(gridId, grid, pts, stack);
  print('==================== FIM: ' + grid.label + ' ====================\n');
}

// Saída — amostras com covariáveis (sampleRegions) em pontos aleatórios
function createSampleExports(gridId, grid, pts, stack) {
  // Asset: uma FeatureCollection única (sem batch — o toAsset lida com o volume)
  if (EXPORT_TO_ASSET) {
    var sampledAll = stack.sampleRegions({
      collection: pts, properties: POINT_PROPS,
      scale: SCALE, geometries: false, tileScale: 8
    });
    var assetSamp = ASSET_BASE + '/random_samples_' + gridId + '_' + YEAR;
    Export.table.toAsset({
      collection: sampledAll, description: 'random_samples_' + gridId + '_' + YEAR,
      assetId: assetSamp
    }).start();
    print('  [Asset ] ' + assetSamp);
  }

  // Drive: batches de BATCH_SIZE (só quando EXPORT_FOLDER estiver descomentado)
  if (EXPORT_TO_DRIVE && typeof EXPORT_FOLDER !== 'undefined') {
    var fcList = pts.toList(N_POINTS);
    var nBatches = Math.ceil(N_POINTS / BATCH_SIZE);
    for (var b = 0; b < nBatches; b++) {
      var offset = b * BATCH_SIZE;
      var size = Math.min(BATCH_SIZE, N_POINTS - offset);
      var fcBatch = ee.FeatureCollection(fcList.slice(offset, offset + size));
      var sampledBatch = stack.sampleRegions({
        collection: fcBatch, properties: POINT_PROPS,
        scale: SCALE, geometries: false, tileScale: 8
      });
      var fname = 'random_samples_' + gridId + '_' + YEAR + '_batch' + pad3(b + 1);
      Export.table.toDrive({
        collection: sampledBatch, description: fname, folder: EXPORT_FOLDER,
        fileNamePrefix: fname, fileFormat: 'CSV'
      }).start();
      print('  [Drive ] ' + fname + '.csv (offset ' + offset + ' -> ' + (offset + size) + ')');
    }
  } else {
    print('  [Drive ] desabilitado — descomente EXPORT_FOLDER para exportar os CSVs.');
  }
}

// =============================================================================
// 5. EXECUÇÃO — LOOP SOBRE AS REGIÕES ATIVAS
// =============================================================================

print('MAPBIOMAS-CARBONO · Coleção 0 · Amostras de pontos aleatórios (sem GEDI)');
print('Grids ativos neste Run: ' + (ACTIVE_GRIDS.length ? ACTIVE_GRIDS.join(', ') : '(nenhum)'));
print('Pontos por grid: ' + N_POINTS + ' (seed ' + RANDOM_SEED + ')');
print('Destinos: Drive=' + EXPORT_TO_DRIVE + ' · Asset=' + EXPORT_TO_ASSET);
print('');

ACTIVE_GRIDS.forEach(function (gridId) {
  var grid = GRIDS[gridId];
  if (!grid) {
    print('[ERRO] Grid "' + gridId + '" não encontrado no registro GRIDS.');
    return;
  }
  processRegion(gridId, grid);
});

print('\n[FIM] Script executado. Monitore as tasks na aba TASKS.');
print('      Assets: ' + ASSET_BASE);

// =============================================================================
// 6. LEGENDA MAPBIOMAS COL. 11 — INTELIGÊNCIA (BLOCO COPÁVEL)
// =============================================================================
// Legenda oficial de uso e cobertura da Coleção 11 (níveis 1 e 2), com os
// códigos e as cores da paleta oficial (brasil.mapbiomas.org). Inclui as
// classes novas da C11: 7 Savana Alagada (β), 77 Formação Herbácea Arbustiva,
// 84 Marisma (β) e 91 Parque eólico (β).
//
// USO:
//   MAPBIOMAS_LEGEND    -> objeto código -> {nome, cor} (lógica/filtros)
//   MAPBIOMAS_LEVEL1    -> resumo das 5 classes do nível 1
//   MAPBIOMAS_VIS       -> visParams prontos (bands/min/max/palette)
//   addMapBiomasLegend() -> legenda discreta no canto inferior esquerdo

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

// visParams prontos: banda 'classification', min/max cobrindo os códigos e
// palette gerada a partir de MAPBIOMAS_LEGEND (alinhada por código, sem shift).
var MAPBIOMAS_VIS = (function () {
  var codes = Object.keys(MAPBIOMAS_LEGEND).map(function (k) { return parseInt(k, 10); });
  var maxCode = Math.max.apply(null, codes);
  var palette = [];
  for (var i = 0; i <= maxCode; i++) { palette.push('#000000'); }
  codes.forEach(function (c) { palette[c] = MAPBIOMAS_LEGEND[c].cor; });
  return { bands: ['classification'], min: 0, max: maxCode, palette: palette };
})();

// Legenda discreta no canto inferior esquerdo.
// Regras: margin/padding 0px, font-size 12px, max-height 60% (com scroll).
function addMapBiomasLegend() {
  var legend = ui.Panel({
    style: {
      position: 'bottom-left',
      margin: '0px',
      padding: '0px',
      fontSize: '12px',
      maxHeight: '60%',
      overflow: 'auto'
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

// Diagnóstico (não interfere nos exports): LULC da C11 no ano YEAR + legenda.
var lulcVis = ee.Image(
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/'
  + 'mapbiomas_brazil_collection11_coverage_v3')
  .select('classification_' + YEAR)
  .rename('classification');
Map.addLayer(lulcVis, MAPBIOMAS_VIS, 'MapBiomas LULC Col 11', false);
addMapBiomasLegend();