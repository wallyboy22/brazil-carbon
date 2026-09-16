/******************************************************************************
 * MAPBIOMAS-CARBONO — Referências (validação) · Estatísticas (contrato)
 * ---------------------------------------------------------------------------
 * Estatísticas dos mapas de REFERÊNCIA de biomassa/carbono (benchmarks
 * publicados + QCN) por classe LULC C11. Um CSV por REF × BIOMA (Brasil,
 * 6 biomas IBGE 2026), exportado para o Google Drive e consumido pelos
 * notebooks (`statistics_gcn` / cell06) SEM Earth Engine no Colab.
 *
 * Convenções (espelho de `pantanal/forest/statistics/0_contract_stats.js`):
 *   - pool = grandeza medida (agb/agc/bgb/bgc/live/total/…); cada referência
 *     exporta UMA coluna `pool` por magnitude medida, COM SUFIXO NA COLUNA:
 *       <pool>_tC → total em toneladas de CARBONO   (t C)
 *       <pool>_tB → total em toneladas de BIOMASSA  (t MS)
 *     Refs só-biomassa emitem as DUAS (<pool>_tB nativa + <pool>_tC via
 *     CARBON_FRACTION) e refs de carbono emitem apenas <pool>_tC — garantindo
 *     que todo ref de estoque tenha ≥1 coluna no comparador comum (t C).
 *   - nível mínimo por linha de classe: n0..n4, natureza, marcador,
 *     ano_lulc, ano (do ref), area_ha, pools (<pool>_tC|_tB), incerteza_tC e
 *     mods def_sec (area_mod0..7_ha + <pool>_mod0..7_tC|_tB).
 *   - estrato LULC: coleção 11, banda classification_<YEAR>; def_sec:
 *     module_lulc_legends.js (same asset/bandas).
 *   - unidades SEMPRE toneladas (t): valor × pixelArea()/10000.
 ******************************************************************************/

exports.ECO = 'brazil';
exports.SCOPE = 'references';
exports.YEAR = 2023;       // ano do estrato LULC (classificação)
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.LULC_BAND = 'classification_' + exports.YEAR; // ex.: classification_2023

// ---- Fator AGB → C (IPCC default; aplicado no GEE p/ gerar <pool>_tC) ----
exports.CARBON_FRACTION = 0.47;

// ---- Território -------------------------------------------------------------
// Área de análise = TODOS os biomas (1 CSV por ref×bioma). slugs são usados
// no fileNamePrefix; `nome` é o valor da propriedade BIOME_PROP (IBGE 2026).
exports.BIOME_FC = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.BIOME_PROP = 'Bioma';
exports.BIOMES = [
  { slug: 'amazonia',      nome: 'Amazônia' },
  { slug: 'caatinga',      nome: 'Caatinga' },
  { slug: 'cerrado',       nome: 'Cerrado' },
  { slug: 'mata_atlantica', nome: 'Mata Atlântica' },
  { slug: 'pampa',         nome: 'Pampa' },
  { slug: 'pantanal',      nome: 'Pantanal' }
];

// ---- Saída -------------------------------------------------------------------
exports.DRIVE_FOLDER = 'MAPBIOMAS_CARBONO_ESTATISTICAS';
exports.PREFIX = 'stats_references';

// ---- Magnitudes aceitas (marcador no nome das colunas: tC / tB) --------------
// Emission: 'carbono' → <pool>_tC ; 'biomassa' → <pool>_tB + <pool>_tC ;
// 'incerteza' → incerteza_tC (ref de erro vira a própria coluna de incerteza).
exports.MAGNITUDES = ['biomassa', 'carbono', 'incerteza',
  'emissao', 'emissao_liquida', 'proporcao'];

// ---------------------------------------------------------------------------
// CATÁLOGO DE REFERÊNCIAS (19) — espelho do REF_CATALOG do Colab
// (cell00 statistics_gcn) e de docs/“Referencias - Mapas de referencia…”.
//
// Campos comuns:
//   id             slug único (igual ao ref_id do Colab — join direto)
//   fonte          nome legível exibido nos relatórios (group · variable)
//   magnitude      'biomassa' | 'carbono' | 'incerteza'
//   unit           unidade NATIVA da banda (t/ha | t C/ha | t C/ha erro)
//   scale          escala de redução (m) no Earth Engine
//   epoch          ano-base do mapa (string; 'baseline' p/ TCN/QCN)
//   factor_to_c    AGB→C aplicado para gerar <pool>_tC (1.0 se já carbono)
//   t2_candidate   elegível ao "melhor ano de referência" (T2)
//   pools          [{band, col}] — banda(s)/coluna(s) de valor (1 por ref,
//                  exceto Xu multi-ano onde a mesma banda é recomputada)
//   nodata_le      se valor <= nodata_le -> mascarar (sentinela)
//   filter_index   para IMAGE_COLLECTION: system:index a selecionar
//   multi_year     {start, end} p/ séries (Xu): UMA linha por ano, banda
//                  `band + (ano - start + 1)`, coluna fixa do pool.
// ---------------------------------------------------------------------------
var REF_ROOT = 'projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps';
var QCN_ROOT = 'projects/ee-ipam/assets/CCAL/public/qcn';

function ref(o) {
  return {
    factor_to_c: o.factor_to_c || 1, t2_candidate: o.t2 === undefined ? true : o.t2,
    nodata_le: o.nodata_le || null, filter_index: o.filter_index || null,
    multi_year: o.multi_year || null, note: o.note || '', ...o
  };
}

exports.REFERENCES = [
  // ---- Saatchi 2011 (Américas, ~1 km, florestas) ---------------------------
  ref({ id: 'saatchi_agb', fonte: 'Saatchi 2011 · AGB', magnitude: 'biomassa',
    unit: 't/ha', scale: 928, epoch: '2011', factor_to_c: 0.47,
    pools: [{ band: 'b1', col: 'agb' }],
    asset: REF_ROOT + '/Saatchi_2011_america_agb_1km', note: 'florestal; 2007-08' }),
  ref({ id: 'saatchi_carbon', fonte: 'Saatchi 2011 · AGC (carbono)',
    magnitude: 'carbono', unit: 't C/ha', scale: 928, epoch: '2011',
    pools: [{ band: 'b1', col: 'agc' }],
    asset: REF_ROOT + '/Saatchi_2011_america_carbon_1km' }),
  ref({ id: 'saatchi_bgb', fonte: 'Saatchi 2011 · BGB', magnitude: 'biomassa',
    unit: 't/ha', scale: 928, epoch: '2011', factor_to_c: 0.47, t2: false,
    pools: [{ band: 'b1', col: 'bgb' }],
    asset: REF_ROOT + '/Saatchi_2011_america_bgb_1km', note: 'pool BGB (contexto)' }),
  ref({ id: 'saatchi_carbon_error', fonte: 'Saatchi 2011 · erro AGC',
    magnitude: 'incerteza', unit: 't C/ha', scale: 928, epoch: '2011', t2: false,
    pools: [{ band: 'b1', col: 'incerteza' }],
    asset: REF_ROOT + '/Saatchi_2011_america_carbon_error_1km',
    note: 'incerteza da ref' }),
  // ---- Baccini 2012 (tropical, ~30 m; teto byte 255) ------------------------
  ref({ id: 'baccini_agb', fonte: 'Baccini 2012 · AGB', magnitude: 'biomassa',
    unit: 't/ha', scale: 30, epoch: '2012', factor_to_c: 0.47,
    pools: [{ band: 'b1', col: 'agb' }], asset: REF_ROOT + '/Z_baccini_30_agb',
    note: 'teto 255 t/ha (saturação, não físico)' }),
  // ---- Avitabile 2016 (fusão Saatchi+Baccini, ~1 km, ano-base 2010) ---------
  ref({ id: 'avitabile_agb', fonte: 'Avitabile 2016 · AGB pan-tropical',
    magnitude: 'biomassa', unit: 't/ha', scale: 928, epoch: '2010',
    factor_to_c: 0.47, nodata_le: -3.4e38,
    pools: [{ band: 'b1', col: 'agb' }], asset: REF_ROOT + '/Avitabile_AGB_Map',
    note: 'sentinela -3.4e38 mascarada' }),
  ref({ id: 'avitabile_carbon_cerr', fonte: 'Avitabile 2016 · AGC (Cerrado)',
    magnitude: 'carbono', unit: 't C/ha', scale: 928, epoch: '2010',
    nodata_le: -3.4e38, pools: [{ band: 'b1', col: 'agc' }],
    asset: REF_ROOT + '/Avitabile_Carbon_AGB_Cerr' }),
  ref({ id: 'avitabile_carbon_amaz', fonte: 'Avitabile 2016 · AGC (Amazônia)',
    magnitude: 'carbono', unit: 't C/ha', scale: 928, epoch: '2010',
    nodata_le: -3.4e38, pools: [{ band: 'b1', col: 'agc' }],
    asset: REF_ROOT + '/Avitabile_Carbon_AGB_amaz' }),
  ref({ id: 'avitabile_mode_k_pant',
    fonte: 'Avitabile 2016 · AGB Mode K (Pantanal)', magnitude: 'biomassa',
    unit: 't/ha', scale: 250, epoch: '1985', factor_to_c: 0.47, t2: false,
    pools: [{ band: 'total_1985', col: 'agb' }],
    asset: REF_ROOT + '/Avitabile_AGB_Map_Mode_K_2_2',
    filter_index: 'pantanal_rect_total_v2',
    note: 'semântica/unidade a confirmar (banda total_1985)' }),
  // ---- Xu & Saatchi 2021 (biomassa viva AGB+BGB, t C/ha, 2000–2019, ~10 km) --
  ref({ id: 'xu2021', fonte: 'Xu & Saatchi 2021 · carbono vivo (2000–2019)',
    magnitude: 'carbono', unit: 't C/ha', scale: 11131.949, epoch: '2000-2019',
    pools: [{ band: 'b1', col: 'live' }],
    multi_year: { start: 2000, end: 2019 },
    asset: REF_ROOT + '/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2',
    note: 'b<i> -> ano 1999+i (premissa); inclui BGB' }),
  // ---- TCN (3ª CN, baseline pretérito, ~110 m) --------------------------------
  ref({ id: 'tcn_agc', fonte: 'TCN (3ª CN) · AGC', magnitude: 'carbono',
    unit: 't C/ha', scale: 110, epoch: 'baseline',
    pools: [{ band: 'b1', col: 'agc' }], asset: REF_ROOT + '/TCN_AGC_comAgua_wgs84' }),
  ref({ id: 'tcn_total', fonte: 'TCN (3ª CN) · estoque total', magnitude: 'carbono',
    unit: 't C/ha', scale: 110, epoch: 'baseline',
    pools: [{ band: 'b1', col: 'total' }],
    asset: REF_ROOT + '/TCN_TOTALC_comAgua_wgs84' }),
  ref({ id: 'tcn_bgc', fonte: 'TCN (3ª CN) · BGC', magnitude: 'carbono',
    unit: 't C/ha', scale: 110, epoch: 'baseline', t2: false,
    pools: [{ band: 'b1', col: 'bgc' }], asset: REF_ROOT + '/TCN_BGC_comAgua_wgs84' }),
  ref({ id: 'tcn_dwc', fonte: 'TCN (3ª CN) · madeira morta', magnitude: 'carbono',
    unit: 't C/ha', scale: 110, epoch: 'baseline', t2: false,
    pools: [{ band: 'b1', col: 'cdw' }], asset: REF_ROOT + '/TCN_DWC_comAgua_wgs84' }),
  ref({ id: 'tcn_litter', fonte: 'TCN (3ª CN) · serrapilheira', magnitude: 'carbono',
    unit: 't C/ha', scale: 110, epoch: 'baseline', t2: false,
    pools: [{ band: 'b1', col: 'litter' }],
    asset: REF_ROOT + '/TCN_LITTERC_comAgua_wgs84' }),
  // ---- QCN (4ª CN, baseline / alinhada a 1985) --------------------------------
  ref({ id: 'qcn_total', fonte: 'QCN (4ª CN) · estoque total', magnitude: 'carbono',
    unit: 't C/ha', scale: 30, epoch: 'baseline',
    pools: [{ band: 'TOTAL', col: 'total' }],
    asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1' }),
  ref({ id: 'qcn_agb', fonte: 'QCN (4ª CN) · AGB', magnitude: 'carbono',
    unit: 't C/ha', scale: 30, epoch: 'baseline',
    pools: [{ band: 'AGB', col: 'agb' }],
    asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1' }),
  ref({ id: 'qcnr_total', fonte: 'QCN-r (4ª CN, rect) · estoque total',
    magnitude: 'carbono', unit: 't C/ha', scale: 30, epoch: '1985',
    pools: [{ band: 'TOTAL', col: 'total' }],
    asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1',
    note: 'alinhada ao grid/ano-base MapBiomas 1985' }),
  ref({ id: 'qcnr_agb', fonte: 'QCN-r (4ª CN, rect) · AGB', magnitude: 'carbono',
    unit: 't C/ha', scale: 30, epoch: '1985',
    pools: [{ band: 'AGB', col: 'agb' }],
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