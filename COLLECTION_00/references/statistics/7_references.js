/******************************************************************************
 * MAPBIOMAS-CARBONO — Referências (validação) · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas dos mapas de REFERÊNCIA (benchmarks + QCN) por
 * classe LULC C11, para TODOS os biomas do Brasil (1 CSV por ref × bioma),
 * usando o módulo compartilhado references/statistics/references_engine.js.
 * CSVs para MAPBIOMAS_CARBONO_ESTATISTICAS/.
 *
 * Uso (Code Editor):
 *   engine.runAllReferences();                     → 19 refs × 6 biomas (114)
 *   engine.runAllReferences({ ref_ids: [...] });   → refs selecionados
 *   engine.runAllReferences({ biomes: ['pantanal'] }); → biomas selecionados
 *
 * (ou substitua a última linha por um subconjunto acima e desse Run.)
 *
 * Os CSVs são consumidos OFFLINE pelo Colab (statistics_gcn → cell06),
 * SEM Earth Engine no notebook.
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/references/statistics/references_engine.js');

engine.runAllReferences();