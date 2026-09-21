/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_0_EXPORT_FOOTPRINT_BAP
 * ---------------------------------------------------------------------------
 * Pré-requisito da variante GEDI sobre a Bacia do Alto Paraguai (BAP):
 * extrai os footprints GEDI L4A v2.1 FILTRADOS sobre a BAP e exporta um asset
 * por ano (`SAMPLES/footprint_bap_<ANO>`).
 *
 * O footprint histórico (`footprint_pantanal_2023`) cobre só o bioma Pantanal;
 * como o domínio da v08/BAP passou a ser Pantanal + Planalto, os footprints
 * GEDI precisam cobrir toda a Bacia.
 *
 * Filtros de qualidade (porta do v00/mb_carbon_agc.js — filterGedi):
 *   l4_quality_flag=1 · degrade_flag=0 · agbd>0 · erro relativo <50% ·
 *   sensitivity>=0.95 · 8 beams (0,1,2,3,5,6,8,11) · solar_elevation<0.
 *
 * COMO USAR (GEE Code Editor):
 *   1) Ajuste YEARS (série multi-ano) e DRIVE_ROOT se quiser CSV.
 *   2) Run > monitore as tasks; cada ano exporta um asset.
 *   3) Os assets gerados já são lidos por getFootprints() da variante GEDI.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
var YEARS = [2019, 2020, 2021, 2022, 2023, 2024];  // série multi-ano (GEDI L4A v2.1)
var EXPORT_TO_ASSET = true;
var EXPORT_TO_DRIVE = false;                       // CSV (opcional)
var EXPORT_FOLDER = 'GEE_Exports_AGC-v3';

// Pasta de samples compartilhada (irmã do footprint_pantanal_2023)
var SAMPLES_ROOT = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/' +
  'COLLECTION_00/PANTANAL_FOREST/SAMPLES';

var GEDI_SELECTORS = [
  'lon_lowestmode', 'lat_lowestmode', 'agbd', 'agbd_se',
  'agbd_pi_lower', 'agbd_pi_upper', 'sensitivity', 'beam',
  'selected_algorithm', 'pft_class', 'region_class', 'landsat_treecover',
  'shot_number', 'delta_time'
];

var DOMAIN = src.getBiome().geometry();

// ---------------------------------------------------------------------------
// Filtros GEDI L4A v2.1
// ---------------------------------------------------------------------------
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
  fc = fc.filter(ee.Filter.lt('rel_error', 0.5));
  fc = fc.filter(ee.Filter.gte('sensitivity', 0.95));
  fc = fc.filter(ee.Filter.inList('beam', [0, 1, 2, 3, 5, 6, 8, 11]));
  fc = fc.filter(ee.Filter.lt('solar_elevation', 0));
  return fc.filterBounds(aoi);
}

/** Granules (table_id) do GEDI no domínio e ano (time_start é STRING ISO). */
function discoverGranules(aoi, year, callback) {
  var start = year + '-01-01';
  var end = (year + 1) + '-01-01';
  var idx = ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002_INDEX')
    .filter(ee.Filter.gt('time_start', start + 'T00:00:00Z'))
    .filter(ee.Filter.lt('time_start', end + 'T00:00:00Z'))
    .filterBounds(aoi);
  idx.aggregate_array('table_id').distinct().evaluate(function (assets) {
    callback(assets || []);
  });
}

// ---------------------------------------------------------------------------
// Pipeline (encadeado por ano — 1 evaluate por ano)
// ---------------------------------------------------------------------------
function processYear(year) {
  print('====== ANO:', year, '· domínio BAP ======');
  discoverGranules(DOMAIN, year, function (assets) {
    if (!assets.length) {
      print('[AVISO] Sem granules GEDI em', year, '— pulando.');
      nextYear(year);
      return;
    }
    var fcServer = ee.FeatureCollection(assets.map(function (tid) {
      return filterGedi(ee.FeatureCollection(tid), DOMAIN);
    })).flatten();

    fcServer.size().evaluate(function (total) {
      print('[OK] Granules:', assets.length, '· pegadas filtradas:', total);
      if (total === 0) {
        print('[AVISO] Nenhuma pegada após filtros em', year, '— pulando.');
        nextYear(year);
        return;
      }
      if (EXPORT_TO_ASSET) {
        var assetId = SAMPLES_ROOT + '/footprint_bap_' + year;
        Export.table.toAsset({
          collection: fcServer,
          description: 'WS_CARBONO_toAsset-footprint_bap_' + year,
          assetId: assetId
        });
        print('[TASK] Asset:', assetId);
      }
      if (EXPORT_TO_DRIVE) {
        var name = 'GEDI_L4A_AGB_' + year + '_bap_filtered';
        Export.table.toDrive({
          collection: fcServer, description: 'WS_CARBONO_toDrive-' + name,
          folder: EXPORT_FOLDER, fileNamePrefix: name, fileFormat: 'CSV',
          selectors: GEDI_SELECTORS
        });
        print('[TASK] Drive:', name + '.csv');
      }
      nextYear(year);
    });
  });
}

var _i = 0;
function nextYear(year) {
  _i += 1;
  if (_i < YEARS.length) {
    processYear(YEARS[_i]);
  } else {
    print('[FIM] Footprints BAP exportados para', SAMPLES_ROOT);
  }
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_0_export_footprint_bap');
print('[DOMÍNIO]', c.BAP_ASSET, '· anos', YEARS);
print('[SAÍDA]', SAMPLES_ROOT + '/footprint_bap_<ANO>');
src.ensureFolder(SAMPLES_ROOT);
if (YEARS.length) processYear(YEARS[0]);
