/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 1_CHECK (diagnóstico único)
 * ---------------------------------------------------------------------------
 * Substitui `1_preflight.js` + `2_0_check_footprint.js`: num só Run imprime
 *   · fonte/domínio e bandas do contrato;
 *   · contagem dos footprints crus (getFootprints) e PFT (GEDI) — por fonte;
 *   · floresta (C11) + stack tipado numa CÉLULA-AMOSTRA (recorte pequeno).
 * NÃO exporta nada — é só diagnóstico. A célula-amostra evita o limite de
 * memória interativo (a BAP inteira estoura); a produção (2_1/2_2/3_0/4_0) é
 * por célula/fonte.
 *
 * FONTE: com `SOURCE=null` (ambíguo) inspeciona as DUAS fontes.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

var CHAMPION = {
  gedi: { minLeafPopulation: 5 },
  ifn: { minLeafPopulation: 10 }
};

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 1_check');
print('[DOMÍNIO]', c.BAP_ASSET);
print('[MODELO]', 'v08 · ensemble RF N=' + c.ENSEMBLE.NUM_MEMBERS + ' (linear)');
print('[FOREST_CLASSES]', c.FOREST_CLASSES);
print('[FILTRO] floresta (mapbiomas_lulc ∈ FOREST_CLASSES) + notNull(FEATURE_BANDS) → no 2_2');
print('[FEATURE_BANDS]', c.FEATURE_BANDS);
print('[CONTINUOUS_BANDS]', c.CONTINUOUS_BANDS);
print('[CATEGORICAL_BANDS]', c.CATEGORICAL_BANDS);
print('[FONTES]', c.sourcesToRun().join(', '), '(SOURCE=' + c.SOURCE + ')');

// --- footprints crus (contagem) por fonte -----------------------------------
c.sourcesToRun().forEach(function (source) {
  var S = c.SOURCES[source];
  var champ = CHAMPION[source] || {};
  print('\n#### FONTE:', source, '·', S.label,
    '· minLeaf', champ.minLeafPopulation, '· raiz', S.assetRoot, '####');
  var raw = src.getFootprints(source);
  raw.size().evaluate(
    function (n) { print('[FOOTPRINTS ' + source + ']', n); },
    function (e) { print('[ERRO FOOTPRINTS ' + source + ']', e); });
  if (source === 'gedi') {
    raw.distinct('pft_class').aggregate_array('pft_class').evaluate(
      function (p) { print('[PFT]', p); },
      function (e) { print('[ERRO PFT]', e); });
  }
});

// --- floresta + stack numa célula-amostra (recorte pequeno) -----------------
var cell = c.makeCellDefinitions(4)[0];
var AOI = ee.Geometry.BBox(cell.bbox[0], cell.bbox[1], cell.bbox[2], cell.bbox[3])
  .intersection(src.getDomain().geometry(), ee.ErrorMargin(30));
var stack = src.buildTypedCovariatesStack(AOI, c.YEAR);
var forestMask = stack.select('mapbiomas_lulc')
  .remap(c.FOREST_CLASSES, c.FOREST_CLASSES.map(function () { return 1; }), 0)
  .selfMask();

print('[AOI AMOSTRA]', cell.id);
Map.addLayer(forestMask, { palette: ['#1a9850'] },
  'Floresta C11 [' + cell.id + ']', true);
Map.addLayer(stack.select('mapbiomas_lulc'), { min: 0, max: 91 },
  'LULC C11 [' + cell.id + ']', false);
Map.addLayer(stack.select('HV_db'), { min: -24, max: -8 },
  'HV_db global [' + cell.id + ']', false);
