/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de REFERÊNCIAS
 * ---------------------------------------------------------------------------
 * Mapas de REFERÊNCIA (benchmarks + TCN/QCN) para visualização/QA.
 * Reescrito do toolkit statistics/v00, com `vis` por magnitude.
 *
 * Campos: id, grupo, fonte, magnitude (biomassa|carbono|incerteza), unit,
 *         asset, band (banda do pool), nodata_le, filter_index, multi_year, vis.
 ******************************************************************************/
var REF_ROOT = 'projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps';
var QCN_ROOT = 'projects/ee-ipam/assets/CCAL/public/qcn';

exports.REF_ROOT = REF_ROOT;
exports.QCN_ROOT = QCN_ROOT;
exports.CARBON_FRACTION = 0.47;

/** vis de biomassa/carbono (t/ha). */
exports.AGB_VIS = { min: 0, max: 300,
  palette: ['#ffffe5', '#d9f0a3', '#78c679', '#238443', '#004529'] };
/** vis de incerteza (t C/ha). */
exports.ERR_VIS = { min: 0, max: 60,
  palette: ['#fff7bc', '#fec44f', '#d95f0e', '#993404'] };

function ref(o) {
  if (o.nodata_le === undefined) o.nodata_le = null;
  if (o.filter_index === undefined) o.filter_index = null;
  if (o.multi_year === undefined) o.multi_year = null;
  if (o.vis === undefined) o.vis = exports.AGB_VIS;
  return o;
}
exports.ref = ref;

exports.REFERENCES = [  // Saatchi 2011 (Américas ~1 km)
  ref({ id: 'saatchi_agb', grupo: 'saatchi', fonte: 'Saatchi 2011 · AGB',
    magnitude: 'biomassa', unit: 't/ha',
    asset: REF_ROOT + '/Saatchi_2011_america_agb_1km', band: 'b1' }),
  ref({ id: 'saatchi_carbon', grupo: 'saatchi', fonte: 'Saatchi 2011 · AGC',
    magnitude: 'carbono', unit: 't C/ha',
    asset: REF_ROOT + '/Saatchi_2011_america_carbon_1km', band: 'b1' }),
  ref({ id: 'saatchi_bgb', grupo: 'saatchi', fonte: 'Saatchi 2011 · BGB',
    magnitude: 'biomassa', unit: 't/ha',
    asset: REF_ROOT + '/Saatchi_2011_america_bgb_1km', band: 'b1' }),
  ref({ id: 'saatchi_carbon_error', grupo: 'saatchi', fonte: 'Saatchi 2011 · erro AGC',
    magnitude: 'incerteza', unit: 't C/ha', vis: exports.ERR_VIS,
    asset: REF_ROOT + '/Saatchi_2011_america_carbon_error_1km', band: 'b1' }),
  // Baccini 2012 (~30 m, teto 255)
  ref({ id: 'baccini_agb', grupo: 'baccini', fonte: 'Baccini 2012 · AGB',
    magnitude: 'biomassa', unit: 't/ha',
    asset: REF_ROOT + '/Z_baccini_30_agb', band: 'b1' }),
  // Zimbres 2021 (Cerrado, 30 m)
  ref({ id: 'zimbres_agb', grupo: 'zimbres', fonte: 'Zimbres 2021 · AGB Cerrado',
    magnitude: 'biomassa', unit: 't/ha',
    asset: REF_ROOT + '/Zimbres_2021_AGB_NVmasked_RF_cog-v1', band: 'b1' }),
  // Avitabile 2016 (pan-tropical ~1 km)
  ref({ id: 'avitabile_agb', grupo: 'avitabile', fonte: 'Avitabile 2016 · AGB',
    magnitude: 'biomassa', unit: 't/ha', nodata_le: -3.4e38,
    asset: REF_ROOT + '/Avitabile_AGB_Map', band: 'b1' }),
  // Xu & Saatchi 2021 (série, ~10 km)
  ref({ id: 'xu2021', grupo: 'xu', fonte: 'Xu & Saatchi 2021 · C vivo (2000–2019)',
    magnitude: 'carbono', unit: 't C/ha',
    asset: REF_ROOT + '/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2',
    band: 'b1', multi_year: { start: 2000, end: 2019 } }),
  // TCN (3ª CN ~110 m)
  ref({ id: 'tcn_agc', grupo: 'tcn', fonte: 'TCN · AGC', magnitude: 'carbono',
    unit: 't C/ha', nodata_le: -1e30, asset: REF_ROOT + '/TCN_AGC_comAgua_wgs84', band: 'b1' }),
  ref({ id: 'tcn_total', grupo: 'tcn', fonte: 'TCN · total', magnitude: 'carbono',
    unit: 't C/ha', nodata_le: -1e30, asset: REF_ROOT + '/TCN_TOTALC_comAgua_wgs84', band: 'b1' }),
  ref({ id: 'tcn_bgc', grupo: 'tcn', fonte: 'TCN · BGC', magnitude: 'carbono',
    unit: 't C/ha', nodata_le: -1e30, asset: REF_ROOT + '/TCN_BGC_comAgua_wgs84', band: 'b1' }),
  ref({ id: 'tcn_dwc', grupo: 'tcn', fonte: 'TCN · madeira morta', magnitude: 'carbono',
    unit: 't C/ha', nodata_le: -1e30, asset: REF_ROOT + '/TCN_DWC_comAgua_wgs84', band: 'b1' }),
  ref({ id: 'tcn_litter', grupo: 'tcn', fonte: 'TCN · serrapilheira', magnitude: 'carbono',
    unit: 't C/ha', nodata_le: -1e30, asset: REF_ROOT + '/TCN_LITTERC_comAgua_wgs84', band: 'b1' }),
  // QCN (4ª CN 30 m) + retificação
  ref({ id: 'qcn_total', grupo: 'qcn', fonte: 'QCN · total', magnitude: 'carbono',
    unit: 't C/ha', asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1', band: 'TOTAL' }),
  ref({ id: 'qcn_agb', grupo: 'qcn', fonte: 'QCN · AGB', magnitude: 'carbono',
    unit: 't C/ha', asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1', band: 'AGB' }),
  ref({ id: 'qcnr_total', grupo: 'qcnr', fonte: 'QCN-r (1985) · total', magnitude: 'carbono',
    unit: 't C/ha', asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1', band: 'TOTAL' }),
  ref({ id: 'qcnr_agb', grupo: 'qcnr', fonte: 'QCN-r (1985) · AGB', magnitude: 'carbono',
    unit: 't C/ha', asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1', band: 'AGB' })
];

/** Rótulos das fontes (grupos) de referência — ordem de exibição. */
exports.FONTES = {
  saatchi: 'Saatchi 2011 (Américas)',
  baccini: 'Baccini 2012 (tropical)',
  zimbres: 'Zimbres 2021 (Cerrado)',
  avitabile: 'Avitabile 2016 (pan-tropical)',
  xu: 'Xu & Saatchi 2021 (tropical)',
  tcn: 'TCN (3ª CN)',
  qcn: 'QCN (4ª CN)',
  qcnr: 'QCN-r (1985)'
};
