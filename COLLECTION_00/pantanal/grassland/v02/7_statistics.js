/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland v02 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Estatísticas dos produtos v02 (biomassa, ANPP, carbono, 2023) por
 * combinação (classe LULC × def_sec) em TODO o bioma, usando
 * stats/stats_engine.js. Como os produtos
 * não são mais mascarados pela LULC, as reduções cobrem as classes florestais
 * e demais usos — não só {11,12,50} — conforme decisão da v02
 * (reflexao_v02.md, F23/G24).
 * O comparativo de produtos é montado OFFLINE no Colab (statistics_gcn).
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/stats_engine.js');

engine.runForVersion('v02');