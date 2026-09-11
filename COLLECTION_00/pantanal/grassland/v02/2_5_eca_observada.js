/******************************************************************************
 * Pantanal Grassland v02 · 2_5_ECA_OBSERVADA (diagnóstico B6 da reflexão)
 * ---------------------------------------------------------------------------
 * ε aparente mensal por classe campestre C11 a partir das MESMAS entradas do
 * Monteith (fPAR/DSR), sem torre de fluxo:
 *
 *     ε_aparente (gC/MJ) = Σ GPP_MOD17 / Σ PARa   por mês e por classe
 *
 *   · GPP  → MODIS/061/MOD17A2H (banda Gpp, kg C/m² por período 8-dia, ×0.0001);
 *   · PARa → src.monthlyPara (MJ/m²/mês) — mesmas janelas do produto v02.
 *   · máscara: campos C11 (getGrasslandMask) ∩ GPP > 0 ∩ PARa > 0.
 *
 * Saída: CSV `grassland_eca_v02_<ano>.csv` no Drive para decidir se a εCA do
 * Pampa deve ser substituída por ε ajustada (reflexão B6: diferença > ±30% em
 * >2 meses → adotar tabela v02).
 *
 * Aviso (reflexão B6): o GPP do MOD17 tem assinatura própria; usar como
 * TENDÊNCIA/DIRECÇÃO, não como verdade absoluta.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_sensor_landsat_modis.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = c.YEAR;
var SCALE = c.SCALE;
var MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var DRIVE_FOLDER = 'MAPBIOMAS_CARBONO_ESTATISTICAS';

var mod17 = ee.ImageCollection('MODIS/061/MOD17A2H')
  .filter(ee.Filter.calendarRange(YEAR, YEAR, 'year'))
  .select('Gpp');

// Banda n0 do LULC (índice 4 no stack) — classe de rotulação.
var n0 = ee.Image(c.LULC_ASSET).select('classification_' + YEAR).rename('n0');
var grassMask = src.getGrasslandMask(YEAR);
var biome = src.getBiome().geometry();

// Sobre [gpp_kgC, para_MJ, area_ha, eps, n0] ⇒ soma+média por classe (campo 4).
var REDUCER = ee.Reducer.sum().combine(ee.Reducer.mean(), null, true)
  .group({ groupField: 4, groupName: 'classe' });

print('MAPBIOMAS-CARBONO · Pantanal Grassland v02 · 2_5_eca_observada');
print('[MÉTODO] ε aparente = ΣGPP / ΣPARa por classe C11 × mês (reflexão B6).');
print('[FONTE GPP] MOD17A2H (tendência, não verdade) · PARa = monthlyPara v02.');

function ecaImage(month) {
  var gpp = mod17.filter(ee.Filter.calendarRange(month, month, 'month'))
    .sum().multiply(0.0001);                       // kg C/m² no mês
  var para = src.monthlyPara(YEAR, month)
    .select('para_' + month);                      // MJ/m² no mês
  // Massas/energias do mês (bandas conservativas p/ razão de somas).
  var gppMass = gpp.multiply(ee.Image.pixelArea()).rename('gpp_kgC');
  var paraEnergy = para.multiply(ee.Image.pixelArea()).rename('para_MJ');
  var area = ee.Image.pixelArea().divide(10000).rename('area_ha');
  var eps = gpp.divide(para).multiply(1000).rename('eps'); // g C/MJ (pixel)
  var keep = grassMask.updateMask(gpp.gt(0)).updateMask(para.gt(0)).selfMask();
  return ee.Image.cat([gppMass, paraEnergy, area, eps]).addBands(n0)
    .updateMask(keep).clip(biome);
}

var rows = [];
var pending = MONTHS.length;

MONTHS.forEach(function (month) {
  ecaImage(month).reduceRegion({
    reducer: REDUCER, geometry: biome, scale: SCALE, maxPixels: 1e13, tileScale: 2
  }).get('groups').evaluate(function (groups) {
    groups = groups || [];
    groups.forEach(function (g) {
      var info = LEG.info(g['classe']);
      var epsRatio = g['para_MJ_sum'] > 0
        ? (g['gpp_kgC_sum'] / g['para_MJ_sum']) * 1000 : null;
      rows.push({ ano: YEAR, mes: month, classe: g['classe'], n0: info.n0,
        n1: info.n1, marcador: info.n2,
        area_ha: Math.round(g['area_ha_sum']),
        gpp_tC_mes: (g['gpp_kgC_sum'] / 1000).toFixed(1),
        para_GJ_mes: (g['para_MJ_sum'] / 1000).toFixed(1),
        eps_gCmJ: epsRatio ? epsRatio.toFixed(3) : 'NA',
        eps_pixel_mean: g['eps_mean'] ? g['eps_mean'].toFixed(3) : 'NA' });
    });
    print('[MÉS ' + month + ']', groups.length, 'classes');
    pending--;
    if (pending === 0) finish();
  }, function (err) {
    print('[ERRO mês ' + month + ']', String(err).slice(0, 200));
    pending--;
    if (pending === 0) finish();
  });
});

function finish() {
  rows.forEach(function (r) {
    print(r.mes, '|', r.n1, '| classe', r.classe, '| ε',
      r.eps_gCmJ, 'g C/MJ | GPP', r.gpp_tC_mes, 'tC | PARa',
      r.para_GJ_mes, 'GJ | área', r.area_ha, 'ha');
  });
  if (!rows.length) {
    print('[AVISO] nenhum dado de ε observada — checar GPP/PARa e máscara.');
    return;
  }
  Export.table.toDrive({
    collection: ee.FeatureCollection(rows.map(function (r2) {
      return ee.Feature(null, r2); })),
    description: 'WS_CARBONO_grassland_eca_' + YEAR,
    folder: DRIVE_FOLDER,
    fileNamePrefix: 'grassland_eca_v02_' + YEAR,
    fileFormat: 'CSV'
  });
  print('[OK] CSV ε observada →', DRIVE_FOLDER + '/grassland_eca_v02_' + YEAR + '.csv');
  print('[CRITÉRIO] comparar ε vs. ECA_MONTHLY do contrato; >±30% em >2 meses ' +
    '→ adotar ε ajustada (reflexão B6).');
}