/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · 2_2_TODRIVE_MATRIX
 * ---------------------------------------------------------------------------
 * Matriz de covariáveis por CÉLULA × ANO (TRAIN_YEARS), com dupla saída:
 *   - DRIVE (CSV): para o gate offline no Google Colab (2_3_gcn) — leitura
 *     direta com pandas, geração de figuras, thinning espacial, champion.json
 *   - ASSET (tabela): FeatureCollection server-side usada no treino (3_)
 * Colunas extras: lon, lat (para thinning/diagnóstico espacial) e w =
 * 1/agbd_se² (peso do rótulo, recomendação A4 da consulta v07).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v07/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v07/0_covariate_source.js');
var CELL_SPLIT = 4;
var TILE_SCALE = 16;
var matrixRoot = c.ASSET_ROOT + '/MATRIX';
var biome = src.getBiome().geometry();
// Pasta raiz no Google Drive destino do CSV (Export.table.toDrive)
var DRIVE_ROOT = 'mapbiomas_carbono/pantanal_forest/v07/matriz';

var points = {};
c.TRAIN_YEARS.forEach(function (y) {
  points[y] = ee.FeatureCollection(c.ASSET_ROOT + '/SAMPLES/forest_footprint_v07_' + y);
});

var cells = c.makeCellFeatures(CELL_SPLIT).map(function (cell) {
  var geom = cell.geometry().intersection(biome, ee.ErrorMargin(30));
  return cell.set({
    valid_area: geom.area(30),
    n_points: points[c.YEAR].filterBounds(geom).size()
  });
}).filter(ee.Filter.gt('valid_area', 0)).filter(ee.Filter.gt('n_points', 0));

var byId = {};
c.makeCellDefinitions(CELL_SPLIT).forEach(function (cell) { byId[cell.id] = cell; });

function exportCell(id) {
  var def = byId[id];
  var geom = ee.Geometry.BBox(def.bbox[0], def.bbox[1], def.bbox[2], def.bbox[3])
    .intersection(biome, ee.ErrorMargin(30));
  c.TRAIN_YEARS.forEach(function (year) {
    var sampled = src.buildTypedCovariatesStack(geom, year)
      .sampleRegions({ collection: points[year].filterBounds(geom),
        properties: src.SAMPLE_PROPS, scale: c.SCALE,
        geometries: true, tileScale: TILE_SCALE })
      .filter(ee.Filter.notNull(c.FEATURE_BANDS.concat([c.TARGET, 'agbd_se'])))
      .map(function (f) {
        var lon = f.geometry().centroid(30).coordinates().get(0);
        var lat = f.geometry().centroid(30).coordinates().get(1);
        var se = ee.Number(f.get('agbd_se')).max(1);
        return f.set('lon', lon).set('lat', lat).set('w', ee.Number(1).divide(se.pow(2)));
      });
    var name = 'agc_matrix_v07_' + id + '_' + year;
    print('[TASK]', name);
    // ASSET (server-side, para o treino)
    Export.table.toAsset({ collection: sampled,
      description: 'WS_CARBONO_toAsset-' + name,
      assetId: matrixRoot + '/' + name });
    // DRIVE (CSV, para o gate offline / figures)
    Export.table.toDrive({ collection: sampled,
      description: 'WS_CARBONO_toDrive-' + name,
      folder: DRIVE_ROOT, fileNamePrefix: name,
      fileFormat: 'CSV' });
  });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v07 · 2_2_toDrive_matrix');
print('[DRIVE ROOT]', DRIVE_ROOT);
print('[ASSET ROOT]', matrixRoot);
src.ensureFolder(matrixRoot);
cells.aggregate_array('cell_id').evaluate(function (ids) {
  print('[CÉLULAS]', ids.length); ids.forEach(exportCell);
});