/******************************************************************************
 * MAPBIOMAS-CARBONO — Referências (validação) · Estatísticas (7)
 * ---------------------------------------------------------------------------
 * Dispara as estatísticas dos mapas de REFERÊNCIA (benchmarks + QCN) por
 * classe LULC C11, com os SEIS biomas do Brasil combinados num único CSV por
 * referência (coluna `territorio`), usando o módulo compartilhado
 * references/statistics/references_engine.js. CSVs para
 * MAPBIOMAS_CARBONO_ESTATISTICAS/.
 *
 * Uso (Code Editor):
 *   engine.runAllReferences();                     → 20 CSVs (1 por ref)
 *   engine.runAllReferences({ ref_ids: [...] });   → refs selecionados
 *   engine.runAllReferences({ biomes: [...] });    → biomas selecionados
 *
 *   ref_ids disponíveis (20):
 *     saatchi_agb, saatchi_carbon, saatchi_bgb, saatchi_carbon_error,
 *     baccini_agb, zimbres_agb,
 *     avitabile_agb, avitabile_carbon_cerr, avitabile_carbon_amaz,
 *     avitabile_mode_k_pant, xu2021,
 *     tcn_agc, tcn_total, tcn_bgc, tcn_dwc, tcn_litter,
 *     qcn_total, qcn_agb, qcnr_total, qcnr_agb
 *
 *   biomes (slugs) disponíveis (6):
 *     amazonia, caatinga, cerrado, mata_atlantica, pampa, pantanal
 *
 *   Ex.: runAllReferences({ ref_ids: ['zimbres_agb'] })          → só Zimbres
 *        runAllReferences({ biomes: ['cerrado'] })               → só Cerrado
 *        runAllReferences({ ref_ids: [...], biomes: [...] })     → cruzamento
 *
 * Os CSVs são consumidos OFFLINE pelo Colab (statistics_gcn → cell06),
 * SEM Earth Engine no notebook.
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/references/statistics/references_engine.js');

engine.runAllReferences();