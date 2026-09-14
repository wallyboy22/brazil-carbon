/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas de AGC 2023 × LULC C11 para a v07 (com incerteza
 * de ensemble, via agbd_std_2023 — v07 e v08), usando o módulo compartilhado
 * statistics/stats_engine.js.
 * O comparativo entre versões (V03–V08) é montado OFFLINE no Colab
 * (statistics_gcn).
 * CSVs para MAPBIOMAS_CARBONO_ESTATISTICAS/.
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js');

engine.runForVersion('v07');