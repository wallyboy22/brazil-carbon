/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · run · 00_diagnose_territories
 * ---------------------------------------------------------------------------
 * Diagnóstico dos assets de limite IBGE usados pelo motor de estatísticas:
 * propriedades do bioma, mapeamento de UFs e teste do encode da banda
 * `territory` (bioma×100 + UF).
 *
 * Uso no Code Editor: só rodar.
 *   · [BIOMA] lista as propriedades do 1º feature e os valores distintos;
 *   · [UF]    lista {CD_UF, SIGLA_UF, NM_UF} de todas as UFs;
 *   · [TERR]  histograma dos códigos de `territory` no Pantanal (esperado 6xx).
 ******************************************************************************/
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_limits.js');

print('======================================================================');
print('DIAGNÓSTICO · territórios IBGE');
print('  BIOMES_FC:', LIM.BIOMES_FC);
print('  UFS_FC   :', LIM.UFS_FC);
print('======================================================================');

/* ---- Biomas: propriedades do 1º feature + valores distintos ---------------- */
ee.FeatureCollection(LIM.BIOMES_FC).first().toDictionary().evaluate(function (props) {
  print('[BIOMA] propriedades do 1º feature:', props);
  var keys = Object.keys(props || {});
  keys.forEach(function (k) {
    ee.FeatureCollection(LIM.BIOMES_FC).aggregate_array(k).evaluate(function (vals) {
      print('[BIOMA]', k, '→', vals);
    });
  });
});

/* ---- UFs: mapeamento CD_UF / SIGLA_UF / NM_UF ------------------------------- */
ee.FeatureCollection(LIM.UFS_FC).map(function (f) {
  return ee.Feature(null, {
    CD_UF: f.get('CD_UF'),
    SIGLA_UF: f.get('SIGLA_UF'),
    NM_UF: f.get('NM_UF')
  });
}).evaluate(function (fc) {
  var rows = (fc.features || []).map(function (f) { return f.properties; });
  print('[UF] mapeamento (' + rows.length + '):', rows);
});

/* ---- Teste do encode do território (bioma×100 + UF) no Pantanal ------------- */
var biomeImg = ee.Image().paint(
  ee.FeatureCollection(LIM.BIOMES_FC).map(function (f) {
    return f.set('_b', ee.Number.parse(f.get(LIM.BIOME_CODE_PROP)));
  }), '_b');
var ufImg = ee.Image().paint(
  ee.FeatureCollection(LIM.UFS_FC).map(function (f) {
    return f.set('_u', ee.Number.parse(f.get(LIM.UF_CODE_PROP)));
  }), '_u');
var terrImg = biomeImg.multiply(100).add(ufImg).rename('territory').int();
var pantanal = ee.FeatureCollection(LIM.BIOMES_FC)
  .filter(ee.Filter.eq(LIM.BIOME_NAME_PROP, 'Pantanal')).first().geometry();
terrImg.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: pantanal, scale: 1000, maxPixels: 1e13
}).evaluate(function (d) {
  print('[TERR] histograma de `territory` no Pantanal (esperado: 6xx):', d);
});
