/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v07 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas de AGC 2023 × LULC C11 para a v07 (a única com
 * incerteza de ensemble, via agbd_std_2023) e fecha o comparativo V03–V07,
 * usando o módulo compartilhado statistics/stats_engine.js.
 * CSVs para MAPBIOMAS_CARBONO_ESTATISTICAS/.
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js');

engine.runForVersion('v07');
engine.compareAll();