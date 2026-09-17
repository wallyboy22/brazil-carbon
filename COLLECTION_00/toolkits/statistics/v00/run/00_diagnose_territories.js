/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · run · 00_diagnose_territories
 * ---------------------------------------------------------------------------
 * Diagnóstico dos assets de limite IBGE usados pelo motor de estatísticas.
 * Descobre a propriedade NUMÉRICA correta do bioma (o paint por `GEOCODE`/
 * `CD_BIOMA` no asset ORIGINAIS saiu vazio) e confirma o mapeamento de UFs.
 *
 * Uso no Code Editor: só rodar.
 *   · [BIOMA] lista as propriedades do 1º feature e os valores distintos;
 *   · [UF]    lista {CD_UF, SIGLA_UF, NM_UF} de todas as UFs.
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
