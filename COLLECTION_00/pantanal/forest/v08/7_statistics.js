/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas de AGC 2023 × LULC C11 para a v08 (mediana do
 * ensemble + incerteza agbd_std_2023), usando o módulo compartilhado
 * statistics/stats_engine.js (com fallback de mosaico ausente).
 * CSVs para MAPBIOMAS_CARBONO_ESTATISTICAS/.
 * O comparativo entre versões (V03–V08) é montado OFFLINE no Colab
 * (statistics_gcn).
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js');

engine.runForVersion('v08');