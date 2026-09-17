/******************************************************************************
 * DEPRECATED — driver movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Re-export/execução de compatibilidade. Use no código novo:
 *   run/run_references.js
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_references.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

engine.runReferences(C);
