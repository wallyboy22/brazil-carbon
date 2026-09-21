/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · run · 00_diagnose_territories
 * ---------------------------------------------------------------------------
 * Diagnóstico dos assets de território usados pelo app de visualização:
 *   · BIOMA: propriedades do 1º feature + valores distintos;
 *   · UF:    mapeamento CD_UF / SIGLA_UF / NM_UF;
 *   · NÍVEIS: lista as regiões de cada nível (bioma/uf/regiao/brasil).
 *
 * Uso no Code Editor: só rodar.
 ******************************************************************************/
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_limits.js');
var REG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_regions.js');

print('======================================================================');
print('DIAGNÓSTICO · territórios (view/v00)');
print('  BIOMES_FC:', LIM.BIOMES_FC);
print('  UFS_FC   :', LIM.UFS_FC);
print('======================================================================');

/* ---- Biomas: propriedades do 1º feature + valores distintos ---------------- */
ee.FeatureCollection(LIM.BIOMES_FC).first().toDictionary().evaluate(function (props) {
  print('[BIOMA] propriedades do 1º feature:', props);
  Object.keys(props || {}).forEach(function (k) {
    ee.FeatureCollection(LIM.BIOMES_FC).aggregate_array(k).evaluate(function (vals) {
      print('[BIOMA]', k, '→', vals);
    });
  });
});

/* ---- UFs: mapeamento CD_UF / SIGLA_UF / NM_UF ------------------------------- */
ee.FeatureCollection(LIM.UFS_FC).map(function (f) {
  return ee.Feature(null, {
    CD_UF: f.get(LIM.UF_CODE_PROP),
    SIGLA_UF: f.get(LIM.UF_SIGLA_PROP),
    NM_UF: f.get(LIM.UF_NAME_PROP)
  });
}).evaluate(function (fc) {
  var rows = (fc.features || []).map(function (f) { return f.properties; });
  print('[UF] mapeamento (' + rows.length + '):', rows);
});

/* ---- Níveis: regiões listadas por nível ------------------------------------ */
REG.order.forEach(function (id) {
  REG.regionNames(id, function (names) {
    print('[NÍVEL]', id, '(' + (REG.levels[id].label) + ') ·',
      names.length, 'regiões →', names.slice(0, 30));
  });
});
