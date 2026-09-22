/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Proveniência do modelo
 * ---------------------------------------------------------------------------
 * `ee.Classifier` NÃO é `ee.Element` (não tem `.set()`) e o asset do tipo
 * CLASSIFIER **não aceita** gravação de propriedades (setAssetProperties /
 * updateAsset → "type is not supported"). Por isso a proveniência é gravada
 * num **asset companheiro** por fonte:
 *     <ASSET_ROOT>/MODELS/metadata_v08_<source>   (FeatureCollection, 1 feature)
 * com: source, model_version, covariate_version, covariates_registry (JSON),
 *      num_members, members (lista dos assets de modelo), model_prefix.
 *
 * Uso: rodar APÓS as tasks de `3_0_model_training.js` concluírem.
 * FONTE: com `SOURCE=null` (ambíguo) processa as DUAS fontes em sequência.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');
var N = c.ENSEMBLE.NUM_MEMBERS;

function exists(assetId) {
  try { ee.data.getAsset(assetId); return true; } catch (e) { return false; }
}

function deleteAsset(assetId) {
  try {
    ee.data.deleteAsset(assetId);
    print('[AUTO] asset removido:', assetId);
  } catch (e) {
    print('[AVISO] falha ao remover asset:', assetId, '—', e.message);
  }
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 3_1_model_metadata');
print('[COVARIATES] versão', src.COVARIATES_VERSION, '· n temas =',
  src.COVARIATES_REGISTRY.length);
print('[FONTES]', c.sourcesToRun().join(', '), '(SOURCE=' + c.SOURCE + ')');
print('[NOTA] CLASSIFIER não aceita propriedades → asset companheiro metadata_v08_<source>.');

var registry = JSON.stringify(src.COVARIATES_REGISTRY);

c.sourcesToRun().forEach(function (source) {
  var S = c.SOURCES[source];
  var root = S.assetRoot;
  print('\n' + c.RULE);
  print('# FONTE:', source, '·', S.label, '· raiz', root);
  print(c.RULE);

  // confere os assets de modelo (classifiers) da fonte
  var members = [];
  for (var i = 1; i <= N; i++) {
    var id = root + '/MODELS/rf_agb_v08_m' + i;
    if (exists(id)) {
      members.push(id);
    } else {
      print('[FALTA]', id, '— rode 3_0_model_training e aguarde as tasks.');
    }
  }

  var meta = ee.Feature(src.getDomain().geometry().centroid(1000), {
    source: source,
    model_version: 'v08',
    covariate_version: src.COVARIATES_VERSION,
    covariates_registry: registry,
    num_members: N,
    members: members,
    model_prefix: root + '/MODELS/rf_agb_v08_m'
  });
  var metaAsset = root + '/MODELS/metadata_v08_' + source;
  if (exists(metaAsset)) deleteAsset(metaAsset);
  print('[TASK]', metaAsset, '· membros encontrados:', members.length, '/', N);
  Export.table.toAsset({
    collection: ee.FeatureCollection([meta]),
    description: 'WS_CARBONO_toAsset-metadata_v08_' + source,
    assetId: metaAsset
  });
});
