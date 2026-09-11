/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland v01 · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas dos produtos campestres v01 (biomassa, ANPP,
 * carbono, 2023) × LULC C11, usando o módulo compartilhado
 * statistics/stats_engine.js (níveis n0/n1/marcador/total por produto;
 * CSVs para MAPBIOMAS_CARBONO_ESTATISTICAS/). Fecha o comparativo entre
 * produtos (compareAll).
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/stats_engine.js');

engine.runForVersion('v01');
engine.compareAll('v01');