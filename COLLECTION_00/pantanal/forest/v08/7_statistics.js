/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas de AGC 2023 × LULC C11 para a v08 (mediana do
 * ensemble + incerteza agbd_std_2023) e fecha o comparativo V03–V08,
 * usando o módulo compartilhado statistics/stats_engine.js (com fallback de
 * mosaico ausente).
 * CSVs para MAPBIOMAS_CARBONO_ESTATISTICAS/.
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js');

engine.runForVersion('v08');
engine.compareAll();