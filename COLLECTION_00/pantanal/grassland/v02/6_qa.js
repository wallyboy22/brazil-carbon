/******************************************************************************
 * Pantanal Grassland v02 · QA comparativo
 * ---------------------------------------------------------------------------
 * 1. Cobertura: v01 (campos apenas) × v02 (bioma inteiro − água);
 * 2. Faixas de suporte: biomassa/ANPP/carbono v02 no bioma e no subset campo;
 * 3. Clamp: fração de pixels no limite de suporte do modelo (indício de
 *    saturação espectral fora do treino);
 * 4. Diferença v02 − v01 na sobreposição (o que mudou ao abrir o domínio);
 * 5. Ordem: inspeção visual → números → estatística (7_statistics).
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');

var BIOME_GEO = src.getBiome().geometry();
var V01 = c.ASSET_ROOT.replace('V02', 'V01');
var V02 = c.ASSET_ROOT;

function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) { return false; }
}

function statsOf(image, name, geom, scale, cb) {
  image.reduceRegion({
    reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), null, true),
    geometry: geom, scale: scale, maxPixels: 1e13, bestEffort: true
  }).evaluate(function (v) {
    var flat = {};
    Object.keys(v).forEach(function (k) { flat[k + '_qa'] = v[k]; });
    print(name, JSON.stringify(flat));
    cb && cb(v);
  }, function (err) {
    print('[ERRO]', name, String(err).slice(0, 200));
  });
}

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 6_qa');
print('[MODEL]', c.BIOMASS_MODEL.source, '· clamp',
  JSON.stringify(c.BIOMASS_MODEL.clampMgHa));

// 1) Cobertura: campos C11 × bioma−água (domínio dos produtos v02).
var maskC11 = src.getGrasslandMask(c.YEAR);
[{ label: 'campos C11', m: maskC11 },
  { label: 'bioma − água', m: src.getWaterMask(c.YEAR).not() }].forEach(function (it) {
  it.m.rename('cov').updateMask(it.m).reduceRegion({
    reducer: ee.Reducer.sum(), scale: c.SCALE, maxPixels: 1e13, geometry: BIOME_GEO
  }).evaluate(function (px) {
    var ha = (px['cov'] || 0) * c.SCALE * c.SCALE / 10000;
    print('[COBERTURA]', it.label, Math.round(ha / 10000), 'mil ha');
  });
});

// 3) Clamp / suporte biomassa v02.
var bioV02 = ee.Image(V02 + '/BIOMASS/grassland_biomass_annual_v02_2023');
var clamped = bioV02.select('biomass_annual');
var atBound = clamped.gte(c.BIOMASS_MODEL.clampMgHa.max)
  .or(clamped.lte(c.BIOMASS_MODEL.clampMgHa.min));
var flag = ee.Image.constant(1).where(clamped.selfMask(), atBound)
  .updateMask(clamped).rename('b_flag');
flag.reduceRegion({
  reducer: ee.Reducer.mean(), scale: 1000, maxPixels: 1e9,
  geometry: BIOME_GEO
}).evaluate(function (v) {
  print('[CLAMP] fração dos pixels no limite do suporte:', v['b_flag'].toFixed(4),
    '(<0.05 esperado; se maior, estrato fora do treino)');
}, function (err) {
  print('[ERRO] clamp', String(err).slice(0, 200));
});

// 2) Faixas v02.
statsOf(bioV02, '[V02 biomassa anual Mg/ha · bioma]', BIOME_GEO, c.SCALE);
statsOf(bioV02.updateMask(maskC11),
  '[V02 biomassa anual Mg/ha · campos C11]', BIOME_GEO, c.SCALE);
statsOf(ee.Image(V02 + '/ANPP/grassland_anpp_annual_v02_2023'),
  '[V02 anpp anual kg MS/ha · bioma]', BIOME_GEO, c.SCALE);
statsOf(ee.Image(V02 + '/CARBON/grassland_carbon_stock_v02_2023'),
  '[V02 carbono Mg C/ha · bioma]', BIOME_GEO, c.SCALE);

// 4) Diferença v02 − v01 na sobreposição.
var bioV01Id = V01 + '/BIOMASS/grassland_biomass_annual_v01_2023';
if (assetExists(bioV01Id)) {
  var bioV01 = ee.Image(bioV01Id).select('biomass_annual');
  var diff = bioV02.select('biomass_annual').subtract(bioV01)
    .rename('diff_v02_v01');
  statsOf(diff, '[V02−V01 biomassa anual · suporte v01]', BIOME_GEO, c.SCALE);
  Map.addLayer(bioV02.select('biomass_annual'),
    { min: 0, max: 12, palette: ['ffffcc', '78c679', '006837'] },
    'Biomassa anual v02 (toda área)', true);
  Map.addLayer(diff,
    { min: -3, max: 3, palette: ['d7191c', 'ffffff', '1a9641'] },
    'Diferença v02−v01 (suporte v01)', false);
} else {
  print('[AVISO] v01 não encontrado:', bioV01Id, '— QA comparativo parcial.');
  Map.addLayer(bioV02.select('biomass_annual'),
    { min: 0, max: 12, palette: ['ffffcc', '78c679', '006837'] },
    'Biomassa anual v02 (toda área)', true);
}