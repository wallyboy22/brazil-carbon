/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · run · REFERÊNCIAS (driver)
 * ---------------------------------------------------------------------------
 * Driver único das estatísticas dos mapas de REFERÊNCIA (benchmarks + QCN) por
 * classe LULC C11, para todos os biomas do Brasil (1 CSV por ref).
 *
 *   · contrato: contracts/contract_references.js
 *   · motor:    engine/engine.js
 *   · saída:    MAPBIOMAS_CARBONO_ESTATISTICAS · stats_references_<ref_id>_2023.csv
 *
 * Uso (Code Editor):
 *   engine.runReferences(C);                     → 20 CSVs (1 por ref)
 *   engine.runReferences(C, { ref_ids: [...] }); → refs selecionados
 *   engine.runReferences(C, { biomes: [...] });  → biomas selecionados
 *
 * ref_ids (20): saatchi_agb, saatchi_carbon, saatchi_bgb, saatchi_carbon_error,
 *   baccini_agb, zimbres_agb, avitabile_agb, avitabile_carbon_cerr,
 *   avitabile_carbon_amaz, avitabile_mode_k_pant, xu2021, tcn_agc, tcn_total,
 *   tcn_bgc, tcn_dwc, tcn_litter, qcn_total, qcn_agb, qcnr_total, qcnr_agb
 * biomes (slugs): amazonia, caatinga, cerrado, mata_atlantica, pampa, pantanal
 *
 * Os CSVs são consumidos OFFLINE pelo Colab
 * (run/cells_for_collab_notebook → cell06), SEM Earth Engine no notebook.
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_references.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

engine.runReferences(C);
