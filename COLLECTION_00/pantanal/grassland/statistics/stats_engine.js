/******************************************************************************
 * DEPRECATED — motor campestre movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Re-export de compatibilidade. Use no código novo:
 *   engine/engine.js → engine.runGrassland(contract_pantanal.GRASSLAND[, versionId])
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var P = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

/** Compat: estatísticas de UMA versão campestre (v01–v02). */
exports.runForVersion = function (versionId) {
  engine.runGrassland(P.GRASSLAND, versionId);
};

// Re-export do motor unificado (runForest/runGrassland/runReferences).
Object.keys(engine).forEach(function (k) { exports[k] = engine[k]; });
