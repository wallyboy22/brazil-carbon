/******************************************************************************
 * MAPBIOMAS-CARBONO — Referências (validação) · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas dos mapas de REFERÊNCIA (benchmarks + QCN) por
 * classe LULC C11, com os SEIS biomas do Brasil combinados num único CSV por
 * referência (coluna `territorio`), usando o módulo compartilhado
 * references/statistics/references_engine.js. CSVs para
 * MAPBIOMAS_CARBONO_ESTATISTICAS/.
 *
 * Uso (Code Editor):
 *   engine.runAllReferences();                     → 19 CSVs (1 por ref)
 *   engine.runAllReferences({ ref_ids: [...] });   → refs selecionados
 *   engine.runAllReferences({ biomes: ['pantanal'] }); → só um bioma
 *
 * Os CSVs são consumidos OFFLINE pelo Colab (statistics_gcn → cell06),
 * SEM Earth Engine no notebook.
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/references/statistics/references_engine.js');

engine.runAllReferences();