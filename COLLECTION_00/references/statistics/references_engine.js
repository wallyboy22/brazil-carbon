/******************************************************************************
 * DEPRECATED — motor de referências movido para o toolkit statistics/v00.
 * ---------------------------------------------------------------------------
 * Re-export de compatibilidade. Use no código novo:
 *   engine/engine.js → engine.runReferences(contract_references[, opts])
 * (este arquivo será removido numa limpeza futura)
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_references.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

/** Compat: estatísticas de todas as referências (ou subconjunto). */
exports.runAllReferences = function (opts) {
  engine.runReferences(C, opts);
};

// Re-export do motor unificado (runForest/runGrassland/runReferences).
Object.keys(engine).forEach(function (k) { exports[k] = engine[k]; });
