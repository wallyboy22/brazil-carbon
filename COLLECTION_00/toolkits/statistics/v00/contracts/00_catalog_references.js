/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Catálogo de REFERÊNCIAS
 * ---------------------------------------------------------------------------
 * Catálogo dos mapas de REFERÊNCIA (benchmarks + QCN) usados na validação das
 * estatísticas por classe LULC C11. Espelho do REF_CATALOG do Colab
 * (run/cells_for_collab_notebook · cell00) e de
 * docs/“Referencias - Mapas de referencia (biomassa e carbono)”.
 *
 * Campos comuns:
 *   id             slug único (igual ao ref_id do Colab — join direto)
 *   grupo          família de referência (agrupa métricas numa MESMA tabela;
 *                  a escala do grupo fica em GRUPOS abaixo)
 *   fonte          nome legível exibido nos relatórios (group · variable)
 *   fonte_curta    prefixo das colunas de métrica (ex.: 'Zimbres 2021')
 *   magnitude      'biomassa' | 'carbono' | 'incerteza'
 *   unit           unidade NATIVA da banda (t/ha | t C/ha | t C/ha erro)
 *   scale          escala de redução (m) no Earth Engine
 *   epoch          ano-base do mapa (string; 'baseline' p/ TCN/QCN)
 *   factor_to_c    AGB→C aplicado para gerar <pool>_tC (1.0 se já carbono)
 *   t2_candidate   elegível ao "melhor ano de referência" (T2)
 *   pools          [{band, col}] — banda(s)/coluna(s) de valor (1 por ref)
 *   nodata_le      se valor <= nodata_le -> mascarar (sentinela)
 *   filter_index   para IMAGE_COLLECTION: system:index a selecionar
 *   multi_year     {start, end} p/ séries (Xu): usa-se UM ano (o mais recente).
 ******************************************************************************/

var REF_ROOT = 'projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps';
var QCN_ROOT = 'projects/ee-ipam/assets/CCAL/public/qcn';

exports.REF_ROOT = REF_ROOT;
exports.QCN_ROOT = QCN_ROOT;

/** Fração de carbono da biomassa seca (AGB→C). */
exports.CARBON_FRACTION = 0.47;

// ---- Grupos (famílias) e escala do reduce -----------------------------------
// Todas as refs do mesmo grupo vão para UM CSV, com as métricas em colunas.
exports.GRUPOS = {
  saatchi:   { scale: 928 },
  xu:        { scale: 11131.949 },
  avitabile: { scale: 928 },
  baccini:   { scale: 30 },
  zimbres:   { scale: 30 },
  tcn:       { scale: 110 },
  qcn:       { scale: 30 },
  qcnr:      { scale: 30 }
};

// ---- Magnitudes aceitas (marcador no nome das colunas: tC / tB) --------------
// Emission: 'carbono' → <pool>_tC ; 'biomassa' → <pool>_tB + <pool>_tC ;
// 'incerteza' → incerteza_tC (ref de erro vira a própria coluna de incerteza).
exports.MAGNITUDES = ['biomassa', 'carbono', 'incerteza',
  'emissao', 'emissao_liquida', 'proporcao'];

function ref(o) {
  var r = {};
  Object.keys(o).forEach(function (k) { r[k] = o[k]; });
  if (r.grupo === undefined) r.grupo = r.id;
  if (r.fonte_curta === undefined) r.fonte_curta = '';
  if (r.factor_to_c === undefined) r.factor_to_c = 1;
  if (r.t2 === undefined) r.t2 = true;
  r.t2_candidate = r.t2;
  if (r.nodata_le === undefined) r.nodata_le = null;
  if (r.filter_index === undefined) r.filter_index = null;
  if (r.multi_year === undefined) r.multi_year = null;
  if (r.note === undefined) r.note = '';
  return r;
}
exports.ref = ref;

exports.REFERENCES = [
  // ---- Saatchi 2011 (Américas, ~1 km, florestas) ---------------------------
  ref({ id: 'saatchi_agb', grupo: 'saatchi', fonte: 'Saatchi 2011 · AGB',
    fonte_curta: 'Saatchi 2011', magnitude: 'biomassa', unit: 't/ha', scale: 928,
    epoch: '2011', factor_to_c: 0.47, pools: [{ band: 'b1', col: 'agb' }],
    asset: REF_ROOT + '/Saatchi_2011_america_agb_1km', note: 'florestal; 2007-08' }),
  ref({ id: 'saatchi_carbon', grupo: 'saatchi', fonte: 'Saatchi 2011 · AGC (carbono)',
    fonte_curta: 'Saatchi 2011', magnitude: 'carbono', unit: 't C/ha', scale: 928,
    epoch: '2011', pools: [{ band: 'b1', col: 'agc' }],
    asset: REF_ROOT + '/Saatchi_2011_america_carbon_1km' }),
  ref({ id: 'saatchi_bgb', grupo: 'saatchi', fonte: 'Saatchi 2011 · BGB',
    fonte_curta: 'Saatchi 2011', magnitude: 'biomassa', unit: 't/ha', scale: 928,
    epoch: '2011', factor_to_c: 0.47, t2: false, pools: [{ band: 'b1', col: 'bgb' }],
    asset: REF_ROOT + '/Saatchi_2011_america_bgb_1km', note: 'pool BGB (contexto)' }),
  ref({ id: 'saatchi_carbon_error', grupo: 'saatchi', fonte: 'Saatchi 2011 · erro AGC',
    fonte_curta: 'Saatchi 2011', magnitude: 'incerteza', unit: 't C/ha', scale: 928,
    epoch: '2011', t2: false, pools: [{ band: 'b1', col: 'incerteza' }],
    asset: REF_ROOT + '/Saatchi_2011_america_carbon_error_1km',
    note: 'incerteza da ref' }),
  // ---- Baccini 2012 (tropical, ~30 m; teto byte 255) ------------------------
  ref({ id: 'baccini_agb', grupo: 'baccini', fonte: 'Baccini 2012 · AGB',
    fonte_curta: 'Baccini 2012', magnitude: 'biomassa', unit: 't/ha', scale: 30,
    epoch: '2012', factor_to_c: 0.47, pools: [{ band: 'b1', col: 'agb' }],
    asset: REF_ROOT + '/Z_baccini_30_agb',
    note: 'teto 255 t/ha (saturação, não físico)' }),
  // ---- Zimbres 2021 (Cerrado, 30 m, RF + máscara de vegetação nativa) --------
  ref({ id: 'zimbres_agb', grupo: 'zimbres', fonte: 'Zimbres 2021 · AGB Cerrado (NV)',
    fonte_curta: 'Zimbres 2021', magnitude: 'biomassa', unit: 't/ha', scale: 30,
    epoch: '2019', factor_to_c: 0.47, pools: [{ band: 'b1', col: 'agb' }],
    asset: REF_ROOT + '/Zimbres_2021_AGB_NVmasked_RF_cog-v1',
    note: 'RF, máscara vegetação nativa; domínio Cerrado (só gera linhas no Cerrado)' }),
  // ---- Avitabile 2016 (fusão Saatchi+Baccini, ~1 km, ano-base 2010) ---------
  ref({ id: 'avitabile_agb', grupo: 'avitabile', fonte: 'Avitabile 2016 · AGB pan-tropical',
    fonte_curta: 'Avitabile 2016', magnitude: 'biomassa', unit: 't/ha', scale: 928,
    epoch: '2010', factor_to_c: 0.47, nodata_le: -3.4e38,
    pools: [{ band: 'b1', col: 'agb' }], asset: REF_ROOT + '/Avitabile_AGB_Map',
    note: 'sentinela -3.4e38 mascarada' }),
  ref({ id: 'avitabile_carbon_cerr', grupo: 'avitabile',
    fonte: 'Avitabile 2016 · AGC (Cerrado)', fonte_curta: 'Avitabile Cerrado',
    magnitude: 'carbono', unit: 't C/ha', scale: 928, epoch: '2010',
    nodata_le: -3.4e38, pools: [{ band: 'b1', col: 'agc' }],
    asset: REF_ROOT + '/Avitabile_Carbon_AGB_Cerr' }),
  ref({ id: 'avitabile_carbon_amaz', grupo: 'avitabile',
    fonte: 'Avitabile 2016 · AGC (Amazônia)', fonte_curta: 'Avitabile Amazônia',
    magnitude: 'carbono', unit: 't C/ha', scale: 928, epoch: '2010',
    nodata_le: -3.4e38, pools: [{ band: 'b1', col: 'agc' }],
    asset: REF_ROOT + '/Avitabile_Carbon_AGB_amaz' }),
  ref({ id: 'avitabile_mode_k_pant', grupo: 'avitabile',
    fonte: 'Avitabile 2016 · AGB Mode K (Pantanal)',
    fonte_curta: 'Avitabile Pantanal', magnitude: 'biomassa', unit: 't/ha',
    scale: 250, epoch: '1985', factor_to_c: 0.47, t2: false,
    pools: [{ band: 'total_1985', col: 'agb' }],
    asset: REF_ROOT + '/Avitabile_AGB_Map_Mode_K_2_2',
    filter_index: 'pantanal_rect_total_v2',
    note: 'escala do grupo (928); semântica/unidade a confirmar (banda total_1985)' }),
  // ---- Xu & Saatchi 2021 (biomassa viva AGB+BGB, t C/ha, 2000–2019, ~10 km) --
  // Série multi-ano: usa-se UM ano (o mais recente ≤ YEAR do contrato).
  ref({ id: 'xu2021', grupo: 'xu', fonte: 'Xu & Saatchi 2021 · carbono vivo (2000–2019)',
    fonte_curta: 'Xu&Saatchi', magnitude: 'carbono', unit: 't C/ha', scale: 11131.949,
    epoch: '2000-2019', pools: [{ band: 'b1', col: 'live' }],
    multi_year: { start: 2000, end: 2019 },
    asset: REF_ROOT + '/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2',
    note: 'b<i> -> ano 1999+i; inclui BGB' }),
  // ---- TCN (3ª CN, baseline pretérito, ~110 m) --------------------------------
  ref({ id: 'tcn_agc', grupo: 'tcn', fonte: 'TCN (3ª CN) · AGC', fonte_curta: 'TCN',
    magnitude: 'carbono', unit: 't C/ha', scale: 110, epoch: 'baseline',
    pools: [{ band: 'b1', col: 'agc' }], asset: REF_ROOT + '/TCN_AGC_comAgua_wgs84' }),
  ref({ id: 'tcn_total', grupo: 'tcn', fonte: 'TCN (3ª CN) · estoque total',
    fonte_curta: 'TCN', magnitude: 'carbono', unit: 't C/ha', scale: 110,
    epoch: 'baseline', pools: [{ band: 'b1', col: 'total' }],
    asset: REF_ROOT + '/TCN_TOTALC_comAgua_wgs84' }),
  ref({ id: 'tcn_bgc', grupo: 'tcn', fonte: 'TCN (3ª CN) · BGC', fonte_curta: 'TCN',
    magnitude: 'carbono', unit: 't C/ha', scale: 110, epoch: 'baseline', t2: false,
    pools: [{ band: 'b1', col: 'bgc' }], asset: REF_ROOT + '/TCN_BGC_comAgua_wgs84' }),
  ref({ id: 'tcn_dwc', grupo: 'tcn', fonte: 'TCN (3ª CN) · madeira morta',
    fonte_curta: 'TCN', magnitude: 'carbono', unit: 't C/ha', scale: 110,
    epoch: 'baseline', t2: false, pools: [{ band: 'b1', col: 'cdw' }],
    asset: REF_ROOT + '/TCN_DWC_comAgua_wgs84' }),
  ref({ id: 'tcn_litter', grupo: 'tcn', fonte: 'TCN (3ª CN) · serrapilheira',
    fonte_curta: 'TCN', magnitude: 'carbono', unit: 't C/ha', scale: 110,
    epoch: 'baseline', t2: false, pools: [{ band: 'b1', col: 'litter' }],
    asset: REF_ROOT + '/TCN_LITTERC_comAgua_wgs84' }),
  // ---- QCN (4ª CN, baseline / alinhada a 1985) --------------------------------
  ref({ id: 'qcn_total', grupo: 'qcn', fonte: 'QCN (4ª CN) · estoque total',
    fonte_curta: 'QCN', magnitude: 'carbono', unit: 't C/ha', scale: 30,
    epoch: 'baseline', pools: [{ band: 'TOTAL', col: 'total' }],
    asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1' }),
  ref({ id: 'qcn_agb', grupo: 'qcn', fonte: 'QCN (4ª CN) · AGB', fonte_curta: 'QCN',
    magnitude: 'carbono', unit: 't C/ha', scale: 30, epoch: 'baseline',
    pools: [{ band: 'AGB', col: 'agb' }],
    asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1' }),
  ref({ id: 'qcnr_total', grupo: 'qcnr', fonte: 'QCN-r (4ª CN, rect) · estoque total',
    fonte_curta: 'QCN-r', magnitude: 'carbono', unit: 't C/ha', scale: 30,
    epoch: '1985', pools: [{ band: 'TOTAL', col: 'total' }],
    asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1',
    note: 'alinhada ao grid/ano-base MapBiomas 1985' }),
  ref({ id: 'qcnr_agb', grupo: 'qcnr', fonte: 'QCN-r (4ª CN, rect) · AGB',
    fonte_curta: 'QCN-r', magnitude: 'carbono', unit: 't C/ha', scale: 30,
    epoch: '1985', pools: [{ band: 'AGB', col: 'agb' }],
    asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1',
    note: 'alinhada ao grid/ano-base MapBiomas 1985' })
];

/**
 * Sufixo de coluna NATIVA por magnitude (marcador no nome da coluna):
 * `biomassa` → 'tB'; `carbono`/`incerteza` → 'tC'. Refs de biomassa também
 * emitem a versão <pool>_tC (× CARBON_FRACTION) para garantir o comparador
 * comum de carbono — a montagem é responsabilidade do engine.
 */
exports.columnSuffix = function (magnitude) {
  return magnitude === 'biomassa' ? 'tB' : 'tC';
};
