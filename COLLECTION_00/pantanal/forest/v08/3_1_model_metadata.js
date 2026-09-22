/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Proveniência do modelo
 * ---------------------------------------------------------------------------
 * `ee.Classifier` NÃO é `ee.Element` → não tem `.set()`, então a proveniência
 * das covariáveis NÃO pode ser anexada durante o treino (`3_0_model_training`).
 * Este passo grava as propriedades nos assets de modelo JÁ EXPORTADOS.
 *
 * Uso: rodar APÓS as tasks de `3_0_model_training.js` concluírem.
 * FONTE: com `SOURCE=null` (ambíguo) processa as DUAS fontes em sequência.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var N = c.ENSEMBLE.NUM_MEMBERS;

/** Aplica propriedades num asset existente (setAssetProperties; fallback updateAsset). */
function setProps(assetId, props) {
  try {
    ee.data.setAssetProperties(assetId, props);
    return 'setAssetProperties';
  } catch (e1) {
    try {
      ee.data.updateAsset(assetId, { properties: props }, ['properties']);
      return 'updateAsset';
    } catch (e2) {
      throw new Error('falha ao gravar propriedades: ' +
        (e1.message || e1) + ' | ' + (e2.message || e2));
    }
  }
}

function exists(assetId) {
  try { ee.data.getAsset(assetId); return true; } catch (e) { return false; }
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 3_1_model_metadata');
print('[COVARIATES] versão', src.COVARIATES_VERSION, '· n temas =',
  src.COVARIATES_REGISTRY.length);
print('[FONTES]', c.sourcesToRun().join(', '), '(SOURCE=' + c.SOURCE + ')');

var registry = JSON.stringify(src.COVARIATES_REGISTRY);

c.sourcesToRun().forEach(function (source) {
  var S = c.SOURCES[source];
  var root = S.assetRoot;
  print('\n' + '#'.repeat(68));
  print('# FONTE:', source, '·', S.label, '· raiz', root);
  print('#'.repeat(68));
  var ok = 0, falta = 0, erro = 0;
  for (var i = 1; i <= N; i++) {
    var assetId = root + '/MODELS/rf_agb_v08_m' + i;
    if (!exists(assetId)) {
      print('[FALTA]', assetId, '— rode 3_0_model_training e aguarde as tasks.');
      falta++;
      continue;
    }
    try {
      var via = setProps(assetId, {
        covariates_registry: registry,
        covariate_version: src.COVARIATES_VERSION,
        model_version: 'v08',
        source: source,
        ensemble_member: i
      });
      print('[OK]', assetId, '· via', via);
      ok++;
    } catch (e) {
      print('[ERRO]', assetId, '—', e.message || e);
      erro++;
    }
  }
  print('[FIM ' + source + '] ok:', ok, '· faltando:', falta, '· erro:', erro);
});
