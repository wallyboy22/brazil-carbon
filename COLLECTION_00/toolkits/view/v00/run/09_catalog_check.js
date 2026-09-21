/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · run · 09_catalog_check (QA)
 * ---------------------------------------------------------------------------
 * Verifica a existência dos assets das CAMADAS do app (resultados, referências
 * e uso e cobertura) via module_infra.assetExists (listAssets na pasta-pai).
 *
 * Uso no Code Editor: só rodar. Imprime uma linha por camada + resumo.
 *
 * Nota: assets PÚBLICOS (projects/mapbiomas-public, projects/ee-ipam/...) podem
 * aparecer como [FALTA] quando o `listAssets` da pasta não é acessível — nesse
 * caso é indicativo, não definitivo.
 ******************************************************************************/
var LAY = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_layers.js');
var INFRA = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_infra.js');

print('MAPBIOMAS-CARBONO · toolkit view/v00 · 09_catalog_check');
print('[CAMADAS]', LAY.LAYERS.length, '·',
  LAY.grouped(LAY.LAYERS).length, 'grupos');

var ok = 0, miss = 0;
LAY.grouped(LAY.LAYERS).forEach(function (g) {
  print('--- ' + g.grupo + ' (' + g.camadas.length + ') ---');
  g.camadas.forEach(function (l) {
    var target = l.col || l.asset;
    var exists = INFRA.assetExists(target);
    if (exists) ok++; else miss++;
    print(exists ? '[OK]' : '[FALTA]', l.nome, '→', target,
      (l.col ? '(COL/' : '(') + l.band + ')');
  });
});

print('[FIM] camadas:', LAY.LAYERS.length, '·', ok, 'OK ·', miss, 'faltando.');
