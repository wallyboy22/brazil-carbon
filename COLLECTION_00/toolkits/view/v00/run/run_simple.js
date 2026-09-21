/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · run · run_simple
 * ---------------------------------------------------------------------------
 * Versão SIMPLES e AUTOSSUFICIENTE (SEM require): só endereços de assets +
 * plot. Adiciona TODAS as camadas de carbono (Forest, Grassland, Referências)
 * e o Uso e Cobertura (C11) ao mapa, desligadas — ligue no controle de camadas.
 *
 * Forest usa a ImageCollection `PREDICTIONS/COL` (mosaico do ano).
 ******************************************************************************/
Map.setOptions('SATELLITE');
Map.setCenter(-52.0, -14.0, 4);   // visão Brasil

// ---- Vis ----
var AGBD_VIS = { min: 0, max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'] };
var REF_VIS = { min: 0, max: 300,
  palette: ['#ffffe5', '#d9f0a3', '#78c679', '#238443', '#004529'] };
var ERR_VIS = { min: 0, max: 60,
  palette: ['#fff7bc', '#fec44f', '#d95f0e', '#993404'] };
var LULC_VIS = { min: 0, max: 91, palette: (function () {
  var cor = { 3: '#1f8d49', 4: '#7dc975', 5: '#04381d', 6: '#007785',
    7: '#228c70', 9: '#7a5900', 10: '#d6bc74', 11: '#519799', 12: '#86b074',
    13: '#af2ab4', 14: '#ffefc3', 15: '#edde8e', 18: '#e974ed', 19: '#c27ba0',
    20: '#db7093', 21: '#ffefc3', 22: '#d4271e', 23: '#ffa07a', 24: '#d4271e',
    25: '#db4d4f', 26: '#2532e4', 29: '#ad5100', 30: '#9c0027', 31: '#091077',
    32: '#fc8114', 33: '#2532e4', 35: '#9065d0', 36: '#d082de', 39: '#f5b3c8',
    40: '#c71585', 41: '#f54ca9', 46: '#d68fe2', 47: '#9932cc', 48: '#e6ccff',
    49: '#02d659', 50: '#ffaa5f', 62: '#ff69b4', 75: '#757272', 77: '#86b074',
    84: '#81dbbf', 91: '#403d3e' };
  var p = []; for (var i = 0; i <= 91; i++) p.push(cor[i] || '#000000');
  return p;
})() };

// ---- Bases ----
var PF = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var PG = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND';
var CER = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/Cerrado/mapa_biomassa_vbeta1';
var REF = 'projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps';
var QCN = 'projects/ee-ipam/assets/CCAL/public/qcn';
var IFN = 'projects/ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13';
var LULC = 'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
var MBP = 'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_pasture_biomass_v1';
var MBS = 'projects/mapbiomas-public/assets/brazil/soil/collection3/' +
  'mapbiomas_brazil_collection3_soil_carbon_v1';

// vis de AGBD do Cerrado (t/ha) — máximos maiores que o Pantanal.
var CERR_VIS = { min: 0, max: 140,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850'] };
// MapBiomas Pastagem (Mg/ha) e Solo (Mg C/ha), 2023.
var PAST_VIS = { min: 0, max: 30,
  palette: ['#ffffe5', '#d9f0a3', '#78c679', '#31a354', '#006837'] };
var SOIL_VIS = { min: 0, max: 100,
  palette: ['#f7f4e9', '#e6d3a3', '#c9a86a', '#9c6b3f', '#5c3b1e'] };

// ---- Camadas ----
// col = ImageCollection COL (mosaico do ano) · img = imagem · mask_lt = nodata.
var LAYERS = [
  // Cerrado Florestal (AGB 2020, vbeta1)
  { n: 'Cerrado Florestal vbeta1 (2020)', img: CER + '/mosaico_final_agb_2020_vbeta1_1', band: 'b1', vis: CERR_VIS },
  { n: 'Cerrado Florestal vbeta1 nativo (2020)', img: CER + '/mosaico_final_agb_2020_mask_vbeta1_1', band: 'b1', vis: CERR_VIS },
  // Pantanal Forest (v03–v08)
  { n: 'Pantanal Forest v03', col: PF + '/V03/PREDICTIONS/COL', band: 'prediction_2023', vis: AGBD_VIS },
  { n: 'Pantanal Forest v04', col: PF + '/V04/PREDICTIONS/COL', band: 'prediction_2023', vis: AGBD_VIS },
  { n: 'Pantanal Forest v05', col: PF + '/V05/PREDICTIONS/COL', band: 'prediction_2023', vis: AGBD_VIS },
  { n: 'Pantanal Forest v06', col: PF + '/V06/PREDICTIONS/COL', band: 'prediction_2023', vis: AGBD_VIS },
  { n: 'Pantanal Forest v07', col: PF + '/V07/PREDICTIONS/COL', band: 'prediction_2023', vis: AGBD_VIS },
  { n: 'Pantanal Forest v08 GEDI', col: PF + '/V08_GEDI/PREDICTIONS/COL', band: 'prediction_2023', vis: AGBD_VIS },
  { n: 'Pantanal Forest v08 IFN', col: PF + '/V08_IFN/PREDICTIONS/COL', band: 'prediction_2023', vis: AGBD_VIS },
  // Pantanal Campestre (v01)
  { n: 'Pantanal Campestre v01 biomassa', img: PG + '/V01/BIOMASS/grassland_biomass_annual_v01_2023', band: 'biomass_annual', vis: AGBD_VIS },
  { n: 'Pantanal Campestre v01 carbono', img: PG + '/V01/CARBON/grassland_carbon_stock_v01_2023', band: 'carbon_stock_MgC_ha', vis: AGBD_VIS },
  // Referências
  { n: 'Saatchi 2011 AGB', img: REF + '/Saatchi_2011_america_agb_1km', band: 'b1', vis: REF_VIS },
  { n: 'Saatchi 2011 AGC', img: REF + '/Saatchi_2011_america_carbon_1km', band: 'b1', vis: REF_VIS },
  { n: 'Saatchi 2011 BGB', img: REF + '/Saatchi_2011_america_bgb_1km', band: 'b1', vis: REF_VIS },
  { n: 'Saatchi 2011 erro', img: REF + '/Saatchi_2011_america_carbon_error_1km', band: 'b1', vis: ERR_VIS },
  { n: 'Baccini 2012 AGB', img: REF + '/Z_baccini_30_agb', band: 'b1', vis: REF_VIS },
  { n: 'Zimbres 2021 AGB Cerrado', img: REF + '/Zimbres_2021_AGB_NVmasked_RF_cog-v1', band: 'b1', vis: REF_VIS },
  { n: 'Avitabile 2016 AGB', img: REF + '/Avitabile_AGB_Map', band: 'b1', vis: REF_VIS, mask_lt: -1e30 },
  { n: 'Xu & Saatchi 2021', img: REF + '/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2', band: 'b20', vis: REF_VIS },
  { n: 'TCN AGC', img: REF + '/TCN_AGC_comAgua_wgs84', band: 'b1', vis: REF_VIS, mask_lt: -1e30 },
  { n: 'TCN total', img: REF + '/TCN_TOTALC_comAgua_wgs84', band: 'b1', vis: REF_VIS, mask_lt: -1e30 },
  { n: 'TCN BGC', img: REF + '/TCN_BGC_comAgua_wgs84', band: 'b1', vis: REF_VIS, mask_lt: -1e30 },
  { n: 'TCN madeira morta', img: REF + '/TCN_DWC_comAgua_wgs84', band: 'b1', vis: REF_VIS, mask_lt: -1e30 },
  { n: 'TCN serrapilheira', img: REF + '/TCN_LITTERC_comAgua_wgs84', band: 'b1', vis: REF_VIS, mask_lt: -1e30 },
  { n: 'QCN total', img: QCN + '/qcn_brazil_historical_biomass_carbon_v1', band: 'TOTAL', vis: REF_VIS },
  { n: 'QCN AGB', img: QCN + '/qcn_brazil_historical_biomass_carbon_v1', band: 'AGB', vis: REF_VIS },
  { n: 'QCN-r total (1985)', img: QCN + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1', band: 'TOTAL', vis: REF_VIS },
  { n: 'QCN-r AGB (1985)', img: QCN + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1', band: 'AGB', vis: REF_VIS },
  // IFN (inventário de campo) — rasterizado via paint (banda `constant`)
  { n: 'IFN AGB (Mg/ha)', paint: { fc: IFN, prop: 'AGB_Mg_ha' }, vis: REF_VIS },
  { n: 'IFN Carbono (Mg C/ha)', paint: { fc: IFN, prop: 'C_Mg_ha' }, vis: REF_VIS },
  { n: 'IFN CO2e (Mg CO2e/ha)', paint: { fc: IFN, prop: 'CO2e_Mg_ha' }, vis: REF_VIS },
  { n: 'IFN Area basal (m2/ha)', paint: { fc: IFN, prop: 'G_m2_ha' }, vis: REF_VIS },
  { n: 'IFN No individuos', paint: { fc: IFN, prop: 'n_ind' }, vis: REF_VIS },
  { n: 'IFN AGB total (Mg)', paint: { fc: IFN, prop: 'AGB_Mg' }, vis: REF_VIS },
  // Uso e Cobertura (C11)
  { n: 'LULC C11 1985', img: LULC, band: 'classification_1985', vis: LULC_VIS },
  { n: 'LULC C11 2000', img: LULC, band: 'classification_2000', vis: LULC_VIS },
  { n: 'LULC C11 2010', img: LULC, band: 'classification_2010', vis: LULC_VIS },
  { n: 'LULC C11 2023', img: LULC, band: 'classification_2023', vis: LULC_VIS },
  // MapBiomas Pastagem / Solo (2023)
  { n: 'MapBiomas Pastagem biomassa 2023 (Mg/ha)', img: MBP, band: 'biomass_2023', vis: PAST_VIS },
  { n: 'MapBiomas Solo carbono organico 2023 (Mg C/ha)', img: MBS, band: 'carbon_2023', vis: SOIL_VIS }
];

/** true se o asset existe (getAsset direto; não depende de listar a pasta). */
function assetExists(id) {
  try { ee.data.getAsset(id); return true; } catch (e) { return false; }
}

var count = 0, skipped = 0;
LAYERS.forEach(function (l) {
  var target = l.col || l.img || (l.paint && l.paint.fc);
  if (!assetExists(target)) {
    print('[AVISO] ausente (ignorada):', l.n, '\u2192', target);
    skipped++;
    return;
  }
  var img;
  if (l.paint) {
    img = ee.Image().paint(ee.FeatureCollection(l.paint.fc), l.paint.prop);
  } else {
    img = l.col
      ? ee.ImageCollection(l.col).filter(ee.Filter.eq('year', 2023)).mosaic()
      : ee.Image(l.img);
    img = img.select(l.band);
  }
  if (l.mask_lt !== undefined) img = img.updateMask(img.gt(l.mask_lt));
  Map.addLayer(img, l.vis, l.n.slice(0, 90), false);
  count++;
});

print('MAPBIOMAS-CARBONO · toolkit view/v00 · run_simple');
print('[CAMADAS]', count, 'adicionadas (desligadas) — ligue no controle de camadas.',
  skipped ? ('· ' + skipped + ' ausentes ignoradas') : '');
