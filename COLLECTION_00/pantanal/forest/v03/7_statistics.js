/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v03 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas de AGC 2023 × LULC C11 para a v03, usando o módulo
 * compartilhado statistics/stats_engine.js (1 linha por COMBINAÇÃO classe ×
 * def_sec, formato gráfico; as agregações são derivadas OFFLINE no
 * statistics_gcn; CSV para MAPBIOMAS_CARBONO_ESTATISTICAS/).
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js');

engine.runForVersion('v03');