/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland v01 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas dos produtos campestres v01 (biomassa, ANPP,
 * carbono, 2023) × LULC C11, usando o módulo compartilhado
 * statistics/stats_engine.js (1 linha por COMBINAÇÃO classe × def_sec,
 * formato gráfico; as agregações são derivadas OFFLINE no statistics_gcn;
 * CSVs para MAPBIOMAS_CARBONO_ESTATISTICAS/).
 * O comparativo de produtos é montado OFFLINE no Colab (statistics_gcn).
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/stats_engine.js');

engine.runForVersion('v01');