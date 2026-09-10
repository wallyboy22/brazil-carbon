/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v03 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas de AGC 2023 × LULC C11 para a v03, usando o módulo
 * compartilhado statistics/stats_engine.js (níveis n0/n1/marcador/total;
 * CSV para MAPBIOMAS_CARBONO_ESTATISTICAS/).
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js');

engine.runForVersion('v03');