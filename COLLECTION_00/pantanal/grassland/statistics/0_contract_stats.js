/******************************************************************************
 * DEPRECATED — contrato campestre movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Re-export de compatibilidade do escopo GRASSLAND do bioma Pantanal. Use no
 * código novo:
 *   contracts/contract_pantanal.js → PANTANAL.GRASSLAND
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var P = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');

Object.keys(P.GRASSLAND).forEach(function (k) { exports[k] = P.GRASSLAND[k]; });
