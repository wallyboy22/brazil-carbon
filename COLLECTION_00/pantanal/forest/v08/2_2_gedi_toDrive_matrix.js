/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_2_GEDI_TODRIVE_MATRIX
 * ---------------------------------------------------------------------------
 * Matriz de covariáveis por CÉLULA × ANO (TRAIN_YEARS) da fonte **GEDI**, com
 * dupla saída:
 *   - DRIVE (CSV): para o gate offline no Google Colab (2_3_gcn) — leitura
 *     direta com pandas, geração de figuras, thinning espacial, champion.json
 *   - ASSET (tabela): FeatureCollection server-side usada no treino (3_)
 * Colunas extras: lon, lat (para thinning/diagnóstico espacial) e w =
 * 1/agbd_se² (peso do rótulo, recomendação A4 da consulta v07).
 *
 * Fonte FIXA em GEDI (não depende de `c.SOURCE`). Para a variante IFN use
 * `2_2_ifn_toDrive_matrix.js`. Pré-requisito: `2_1_gedi_toAsset_samples_treino.js`.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

var SOURCE = 'gedi';   // script fixo nesta fonte
var S = c.SOURCES[SOURCE];
var CELL_SPLIT = 4;
var TILE_SCALE = 16;
var matrixRoot = S.assetRoot + '/MATRIX';
var biome = src.getDomain().geometry();
// Pasta raiz no Google Drive destino do CSV (Export.table.toDrive).
// NOTA: o GEE NÃO cria subpastas — o caminho vira um nome único de pasta.
var DRIVE_ROOT = 'mapbiomas_carbono';

// Toggles de destino: ASSET (treino) e/ou DRIVE CSV (gate offline/figures).
var EXPORT_TO_ASSET = true;
var EXPORT_TO_DRIVE = true;

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_2_gedi_toDrive_matrix');
print('[FONTE]', SOURCE, '·', S.label, '· raiz', S.assetRoot);

var points = {};
c.TRAIN_YEARS.forEach(function (y) {
  // Amostras de treino do 2_1: um asset por recorte (forest_footprint_<SRC>_<ANO>_<cell>)
  // → mescla todos os recortes por prefixo.
  var prefix = 'forest_footprint_' + SOURCE + '_' + c.YEAR + '_';
  var resp = ee.data.listAssets(S.assetRoot + '/SAMPLES');
  var assets = (resp.assets || []).filter(function (a) {
    return a.type === 'TABLE' && a.id.indexOf('/' + prefix) > -1;
  });
  if (!assets.length) {
    throw new Error('Sem amostras de treino (' + prefix + '*) em ' +
      S.assetRoot + '/SAMPLES — rode o 2_1 da fonte (' + SOURCE + ').');
  }
  print('[AMOSTRAS]', assets.length, 'recorte(s) de treino');
  points[y] = ee.FeatureCollection(assets.map(function (a) {
    return ee.FeatureCollection(a.id);
  })).flatten();
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
  if (!def) {
    print('[AVISO] célula fora de byId — sem bbox para exportar:', id);
    return;
  }
  var geom = ee.Geometry.BBox(def.bbox[0], def.bbox[1], def.bbox[2], def.bbox[3])
    .intersection(biome, ee.ErrorMargin(30));
  c.TRAIN_YEARS.forEach(function (year) {
    var wprop = S.weightProp;   // 'agbd_se' (gedi) ou null (ifn)
    var required = c.FEATURE_BANDS.concat([c.TARGET]);
    if (wprop) required = required.concat([wprop]);
    var sampled = src.buildTypedCovariatesStack(geom, year)
      .sampleRegions({ collection: points[year].filterBounds(geom),
        properties: src.getSampleProps(SOURCE), scale: c.SCALE,
        geometries: true, tileScale: TILE_SCALE })
      .filter(ee.Filter.and(
        ee.Filter.notNull(required),
        ee.Filter.inList('mapbiomas_lulc', c.FOREST_CLASSES)))
      .map(function (f) {
        var lon = f.geometry().centroid(30).coordinates().get(0);
        var lat = f.geometry().centroid(30).coordinates().get(1);
        var w = wprop
          ? ee.Number(1).divide(
            ee.Number(ee.Algorithms.If(f.get(wprop), f.get(wprop), 1))
              .max(1).pow(2))
          : ee.Number(1);
        return f.set('lon', lon).set('lat', lat).set('w', w);
      });
    var name = 'agb_matrix_' + SOURCE + '_v08_' + id + '_' + year;
    print('[TASK]', name);
    // ASSET (server-side, para o treino)
    if (EXPORT_TO_ASSET) {
      Export.table.toAsset({ collection: sampled,
        description: 'WS_CARBONO_toAsset-' + name,
        assetId: matrixRoot + '/' + name });
    }
    // DRIVE (CSV, para o gate offline / figures)
    if (EXPORT_TO_DRIVE) {
      Export.table.toDrive({ collection: sampled,
        description: 'WS_CARBONO_toDrive-' + name,
        folder: DRIVE_ROOT, fileNamePrefix: name,
        fileFormat: 'CSV' });
    }
  });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_2_gedi_toDrive_matrix');
print('[DRIVE ROOT]', DRIVE_ROOT,
  '(pasta única — o GEE não cria subpastas; CSVs caem na raiz do balde)');
print('[ASSET ROOT]', matrixRoot);
src.ensureFolder(matrixRoot);
cells.aggregate_array('cell_id').evaluate(function (ids) {
  print('[CÉLULAS]', ids.length); ids.forEach(exportCell);
}, function (err) {
  print('[ERRO no aggregate_array de cells]', err);
});
