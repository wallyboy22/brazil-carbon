/******************************************************************************
 * DEPRECATED — driver movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Re-export/execução de compatibilidade. Use no código novo:
 *   run/run_pantanal.js
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var P = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

print('MAPBIOMAS-CARBONO · (deprecated) Pantanal Forest · estatísticas · TODAS as versões:',
  P.FOREST.VERSIONS.map(function (x) { return x.id; }).join(', '));

engine.runForest(P.FOREST);
