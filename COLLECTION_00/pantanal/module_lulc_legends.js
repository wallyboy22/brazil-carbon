/******************************************************************************
 * DEPRECATED — movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Este caminho existe apenas como re-export para não quebrar scripts antigos.
 * Use no código novo:
 *   COLLECTION_00/toolkits/statistics/v00/engine/module_legends.js
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var target = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/module_legends.js');
Object.keys(target).forEach(function (k) { exports[k] = target[k]; });
