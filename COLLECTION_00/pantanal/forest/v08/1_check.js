/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 1_CHECK (diagnóstico único)
 * ---------------------------------------------------------------------------
 * Substitui `1_preflight.js` + `2_0_check_footprint.js`: num só Run imprime
 *   · fonte/domínio e bandas do contrato;
 *   · contagem dos footprints crus (getFootprints) e PFT (GEDI);
 *   · floresta (C11) + stack tipado numa CÉLULA-AMOSTRA (recorte pequeno).
 * NÃO exporta nada — é só diagnóstico. A célula-amostra evita o limite de
 * memória interativo (a BAP inteira estoura); a produção (2_1/2_2/3/4/5) é
 * por célula.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 1_check');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
print('[DOMÍNIO]', c.BAP_ASSET);
print('[MODELO]', 'v08 · ensemble RF N=' + c.ENSEMBLE.NUM_MEMBERS +
  ', minLeaf=' + c.MIN_LEAF_POP);
print('[FOREST_CLASSES]', c.FOREST_CLASSES);
print('[FILTRO] floresta (mapbiomas_lulc ∈ FOREST_CLASSES) + notNull(FEATURE_BANDS) → no 2_2');
print('[FEATURE_BANDS]', c.FEATURE_BANDS);
print('[CONTINUOUS_BANDS]', c.CONTINUOUS_BANDS);
print('[CATEGORICAL_BANDS]', c.CATEGORICAL_BANDS);

// --- footprints crus (contagem) ---------------------------------------------
var raw = src.getFootprints();
raw.size().evaluate(
  function (n) { print('[FOOTPRINTS]', n); },
  function (e) { print('[ERRO FOOTPRINTS]', e); });
if (c.SOURCE === 'gedi') {
  raw.distinct('pft_class').aggregate_array('pft_class').evaluate(
    function (p) { print('[PFT]', p); },
    function (e) { print('[ERRO PFT]', e); });
}

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
