/******************************************************************************
 * DEPRECATED — driver movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Compatibilidade: estatísticas florestais da v08 (mediana + incerteza).
 * Use no código novo:
 *   run/run_pantanal.js ou engine.runForest(PANTANAL.FOREST, 'v08')
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var P = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

engine.runForest(P.FOREST, 'v08');
