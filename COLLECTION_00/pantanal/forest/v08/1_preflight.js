/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Preflight
 * ---------------------------------------------------------------------------
 * Mostra a fonte, o domínio (BAP) e as bandas do contrato, e desenha a máscara
 * de treino + o stack de covariáveis em uma CÉLULA-AMOSTRA (recorte pequeno).
 * A máscara/stack NÃO são montados sobre a BAP inteira (isso estoura o limite
 * de memória interativo); o pipeline de produção (2_2/4) já é por célula.
 * A máscara é de TREINO — não mascara a saída da predição.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

// Célula-amostra (primeira da grade 4×4) — recorte pequeno p/ diagnóstico.
var cell = c.makeCellDefinitions(4)[0];
var AOI = ee.Geometry.BBox(cell.bbox[0], cell.bbox[1], cell.bbox[2], cell.bbox[3])
  .intersection(src.getBiome().geometry(), ee.ErrorMargin(30));

var mask = src.getTrainingMask(c.YEAR).clip(AOI);
var stack = src.buildTypedCovariatesStack(AOI, c.YEAR);

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 1_preflight');
print('[FONTE]', c.SOURCE, '·', c.SOURCE_CFG.label);
print('[DOMÍNIO]', c.BAP_ASSET);
print('[AOI AMOSTRA]', cell.id);
print('[MODELO]', 'v08 — fix PALSAR global + ensemble RF N=' +
  c.ENSEMBLE.NUM_MEMBERS + ', minLeaf=' + c.MIN_LEAF_POP +
  ', log=' + c.LOG_TARGET);
print('[CLASSES FLORESTAIS C11 (treino)]', c.FOREST_CLASSES);
print('[TRAINING_MASKS]', c.TRAINING_MASKS.map(function (m) { return m.name; }));
print('[MASK MODE]', c.MASK_MODE, '— a saída da predição NÃO será mascarada por LULC');
print('[FIX] PALSAR global: mediana anual no bioma, DN<=0 = nodata');
print('[FEATURE_BANDS]', c.FEATURE_BANDS);
print('[CONTINUOUS_BANDS]', c.CONTINUOUS_BANDS);
print('[CATEGORICAL_BANDS]', c.CATEGORICAL_BANDS);
print('[IMPORTANTE] ImageCollection de predições criada automaticamente em ' +
  c.ASSET_ROOT + '/PREDICTIONS/COL no passo 4.');

Map.addLayer(mask, { palette: ['#1a9850'] },
  'Treino mask C11 + palsar (v08) [' + cell.id + ']', true);
Map.addLayer(stack.select('mapbiomas_lulc'), { min: 0, max: 91 },
  'LULC C11 (v08) [' + cell.id + ']', false);
Map.addLayer(stack.select('HV_db'), { min: -24, max: -8 },
  'HV_db global (v08) [' + cell.id + ']', false);
