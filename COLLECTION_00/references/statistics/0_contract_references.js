/******************************************************************************
 * DEPRECATED — contrato de referências movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Re-export de compatibilidade. Use no código novo:
 *   contracts/contract_references.js (+ contracts/00_catalog_references.js)
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var target = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_references.js');
Object.keys(target).forEach(function (k) { exports[k] = target[k]; });
