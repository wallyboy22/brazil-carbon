/******************************************************************************
 * Pantanal Grassland v02 · 2_1 — Amostragem de parcelas de campo p/ calibração
 * ---------------------------------------------------------------------------
 * Lê o asset de parcelas (c.FIELD.ASSET) com biomassa medida, amostra as
 * covariáveis (reflectância anual) em cada parcela e exporta a MATRIZ de
 * calibração (asset + CSV no Drive) para o gate offline `2_3_gcn` refitar o
 * modelo log-linear (Fonseca) e devolver biomass_model.json ao contrato.
 *
 * Propriedades esperadas em c.FIELD.ASSET:
 *   · c.FIELD.BIOMASS_PROP ('biomass_kg_ha')  → biomassa seca medida
 *   · c.FIELD.DATE_PROP    ('date')           → data da medida (opcional)
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 2_1_amostras_campo_toAsset');

if (!c.FIELD.ASSET) {
  print('[AVISO] c.FIELD.ASSET = null → configurar o asset de parcelas (' +
    c.FIELD.BIOMASS_PROP + ') e rodar este step + 2_3_gcn para calibrar.');
  print('[AVISO] Rodando com coeficientes provisórios:', c.BIOMASS_MODEL.source);
}

var region = src.getBiome().geometry();
var covarBands = ['red', 'green', 'nir', 'swir1', 'swir2', 'ndvi', 'ndwi'];

// Estatísticas ANUAIS das covariáveis mensais (média/min/max por banda).
var monthlyCol = ee.ImageCollection(c.YEARS.map(function (year) {
  return ee.ImageCollection([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .map(function (month) {
      return src.monthlyReflectance(year, month);
    }));
}).flatten());
var covar = monthlyCol.select(covarBands)
  .reduce(ee.Reducer.mean().combine(ee.Reducer.minMax(), null, true))
  .select(['red_mean', 'green_mean', 'nir_mean', 'swir1_mean', 'swir2_mean',
    'ndvi_mean', 'ndwi_mean', 'ndvi_min', 'ndvi_max'])
  .float().clip(region);

// Amostra nas parcelas (polígonos → média; pontos → pixel) e prepara tabela.
var campo = c.FIELD.ASSET
  ? ee.FeatureCollection(c.FIELD.ASSET)
    .filterBounds(region)
    .filter(ee.Filter.notNull([c.FIELD.BIOMASS_PROP]))
  : ee.FeatureCollection([]);
var tabela = covar.sampleRegions({
  collection: campo,
  properties: [c.FIELD.BIOMASS_PROP, c.FIELD.DATE_PROP].filter(function (p) { return p; }),
  scale: c.SCALE, tileScale: 2, geometries: false
}).map(function (f) {
  return f.set({ ano: c.YEAR, fonte: c.BIOMASS_MODEL.source })
    .setGeometry(null);
}).filter(ee.Filter.notNull(['red_mean', 'green_mean', 'nir_mean', 'swir1_mean',
  'swir2_mean', 'ndvi_mean', 'ndwi_mean']));

tabela.size().evaluate(function (n) {
  print('[MATRIZ] parcelas amostradas:', n);
  if (n === 0) {
    print('[AVISO] nenhuma parcela válida — confira c.FIELD.ASSET.');
    return;
  }
  src.ensureFolder(c.ASSET_ROOT.replace(/\/V02$/, '/FIELD'));
  var assetId = c.ASSET_ROOT.replace(/\/V02$/, '/FIELD/matriz_campo_' + c.YEAR);
  Export.table.toAsset({
    collection: tabela, description: 'WS_CARBONO_toAsset-matriz_campo_v02',
    assetId: assetId
  });
  Export.table.toDrive({
    collection: tabela, description: 'WS_CARBONO_toDrive-matriz_campo_v02',
    folder: 'MAPBIOMAS_CARBONO_CAMPO',
    fileNamePrefix: 'matriz_campo_' + c.YEAR,
    fileFormat: 'CSV'
  });
  print('[OK] matriz de calibração →', assetId,
    '· usada pelo gate 2_3_gcn (fit → biomass_model.json).');
});