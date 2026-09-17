/******************************************************************************
 * DEPRECATED — contrato florestal movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Re-export de compatibilidade do escopo FOREST do bioma Pantanal. Use no
 * código novo:
 *   contracts/contract_pantanal.js → PANTANAL.FOREST
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var P = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');

Object.keys(P.FOREST).forEach(function (k) { exports[k] = P.FOREST[k]; });
