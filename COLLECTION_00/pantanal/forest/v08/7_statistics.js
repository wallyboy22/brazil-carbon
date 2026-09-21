/******************************************************************************
 * DEPRECATED — driver movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Compatibilidade: estatísticas florestais da v08 (mediana + incerteza).
 * Use no código novo:
 *   run/run_pantanal.js ou engine.runForest(PANTANAL.FOREST, 'v08_gedi')
 * (v08 tem sub-versões por fonte: 'v08_gedi' e 'v08_ifn';
 *  sem versionId, o motor usa TODAS as versões disponíveis).
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var P = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

engine.runForest(P.FOREST);
