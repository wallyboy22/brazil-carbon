/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Preflight
 * ---------------------------------------------------------------------------
 * Mostra a fonte, o domínio (BAP) e as bandas do contrato, e desenha a floresta
 * (C11) + o stack de covariáveis em uma CÉLULA-AMOSTRA (recorte pequeno).
 * A máscara/stack NÃO são montados sobre a BAP inteira (isso estoura o limite
 * de memória interativo); o pipeline de produção (2_2/4) já é por célula.
 * O filtro de treino (floresta + notNull) é aplicado no 2_2; a predição não é
 * mascarada por LULC.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

// Célula-amostra (primeira da grade 4×4) — recorte pequeno p/ diagnóstico.
var cell = c.makeCellDefinitions(4)[0];
var AOI = ee.Geometry.BBox(cell.bbox[0], cell.bbox[1], cell.bbox[2], cell.bbox[3])
  .intersection(src.getBiome().geometry(), ee.ErrorMargin(30));

var stack = src.buildTypedCovariatesStack(AOI, c.YEAR);
var forestMask = stack.select('mapbiomas_lulc')
  .remap(c.FOREST_CLASSES, c.FOREST_CLASSES.map(function () { return 1; }), 0)
  .selfMask();

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 1_preflight');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
print('[DOMÍNIO]', c.BAP_ASSET);
print('[AOI AMOSTRA]', cell.id);
print('[MODELO]', 'v08 — fix PALSAR global + ensemble RF N=' +
  c.ENSEMBLE.NUM_MEMBERS + ', minLeaf=' + c.MIN_LEAF_POP +
  ', log=' + c.LOG_TARGET);
print('[CLASSES FLORESTAIS C11]', c.FOREST_CLASSES);
print('[FILTRO] floresta (mapbiomas_lulc ∈ ' + c.FOREST_CLASSES +
  ') + notNull(FEATURE_BANDS) → aplicados no 2_2 (por célula)');
print('[MASK MODE]', c.MASK_MODE, '— a saída da predição NÃO é mascarada por LULC');
print('[FIX] PALSAR global: mediana anual no bioma, DN<=0 = nodata');
print('[FEATURE_BANDS]', c.FEATURE_BANDS);
print('[CONTINUOUS_BANDS]', c.CONTINUOUS_BANDS);
print('[CATEGORICAL_BANDS]', c.CATEGORICAL_BANDS);
print('[IMPORTANTE] ImageCollection de predições criada automaticamente em ' +
  c.ASSET_ROOT + '/PREDICTIONS/COL no passo 4.');

Map.addLayer(forestMask, { palette: ['#1a9850'] },
  'Floresta C11 (v08) [' + cell.id + ']', true);
Map.addLayer(stack.select('mapbiomas_lulc'), { min: 0, max: 91 },
  'LULC C11 (v08) [' + cell.id + ']', false);
Map.addLayer(stack.select('HV_db'), { min: -24, max: -8 },
  'HV_db global (v08) [' + cell.id + ']', false);
