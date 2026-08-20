/**
 * MAPBIOMAS-CARBONO — Coleção 0 · CERRADO · Convergência IFN ↔ GEDI L4A
 * Encontra parcelas IFN (polígonos) que intersectam footprints GEDI L4A
 * (buffer 30m), agrega propriedades GEDI (mediana) às parcelas IFN,
 * exporta para Asset GEE e Drive (CSV).
 *
 * COMO USAR:
 *   1) Configure YEARS (apenas um ativo).
 *   2) Verifique IFN_ASSET e SAMPLES_BASE.
 *   3) Run > monitore na aba TASKS.
 */

// =============================================================================
// 0. CONFIG
// =============================================================================

// Anos — apenas um ativo, outros comentados
// var YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
var YEARS = [2023];  // ANO ATIVO

// Assets
var IFN_ASSET = 'projects/ee-ipam/assets/IFN/IFN_2026_Field_Cerrado';
var SAMPLES_BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/CERRADO_FOREST/SAMPLES';
var EXPORT_FOLDER = 'GEE_Exports_AGC-v3';

// Buffer IFN para capturar footprint GEDI (raio ~25m + margem)
var GEDI_BUFFER_M = 30;

// =============================================================================
// 1. FUNÇÕES — GEDI
// =============================================================================

// Descobre granules GEDI no AOI + janela [inicio, fim) — filtro string ISO 8601
function discoverGranules(aoi, start, end, callback) {
  var idx = ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002_INDEX')
    .filter(ee.Filter.gt('time_start', start + 'T00:00:00Z'))
    .filter(ee.Filter.lt('time_start', end + 'T00:00:00Z'))
    .filterBounds(aoi);
  idx.aggregate_array('table_id').distinct().evaluate(function (assets) {
    callback({ assets: assets, n: assets.length, yearUsed: parseInt(start.slice(0, 4), 10) });
  });
}

// Filtros de qualidade GEDI L4A v002
function filterGedi(fc) {
  fc = fc.filter(ee.Filter.eq('l4_quality_flag', 1));
  fc = fc.filter(ee.Filter.eq('degrade_flag', 0));
  fc = fc.filter(ee.Filter.gt('agbd', 0));
  fc = fc.map(function (f) {
    var agbd = ee.Number(f.get('agbd'));
    var agbd_se = ee.Number(f.get('agbd_se'));
    var rel = ee.Algorithms.If(agbd.gt(0), agbd_se.divide(agbd), ee.Number(99));
    return f.set('rel_error', rel);
  });
  fc = fc.filter(ee.Filter.lt('rel_error', 0.5));
  fc = fc.filter(ee.Filter.gte('sensitivity', 0.95));
  fc = fc.filter(ee.Filter.inList('beam', [0, 1, 2, 3, 5, 6, 8, 11]));
  fc = fc.filter(ee.Filter.lt('solar_elevation', 0));
  return fc;
}

// Propriedades GEDI para agregar (mediana + contagem)
var GEDI_PROPS = [
  'agbd', 'agbd_se', 'agbd_pi_lower', 'agbd_pi_upper',
  'shot_number', 'pft_class', 'beam', 'sensitivity',
  'rel_error', 'lon_lowestmode', 'lat_lowestmode'
];

// Redutor: mediana + contagem
var GEDI_REDUCER = ee.Reducer.median().combine(ee.Reducer.count(), '', true);

// =============================================================================
// 2. PROCESSAMENTO POR ANO
// =============================================================================

function processYear(year) {
  print('====== ANO: ' + year + ' ======');
  
  var dateStart = year + '-01-01';
  var dateEnd = (year + 1) + '-01-01';
  
  // Carregar IFN
  var IFN_FC = ee.FeatureCollection(IFN_ASSET);
  var IFN_count = IFN_FC.size();
  print('[INFO] IFN parcelas:', IFN_count);
  
  // Buffer IFN (30m)
  var IFN_buffered = IFN_FC.map(function(f) {
    return f.buffer(GEDI_BUFFER_M);
  });
  
  // AOI = bounds do IFN bufferado
  var aoi = IFN_buffered.geometry().bounds();
  Map.addLayer(aoi, { color: 'yellow' }, 'AOI IFN buffer ' + year, false);
  Map.addLayer(IFN_FC, { color: 'orange' }, 'IFN parcelas ' + year, false);
  
  // Descobrir granules GEDI
  discoverGranules(aoi, dateStart, dateEnd, function (res) {
    var yearUsed = res.yearUsed;
    var granules = res.assets;
    print('[OK] Granules encontrados:', granules.length, '· ano efetivo:', yearUsed);
    
    if (granules.length === 0) {
      print('[AVISO] Sem granules para ' + year + ' — pulando.');
      return;
    }
    
    // Processar cada granule: carregar, filtrar qualidade, intersectar IFN buffer
    var gediList = granules.map(function (tid) {
      var gedi = ee.FeatureCollection(tid);
      gedi = filterGedi(gedi);
      return gedi.filterBounds(IFN_buffered.geometry());
    });
    
    // Merge todos os granules filtrados
    var gedi_all = ee.FeatureCollection(gediList).flatten();
    
    // Join espacial: IFN buffer ↔ GEDI footprints
    var join = ee.Join.inner('gedi_match');
    var IFN_with_gedi = join.apply({
      primary: IFN_buffered,
      secondary: gedi_all,
      condition: ee.Filter.intersects('.geo', '.geo')
    });
    
    // Agregar GEDI por parcela IFN (mediana + contagem)
    var IFN_enriched = IFN_with_gedi.map(function (ifn) {
      var matches = ee.FeatureCollection(ifn.get('gedi_match'));
      var n = matches.size();
      
      // Reduzir propriedades GEDI
      var stats = matches.reduceColumns({
        reducer: GEDI_REDUCER,
        selectors: GEDI_PROPS
      });
      
      // Moda para pft_class e beam
      var pft_mode = matches.reduceColumns(ee.Reducer.mode(), ['pft_class']).get('mode');
      var beam_mode = matches.reduceColumns(ee.Reducer.mode(), ['beam']).get('mode');
      
      return ifn.set({
        'gedi_shot_count': n,
        'gedi_agbd_median': stats.get('agbd_median'),
        'gedi_agbd_se_median': stats.get('agbd_se_median'),
        'gedi_pft_class_mode': pft_mode,
        'gedi_beam_mode': beam_mode,
        'gedi_lon_median': stats.get('lon_lowestmode_median'),
        'gedi_lat_median': stats.get('lat_lowestmode_median')
      });
    });
    
    // Filtrar apenas IFN com matches
    var IFN_convergentes = IFN_enriched.filter(ee.Filter.gt('gedi_shot_count', 0));
    
    // Diagnóstico final
    IFN_convergentes.size().evaluate(function (total) {
      print('[RESULTADO] IFN convergentes:', total, '/', IFN_count);
      
      if (total === 0) {
        print('[AVISO] Nenhuma convergência IFN-GEDI para ' + yearUsed);
        return;
      }
      
      // Export Asset
      var assetId = SAMPLES_BASE + '/IFN_GEDI_convergencia_' + yearUsed;
      Export.table.toAsset({
        collection: IFN_convergentes,
        description: 'IFN_GEDI_convergencia_' + yearUsed,
        assetId: assetId
      }).start();
      print('[EXPORT] Asset:', assetId);
      
      // Export Drive
      Export.table.toDrive({
        collection: IFN_convergentes,
        description: 'IFN_GEDI_convergencia_' + yearUsed,
        folder: EXPORT_FOLDER,
        fileNamePrefix: 'IFN_GEDI_convergencia_' + yearUsed,
        fileFormat: 'CSV'
      }).start();
      print('[EXPORT] Drive:', EXPORT_FOLDER + '/IFN_GEDI_convergencia_' + yearUsed + '.csv');
    });
  });
}

// =============================================================================
// 3. EXECUÇÃO — LOOP SOBRE ANOS
// =============================================================================

print('MAPBIOMAS-CARBONO · IFN ↔ GEDI Convergência');
print('Anos:', YEARS);
print('IFN Asset:', IFN_ASSET);
print('Buffer:', GEDI_BUFFER_M + 'm');
print('');

YEARS.forEach(function (year) {
  processYear(year);
});