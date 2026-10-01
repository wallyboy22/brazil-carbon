/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v01 · run_view (APP de QA) — SEM requires
 * ---------------------------------------------------------------------------
 * Versão 01 do app de QA visual. É **stand-alone**: todo o código (dados +
 * engine + app) está NESTE arquivo, sem a árvore de `require` da v00. Só a UI
 * reutilizável é puxada (2 requires, compartilhada com a v00).
 *
 * Por que inline? Para **facilitar adicionar/remover camadas**: aqui você edita
 * uma lista `LAYERS` e pronto — sem caçar módulo de catálogo nem adjustar
 * `require`. Os dados ficam no topo, bem comentados.
 *
 * Recursos:
 *   · TERRITÓRIO: Bioma / UF / Região / Brasil (assets do projeto);
 *   · CAMADAS: MapBiomas Carbono (Cerrado/Pantanal/NPP/AGB IFN+EBA),
 *     Referências, Auxiliares;
 *   · Legendas de rampa (Mín/Máx editável POR barra) + Uso e Cobertura (C11) +
 *     opacidade;
 *   · Painel direito: grade de miniaturas (camada × território);
 *   · Toggles MAP ON/OFF, THUMBNAILS ON/OFF e INSPECTOR ON/OFF.
 *
 * Módulo INSPECTOR: com ON, o clique no mapa mostra o valor do pixel de cada
 * camada ligada (+ bloco AGB/IC90/CV quando as 3 camadas IFN+EBA estão ligadas).
 *
 * Uso: só rodar no Code Editor.
 *
 * Regra de ouro (AGENTS.md): nunca `.clip` — máscara via `paint(...).eq(0)`.
 ******************************************************************************/

// ---------------------------------------------------------------------------
// UI (ÚNICO ponto que usa require — sistema de UI compartilhado)
// ---------------------------------------------------------------------------
var UI = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/ui/module_ui.js');
var ML = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/ui/module_map_layers.js');

// ===========================================================================
// PARTE 1 · VIS (rampas compartilhadas)
// ---------------------------------------------------------------------------
// Camadas de QUANTIDADE POR ÁREA (t/ha, t C/ha, t CO2e/ha) usam a MESMA
// rampa para comparação direta. Incerteza usa `ERR`.
var VIS_AREA = { min: 0, max: 300,
  palette: ['#ffffe5', '#d9f0a3', '#78c679', '#238443', '#004529'] };
var VIS_ERR = { min: 0, max: 60,
  palette: ['#fff7bc', '#fec44f', '#d95f0e', '#993404'] };
// Incerteza RELATIVA (CV = meia_largura / AGB): mesma paleta da `ERR`, escala
// própria (0–0,6) porque é uma razão.
var VIS_CV = { min: 0, max: 0.6, palette: VIS_ERR.palette };
// NPP (carbono do campo): faixa estreita (0–2 t C/ha). Paleta viridis —
// sequencial/perceptualmente uniforme, distinta do verde (AREA) e do vermelho (ERR).
var VIS_NPP = { min: 0, max: 2,
  palette: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'] };

// ===========================================================================
// PARTE 2 · LIMITES (IBGE)
// ---------------------------------------------------------------------------
var LIM_BIOMES_FC =
  'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
var LIM_UFS_FC =
  'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_ufs_IBGE_2025';
var LIM_BIOME_NAME_PROP = 'Bioma';
var LIM_UF_NAME_PROP = 'NM_UF';

// ===========================================================================
// PARTE 3 · TERRITÓRIOS (níveis da UI)
// ---------------------------------------------------------------------------
// kind: 'fc' (asset+prop) · 'custom' (regiões nomeadas) · 'all' (Brasil).
var LEVELS = {
  bioma: { label: 'Bioma', kind: 'fc', asset: LIM_BIOMES_FC,
    prop: LIM_BIOME_NAME_PROP },
  uf: { label: 'UF', kind: 'fc', asset: LIM_UFS_FC, prop: LIM_UF_NAME_PROP },
  regiao: { label: 'Região', kind: 'custom', regions: [
    { name: 'BAP',
      asset: 'projects/ee-arcplan/assets/bap_pantanal_planalto' },
    { name: 'Matopiba',
      asset: 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/' +
        'COLECAO8/VERSAO-1/matopiba' }
  ] },
  brasil: { label: 'Brasil', kind: 'all' }
};
var LEVEL_ORDER = ['bioma', 'uf', 'regiao', 'brasil'];

// ===========================================================================
// PARTE 4 · USO E COBERTURA (MapBiomas C11)
// ---------------------------------------------------------------------------
var C11_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
var C11_LEGEND = {
  3:  { nome: 'Formação Florestal',            cor: '#1f8d49' },
  4:  { nome: 'Formação Savânica',             cor: '#7dc975' },
  5:  { nome: 'Mangue',                        cor: '#04381d' },
  6:  { nome: 'Floresta Alagável',             cor: '#007785' },
  7:  { nome: 'Savana Alagada (β)',            cor: '#228c70' },
  9:  { nome: 'Silvicultura',                  cor: '#7a5900' },
  10: { nome: 'Formação Natural não Florestal', cor: '#d6bc74' },
  11: { nome: 'Campo Alagado e Área Pantanosa', cor: '#519799' },
  12: { nome: 'Formação Campestre',            cor: '#86b074' },
  13: { nome: 'Outras Formações não Florestais', cor: '#af2ab4' },
  14: { nome: 'Agropecuária',                  cor: '#ffefc3' },
  15: { nome: 'Pastagem',                      cor: '#edde8e' },
  18: { nome: 'Agricultura',                   cor: '#e974ed' },
  19: { nome: 'Lavoura Temporária',            cor: '#c27ba0' },
  20: { nome: 'Cana',                          cor: '#db7093' },
  21: { nome: 'Mosaico de Usos',               cor: '#ffefc3' },
  22: { nome: 'Área não Vegetada',             cor: '#d4271e' },
  23: { nome: 'Praia, Duna e Areal',           cor: '#ffa07a' },
  24: { nome: 'Área Urbanizada',               cor: '#d4271e' },
  25: { nome: 'Outras Áreas não Vegetadas',    cor: '#db4d4f' },
  26: { nome: "Corpos D'água",                 cor: '#2532e4' },
  29: { nome: 'Afloramento Rochoso',           cor: '#ad5100' },
  30: { nome: 'Mineração',                     cor: '#9c0027' },
  31: { nome: 'Aquicultura',                   cor: '#091077' },
  32: { nome: 'Apicum',                        cor: '#fc8114' },
  33: { nome: 'Rio, Lago e Oceano',            cor: '#2532e4' },
  35: { nome: 'Dendê',                         cor: '#9065d0' },
  36: { nome: 'Lavoura Perene',                cor: '#d082de' },
  39: { nome: 'Soja',                          cor: '#f5b3c8' },
  40: { nome: 'Arroz',                         cor: '#c71585' },
  41: { nome: 'Outras Lavouras Temporárias',   cor: '#f54ca9' },
  46: { nome: 'Café',                          cor: '#d68fe2' },
  47: { nome: 'Citrus',                        cor: '#9932cc' },
  48: { nome: 'Outras Lavouras Perenes',       cor: '#e6ccff' },
  49: { nome: 'Restinga Arbórea',              cor: '#02d659' },
  50: { nome: 'Restinga Herbácea ou Arbustiva', cor: '#ffaa5f' },
  62: { nome: 'Algodão (β)',                   cor: '#ff69b4' },
  75: { nome: 'Usina Fotovoltaica',            cor: '#757272' },
  77: { nome: 'Formação Herbácea Arbustiva',   cor: '#86b074' },
  84: { nome: 'Marisma (β)',                   cor: '#81dbbf' },
  91: { nome: 'Parque eólico (β)',             cor: '#403d3e' }
};
var C11_VIS = (function () {
  var codes = Object.keys(C11_LEGEND).map(function (k) {
    return parseInt(k, 10);
  });
  var maxCode = Math.max.apply(null, codes);
  var palette = [];
  for (var i = 0; i <= maxCode; i++) palette.push('#000000');
  codes.forEach(function (c) { palette[c] = C11_LEGEND[c].cor; });
  return { min: 0, max: maxCode, palette: palette };
})();

// ===========================================================================
// PARTE 5 · PRODUTOS (resultados do projeto) e REFERÊNCIAS
// ---------------------------------------------------------------------------
var FOREST_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var GRASS_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND';
var CERRADO_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/Cerrado/mapa_biomassa_vbeta1';
var PAMPA_BASE =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/Pampa';
var REF_ROOT = 'projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps';
var QCN_ROOT = 'projects/ee-ipam/assets/CCAL/public/qcn';
var IFN_ASSET = 'projects/ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13';

// -- AGB florestal Brasil (IFN+EBA): mosaico por ano, AGB + incerteza ---------
// Bands: AGB_Mg_ha, sd_modelo, sd_rotulo, meia_largura, ic_inf, ic_sup.
// No app só há dado de 2024 → cada camada fixa `year` (sem seletor de ano).
var AGB_BR_IC = 'projects/ee-redd-brazil/assets/AGB_IFNEBA_ic_v1';
var AGB_BR_YEAR = 2024;
var AGB_BR_BANDS = {
  agb: 'AGB_Mg_ha',          // t/ha (banda em Mg/ha; exibido em t/ha)
  meiaLargura: 'meia_largura', // ± IC90 (exibido em t/ha)
  icInf: 'ic_inf', icSup: 'ic_sup'
};

// -- Auxiliares MapBiomas (Pastagem / Solo) ---------------------------------
var MB_PASTURE = {
  asset: 'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
    'mapbiomas_brazil_collection11_pasture_biomass_v1',
  band: function (y) { return 'biomass_' + y; },
unit: 't/ha', vis: VIS_AREA
};
var MB_SOIL = {
  asset: 'projects/mapbiomas-public/assets/brazil/soil/collection3/' +
    'mapbiomas_brazil_collection3_soil_carbon_v1',
  band: function (y) { return 'carbon_' + y; },
  unit: 't C/ha', vis: VIS_AREA
};

// ===========================================================================
// PARTE 6 · REGISTRY DE CAMADAS  <<< ADICIONE/REMOVA CAMADAS AQUI >>>
// ---------------------------------------------------------------------------
// Cada camada: { id, nome, tipo, grupo, asset|col, band, vis, ... }
//   tipo : 'resultado' | 'referencia' | 'lulc' | 'auxiliar'
//   grupo: id do grupo (chave das gavetas) — ver PARTE 7 (ex.: 'npp',
//          'cerrado_florestal', id da fonte de referência, 'ifn_eba', ...).
// Campo 'paint: {fc, prop}' rasteriza uma FC numa banda (IFN).
// Campo 'yearProp' troca a propriedade de ano da coleção (padrão 'year').
// Campo 'derived' (string) gera a banda a partir do mosaico completo (ex.: CV).
var LAYERS = [];

// --- Resultados: Cerrado Florestal -----------------------------------------
LAYERS.push({ id: 'res_cerrado_vbeta1', grupo: 'cerrado_florestal',
  nome: 'Cerrado Florestal vbeta1 (2020)', tipo: 'resultado',
  asset: CERRADO_BASE + '/mosaico_final_agb_2020_vbeta1_1', band: 'b1',
  unit: 't/ha', vis: VIS_AREA });
LAYERS.push({ id: 'res_cerrado_vbeta1_nativo', grupo: 'cerrado_florestal',
  nome: 'Cerrado Florestal vbeta1 nativo (2020)', tipo: 'resultado',
  asset: CERRADO_BASE + '/mosaico_final_agb_2020_mask_vbeta1_1', band: 'b1',
  unit: 't/ha', vis: VIS_AREA });

// --- Resultados: Pantanal Florestal (ImageCollection COL por ano) -----------
function addForest(id, label, root) {
  LAYERS.push({ id: 'res_forest_' + id, grupo: 'pantanal_florestal',
    nome: 'Pantanal Forest ' + label, tipo: 'resultado',
    col: root + '/PREDICTIONS/COL', band: 'prediction_2023',
    stdBand: 'agbd_std_2023', year: 2023, unit: 't/ha', vis: VIS_AREA });
}
addForest('v03', 'v03', FOREST_BASE + '/V03');
addForest('v04', 'v04', FOREST_BASE + '/V04');
addForest('v05', 'v05', FOREST_BASE + '/V05');
addForest('v06', 'v06', FOREST_BASE + '/V06');
addForest('v07', 'v07', FOREST_BASE + '/V07');
addForest('v08_gedi', 'v08 (GEDI)', FOREST_BASE + '/V08_GEDI');
addForest('v08_ifn', 'v08 (IFN)', FOREST_BASE + '/V08_IFN');

// --- Resultados: Pantanal Campestre ----------------------------------------
LAYERS.push({ id: 'res_grass_v01_biomass', grupo: 'pantanal_campestre',
  nome: 'Pantanal Campestre v01 biomassa', tipo: 'resultado',
  asset: GRASS_BASE + '/V01/BIOMASS/grassland_biomass_annual_v01_2023',
  band: 'biomass_annual', unit: 't/ha', vis: VIS_AREA });
LAYERS.push({ id: 'res_grass_v01_carbon', grupo: 'pantanal_campestre',
  nome: 'Pantanal Campestre v01 carbono', tipo: 'resultado',
  asset: GRASS_BASE + '/V01/CARBON/grassland_carbon_stock_v01_2023',
  band: 'carbon_stock_MgC_ha', unit: 't C/ha', vis: VIS_AREA });

// --- Referências (benchmarks / CNs) -----------------------------------------
function addRef(o) {
  if (o.nodata_le === undefined) o.nodata_le = null;
  if (o.vis === undefined) o.vis = VIS_AREA;
  LAYERS.push({ id: 'ref_' + o.id, grupo: o.grupo, nome: o.nome,
    tipo: 'referencia', asset: o.asset, band: o.band, unit: o.unit,
    nodata_le: o.nodata_le, multi_year: o.multi_year, vis: o.vis });
}
addRef({ id: 'saatchi_agb', grupo: 'saatchi', nome: 'Saatchi 2011 · AGB',
  unit: 't/ha', asset: REF_ROOT + '/Saatchi_2011_america_agb_1km', band: 'b1' });
addRef({ id: 'saatchi_carbon', grupo: 'saatchi', nome: 'Saatchi 2011 · AGC',
  unit: 't C/ha', asset: REF_ROOT + '/Saatchi_2011_america_carbon_1km',
  band: 'b1' });
addRef({ id: 'saatchi_bgb', grupo: 'saatchi', nome: 'Saatchi 2011 · BGB',
  unit: 't/ha', asset: REF_ROOT + '/Saatchi_2011_america_bgb_1km', band: 'b1' });
addRef({ id: 'saatchi_carbon_error', grupo: 'saatchi',
  nome: 'Saatchi 2011 · erro AGC', unit: 't C/ha',
  asset: REF_ROOT + '/Saatchi_2011_america_carbon_error_1km', band: 'b1',
  vis: VIS_ERR });
addRef({ id: 'baccini_agb', grupo: 'baccini', nome: 'Baccini 2012 · AGB',
  unit: 't/ha', asset: REF_ROOT + '/Z_baccini_30_agb', band: 'b1' });
addRef({ id: 'zimbres_agb', grupo: 'zimbres',
  nome: 'Zimbres 2021 · AGB Cerrado', unit: 't/ha',
  asset: REF_ROOT + '/Zimbres_2021_AGB_NVmasked_RF_cog-v1', band: 'b1' });
addRef({ id: 'avitabile_agb', grupo: 'avitabile', nome: 'Avitabile 2016 · AGB',
  unit: 't/ha', asset: REF_ROOT + '/Avitabile_AGB_Map', band: 'b1',
  nodata_le: -3.4e38 });
addRef({ id: 'xu2021', grupo: 'xu',
  nome: 'Xu & Saatchi 2021 · C vivo (2000–2019)', unit: 't C/ha',
  asset: REF_ROOT + '/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2',
  band: 'b1', multi_year: { start: 2000, end: 2019 } });
addRef({ id: 'tcn_agc', grupo: 'tcn', nome: 'TCN · AGC', unit: 't C/ha',
  asset: REF_ROOT + '/TCN_AGC_comAgua_wgs84', band: 'b1',
  nodata_le: -1e30 });
addRef({ id: 'tcn_total', grupo: 'tcn', nome: 'TCN · total', unit: 't C/ha',
  asset: REF_ROOT + '/TCN_TOTALC_comAgua_wgs84', band: 'b1',
  nodata_le: -1e30 });
addRef({ id: 'tcn_bgc', grupo: 'tcn', nome: 'TCN · BGC', unit: 't C/ha',
  asset: REF_ROOT + '/TCN_BGC_comAgua_wgs84', band: 'b1',
  nodata_le: -1e30 });
addRef({ id: 'tcn_dwc', grupo: 'tcn', nome: 'TCN · madeira morta',
  unit: 't C/ha', asset: REF_ROOT + '/TCN_DWC_comAgua_wgs84', band: 'b1',
  nodata_le: -1e30 });
addRef({ id: 'tcn_litter', grupo: 'tcn', nome: 'TCN · serrapilheira',
  unit: 't C/ha', asset: REF_ROOT + '/TCN_LITTERC_comAgua_wgs84', band: 'b1',
  nodata_le: -1e30 });
addRef({ id: 'qcn_total', grupo: 'qcn', nome: 'QCN · total', unit: 't C/ha',
  asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1',
  band: 'TOTAL' });
addRef({ id: 'qcn_agb', grupo: 'qcn', nome: 'QCN · AGB', unit: 't C/ha',
  asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_v1', band: 'AGB' });
addRef({ id: 'qcnr_total', grupo: 'qcnr', nome: 'QCN-r (1985) · total',
  unit: 't C/ha',
  asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1',
  band: 'TOTAL' });
addRef({ id: 'qcnr_agb', grupo: 'qcnr', nome: 'QCN-r (1985) · AGB',
  unit: 't C/ha',
  asset: QCN_ROOT + '/qcn_brazil_historical_biomass_carbon_qcn_rect_v1',
  band: 'AGB' });

// --- IFN (parcelas de campo, rasterizadas via `paint`) -----------------------
function addIfn(prop, label, unit, vis) {
  LAYERS.push({ id: 'ref_ifn_' + label, grupo: 'ifn',
    nome: 'IFN · ' + label + ' (' + unit + ')', tipo: 'referencia',
    paint: { fc: IFN_ASSET, prop: prop }, unit: unit, vis: vis });
}
addIfn('AGB_Mg_ha', 'AGB', 't/ha', VIS_AREA);
addIfn('C_Mg_ha', 'Carbono', 't C/ha', VIS_AREA);
addIfn('CO2e_Mg_ha', 'CO2e', 't CO2e/ha',
  { min: 0, max: 550,
    palette: ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'] });
addIfn('G_m2_ha', 'Área basal', 'm²/ha',
  { min: 0, max: 60,
    palette: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'] });
addIfn('n_ind', 'Nº indivíduos', 'nº',
  { min: 0, max: 40,
    palette: ['#f1eef6', '#d0d1e6', '#a6bddb', '#3690c0', '#034e7b'] });
addIfn('AGB_Mg', 'AGB total', 't',
  { min: 0, max: 50,
    palette: ['#ffffe5', '#d9f0a3', '#78c679', '#238443', '#004529'] });

// --- Auxiliar: Uso e Cobertura (C11) — anos-chave ---------------------------
[1985, 2000, 2010, 2023].forEach(function (y) {
  LAYERS.push({ id: 'lulc_' + y, grupo: 'uso_cobertura',
    nome: 'MapBiomas C11 · ' + y, tipo: 'lulc',
    asset: C11_ASSET, band: 'classification_' + y, vis: C11_VIS });
});

// --- Auxiliares: MapBiomas Pastagem / Solo (2023) ---------------------------
LAYERS.push({ id: 'aux_mb_pastagem_2023', grupo: 'mapbiomas_pastagem',
  nome: 'MapBiomas Pastagem · biomassa 2023', tipo: 'auxiliar',
  asset: MB_PASTURE.asset, band: MB_PASTURE.band(2023),
  unit: MB_PASTURE.unit, vis: MB_PASTURE.vis });
LAYERS.push({ id: 'aux_mb_solo_2023', grupo: 'mapbiomas_solo',
  nome: 'MapBiomas Solo · carbono orgânico 2023', tipo: 'auxiliar',
  asset: MB_SOIL.asset, band: MB_SOIL.band(2023),
  unit: MB_SOIL.unit, vis: MB_SOIL.vis });

// --- Resultado: NPP Pampa (carbono do campo, iniciativa NPP) -----------------
// Ambos têm UMA banda: `carbono_campo`.
LAYERS.push({ id: 'npp_2025', grupo: 'npp',
  nome: 'NPP 2025', tipo: 'resultado',
  asset: PAMPA_BASE + '/pampa_carbono_max_quente_2025',
  band: 'carbono_campo', unit: 't C/ha', vis: VIS_NPP });
LAYERS.push({ id: 'npp_2024', grupo: 'npp',
  nome: 'NPP 2024', tipo: 'resultado',
  asset: PAMPA_BASE + '/cerrado_carbono_max_quente_2024',
  band: 'carbono_campo', unit: 't C/ha', vis: VIS_NPP });

// --- Referência: AGB florestal Brasil (IFN+EBA) -----------------------------
// `yearProp:'ano'` porque a coleção usa `ano` (não `year` como as outras).
// `derived` calcula a banda no client-side a partir do mosaico completo.
function addAgbBr(id, nome, extra) {
  LAYERS.push(Object.assign({ id: 'agb_br_' + id, grupo: 'ifn_eba', nome: nome,
    tipo: 'resultado', col: AGB_BR_IC, yearProp: 'ano', year: AGB_BR_YEAR },
    extra));
}
addAgbBr('agb_2024', 'AGB (2024)',
  { band: AGB_BR_BANDS.agb, unit: 't/ha', vis: VIS_AREA });
addAgbBr('ic90_2024', 'Incerteza IC90 (2024)',
  { band: AGB_BR_BANDS.meiaLargura, unit: 't/ha', vis: VIS_ERR });
addAgbBr('cv_2024', 'Incerteza relativa (2024)',
  { derived: 'meia_largura.divide(AGB_Mg_ha.max(1))', band: 'incerteza_rel',
    unit: '', vis: VIS_CV });

// ===========================================================================
// PARTE 7 · GRUPOS (ordem + rótulos das gavetas)  <<< AJUSTE AQUI >>>
// ---------------------------------------------------------------------------
// Os grupos não guardam camadas — só a ordem de exibição e o rótulo. As
// camadas vêm do registry acima via o campo `grupo`.
var GRUPOS_RESULTADO = [
  { id: 'cerrado_florestal', label: 'Cerrado Florestal' },
  { id: 'pantanal_florestal', label: 'Pantanal Florestal' },
  { id: 'pantanal_campestre', label: 'Pantanal Campestre' },
  { id: 'npp', label: 'NPP' },
  { id: 'ifn_eba', label: 'AGB IFN+EBA' }
];
var GRUPOS_REFERENCIA = [
  { id: 'saatchi', label: 'Saatchi 2011 (Américas)' },
  { id: 'baccini', label: 'Baccini 2012 (tropical)' },
  { id: 'zimbres', label: 'Zimbres 2021 (Cerrado)' },
  { id: 'avitabile', label: 'Avitabile 2016 (pan-tropical)' },
  { id: 'xu', label: 'Xu & Saatchi 2021 (tropical)' },
  { id: 'tcn', label: 'TCN (3ª CN)' },
  { id: 'qcn', label: 'QCN (4ª CN)' },
  { id: 'qcnr', label: 'QCN-r (1985)' },
  { id: 'ifn', label: 'IFN (inventário de campo)' }
];
var GRUPOS_AUXILIAR = [
  { id: 'uso_cobertura', label: 'Uso e Cobertura (C11)' },
  { id: 'mapbiomas_pastagem', label: 'MapBiomas Pastagem (biomassa)' },
  { id: 'mapbiomas_solo', label: 'MapBiomas Solo (carbono orgânico)' }
];

/** Agrupa as camadas (do registry) segundo a ordem de `defs`. */
function groupLayers(defs) {
  return defs.map(function (d) {
    var g = { id: d.id, label: d.label, camadas: [] };
    LAYERS.forEach(function (l) {
      if (l.grupo === d.id) g.camadas.push(l);
    });
    return g;
  }).filter(function (g) { return g.camadas.length > 0; });
}
var GRP_RESULTADO = groupLayers(GRUPOS_RESULTADO);
var GRP_REFERENCIA = groupLayers(GRUPOS_REFERENCIA);
var GRP_AUXILIAR = groupLayers(GRUPOS_AUXILIAR);

/** Busca a camada por id. */
function layerById(id) {
  for (var i = 0; i < LAYERS.length; i++) {
    if (LAYERS[i].id === id) return LAYERS[i];
  }
  return null;
}

// ===========================================================================
// PARTE 8 · ENGINE
// ---------------------------------------------------------------------------
/** true se o asset existe (getAsset direto; não depende de listar a pasta). */
function assetExists(id) {
  if (!id) return false;
  try { ee.data.getAsset(id); return true; } catch (e) { return false; }
}

/** ee.Image de exibição de uma camada (paint | COL | asset; banda; nodata). */
function buildImage(layer) {
  if (layer.paint) {
    return ee.Image().paint(ee.FeatureCollection(layer.paint.fc),
      layer.paint.prop);
  }
  // `yearProp` permite coleções que usam outra propriedade de ano (`ano`).
  var img = layer.col
    ? ee.ImageCollection(layer.col)
        .filter(ee.Filter.eq(layer.yearProp || 'year', layer.year || 2023))
        .mosaic()
    : ee.Image(layer.asset);
  // `derived` (string) = expressão sobre o mosaico completo (precisa de várias
  // bandas de entrada), avaliada no client-side; ex. incerteza relativa.
  var band = layer.band;
  if (layer.derived) {
    img = img.expression(layer.derived).rename([band]);
  } else {
    if (layer.multi_year) {
      band = 'b' + (layer.multi_year.end - layer.multi_year.start + 1);
    }
    img = img.select(band);
  }
  if (layer.nodata_le !== null && layer.nodata_le !== undefined) {
    img = img.updateMask(img.gt(layer.nodata_le));
  }
  return img;
}

/** Mascara a camada ao território (FC): dentro=1, fora=masked. SEM clip. */
function maskedImage(layer, fc) {
  return buildImage(layer).updateMask(ee.Image().paint(fc).eq(0));
}

/** Nomes das regiões de um nível (assíncrono quando 'fc'). */
function regionNames(levelId, callback) {
  var lv = LEVELS[levelId];
  if (!lv || lv.kind === 'all') { callback(['Brasil']); return; }
  if (lv.kind === 'custom') {
    callback(lv.regions.map(function (r) { return r.name; }));
    return;
  }
  ee.FeatureCollection(lv.asset).aggregate_array(lv.prop).distinct().sort()
    .evaluate(function (names) { callback(names || []); });
}

/** FeatureCollection do território (vazio = nível inteiro). */
function featuresFor(levelId, values) {
  var lv = LEVELS[levelId];
  if (!lv || lv.kind === 'all' || !values || !values.length) {
    return ee.FeatureCollection(LEVELS.bioma.asset);
  }
  if (lv.kind === 'custom') {
    var fcs = values.map(function (v) {
      var r = lv.regions.filter(function (x) { return x.name === v; })[0];
      return ee.FeatureCollection(r.asset);
    });
    return ee.FeatureCollection(fcs).flatten();
  }
  return ee.FeatureCollection(lv.asset).filter(ee.Filter.inList(lv.prop, values));
}

/** Bounds do território (uso NÃO-máscara: region/center). */
function boundsFor(levelId, values) {
  return featuresFor(levelId, values).geometry().bounds();
}

// ===========================================================================
// PARTE 9 · APP (UI)
// ---------------------------------------------------------------------------
// Só camadas cujo asset EXISTE (pula o que ainda não foi exportado, ex.: v08).
var available = LAYERS.filter(function (l) {
  var target = l.col || l.asset || (l.paint && l.paint.fc);
  if (assetExists(target)) return true;
  print('[AVISO] camada ausente (ignorada):', l.nome, '→', target);
  return false;
});

Map.setOptions('SATELLITE');
Map.setCenter(-52.0, -14.0, 4);   // visão Brasil (sem zoom por território)

var shell = UI.createAppShell({ title: 'MapBiomas Carbono · QA (v01)' });
var activity = UI.createActivity(shell.activity);
var mlayers = ML.manager(Map);
var state = { level: 'bioma', regions: [], layers: {}, opacity: 0.85 };

// ---------------------------------------------------------------------------
// TERRITÓRIO
// ---------------------------------------------------------------------------
var cabTerr = UI.createCabinet({ title: 'TERRITÓRIO', isOpen: true });
shell.body.add(cabTerr.panel);

var drawerLevels = UI.createButtonDrawer({
  title: 'Nível',
  options: LEVEL_ORDER.map(function (id) {
    return { id: id, label: LEVELS[id].label, active: id === 'bioma',
      onClick: function (id) { setLevel(id); } };
  })
});
cabTerr.content.add(drawerLevels.panel);

var drawerRegions = UI.createLayerDrawer({ title: 'Regiões (vazio = Brasil)',
  options: [] });
cabTerr.content.add(drawerRegions.panel);

// ---------------------------------------------------------------------------
// CAMADAS — gavetas aninhadas (MapBiomas Carbono · Referência · Auxiliares)
// ---------------------------------------------------------------------------
var availIds = {};
available.forEach(function (l) { availIds[l.id] = true; });

/** Mantém só os grupos com camadas disponíveis (comparação por ID). */
function availGroups(groups) {
  return (groups || []).map(function (g) {
    return { id: g.id, label: g.label,
      camadas: (g.camadas || []).filter(function (l) {
        return !!availIds[l.id];
      }) };
  }).filter(function (g) { return g.camadas.length > 0; });
}

function addLayerDrawer(parent, layers) {
  var drawer = UI.createLayerDrawer({
    title: 'camadas',
    options: layers.map(function (l) {
      return { id: l.id, label: l.nome, value: false,
        onChange: function (v) { state.layers[l.id] = v; refreshMap(); } };
    })
  });
  parent.content.add(drawer.panel);
}

function addSubCabinet(parent, label, layers) {
  try {
    var sub = UI.createCabinet({ title: label, isOpen: false,
      indent: '2px 2px 2px 10px' });
    addLayerDrawer(sub, layers);
    parent.content.add(sub.panel);
  } catch (e) {
    print('[ERRO] subgaveta', label, e);
  }
}

// --- INSPECTOR (módulo novo) -------------------------------------------------
// State do módulo (declarado antes do botão para o onClosure poder ler).
var inspectOn = false;
var clickHandler = null;
var inspectorBox = null;
var inspectorSeq = 0;

/** Camadas marcadas como ligadas (e disponíveis). */
function activeLayers() {
  return available.filter(function (l) { return !!state.layers[l.id]; });
}

/** Monta o painel flutuante do inspetor (top-right). */
function ensureInspector() {
  if (inspectorBox) return inspectorBox;
  inspectorBox = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
    style: { position: 'top-right', width: '270px', padding: '6px',
      backgroundColor: '#ffffffee', border: '1px solid #b0b0b0' } });
  try { Map.add(inspectorBox); } catch (e) { /* ignora */ }
  return inspectorBox;
}

/** Escreve o conteúdo do painel do inspetor. */
function renderInspector(widgets) {
  var box = ensureInspector();
  box.clear();
  box.add(ui.Label('INSPECTOR',
    { fontSize: '12px', fontWeight: 'bold', margin: '0 0 2px 0' }));
  widgets.forEach(function (w) { box.add(w); });
}

function inspectorHeader(coords) {
  return ui.Label('Ponto (' + coords.lon.toFixed(3) + ', ' +
    coords.lat.toFixed(3) + ')',
    { fontSize: '11px', fontWeight: 'bold', margin: '2px 0 1px 0' });
}

/** Valor Formatado de um pixel. */
function fmtVal(v) {
  if (v === null || v === undefined) return 'sem dado';
  if (typeof v !== 'number') return String(v);
  return (Math.round(v * 1000) / 1000).toString();
}

/**
 * Amostra o pixel no ponto para TODA camada ligada e mostra nome/valor/unidade.
 * Se as 3 camadas AGB IFN+EBA estiverem ligadas, acrescenta o bloco especial
 * (AGB + IC90 + incerteza relativa + limites ic_inf/ic_sup).
 */
function sampleAt(coords) {
  var acts = activeLayers();
  if (!acts.length) {
    renderInspector([ui.Label('Ligue ao menos uma camada para inspecionar.',
      { fontSize: '11px', color: '#888' })]);
    return;
  }
  var seq = ++inspectorSeq;
  var pt = ee.Geometry.Point([coords.lon, coords.lat]);
  var fc = featuresFor(state.level, state.regions);

  // 1) Bloco GENÉRICO: uma banda por camada ligada (valores do que está no mapa).
  var first = true;
  var combo = null;
  acts.forEach(function (l) {
    var img = maskedImage(l, fc).select([0], [l.id]);
    combo = first ? img : combo.addBands(img);
    first = false;
  });
  var head = [inspectorHeader(coords)];
  combo.reduceRegion({ reducer: ee.Reducer.first(), geometry: pt,
    scale: 30, maxPixels: 1e9 }).evaluate(function (vals) {
    if (seq !== inspectorSeq) return;   // clique mais recente manda
    var out = head.slice();
    out.push(ui.Label('Camadas ligadas',
      { fontSize: '11px', fontWeight: 'bold', margin: '2px 0 1px 0' }));
    acts.forEach(function (l) {
      var raw = vals ? vals[l.id] : null;
      var txt = fmtVal(raw);
      if (l.tipo === 'lulc' && C11_LEGEND[raw]) txt += ' (' + C11_LEGEND[raw].nome + ')';
      out.push(ui.Label('· ' + l.nome + ': ' + txt +
        (l.unit ? ' ' + l.unit : ''), { fontSize: '11px', margin: '1px 0 0 0' }));
    });
    renderInspector(out);
  });

  // 2) Bloco AGB IFN+EBA (só quando as 3 camadas estão ligadas).
  var ids = { agb: 'agb_br_agb_2024', ic: 'agb_br_ic90_2024', cv: 'agb_br_cv_2024' };
  if (!(acts.some(function (l) { return l.id === ids.agb; }) &&
        acts.some(function (l) { return l.id === ids.ic; }) &&
        acts.some(function (l) { return l.id === ids.cv; }))) return;

  var ab = AGB_BR_BANDS;
  var src = ee.ImageCollection(AGB_BR_IC)
    .filter(ee.Filter.eq('ano', AGB_BR_YEAR)).mosaic()
    .select([ab.agb, ab.meiaLargura, ab.icInf, ab.icSup]);
  src = src.updateMask(ee.Image().paint(fc).eq(0));
  src.reduceRegion({ reducer: ee.Reducer.first(), geometry: pt,
    scale: 30, maxPixels: 1e9 }).evaluate(function (v) {
    if (seq !== inspectorSeq) return;
    var box = ensureInspector();
    box.add(ui.Label('AGB IFN+EBA (IC90)',
      { fontSize: '11px', fontWeight: 'bold', margin: '3px 0 1px 0' }));
    if (!v || v[ab.agb] === null || v[ab.agb] === undefined) {
      box.add(ui.Label('Sem dado (fora da máscara nativa).',
        { fontSize: '11px', color: '#888' }));
      return;
    }
    var a = v[ab.agb];
    box.add(ui.Label('AGB: ' + fmtVal(a) + ' t/ha', { fontSize: '11px', margin: '1px 0 0 0' }));
    if (v[ab.icInf] !== null && v[ab.icInf] !== undefined) {
      box.add(ui.Label('IC90: [' + fmtVal(v[ab.icInf]) + ' , ' +
        fmtVal(v[ab.icSup]) + ']', { fontSize: '11px', margin: '1px 0 0 0' }));
    }
    if (v[ab.meiaLargura] !== null && v[ab.meiaLargura] !== undefined) {
      box.add(ui.Label('± ' + fmtVal(v[ab.meiaLargura]) + ' t/ha',
        { fontSize: '11px', margin: '1px 0 0 0' }));
    }
    var cv = (v[ab.meiaLargura] !== null && v[ab.meiaLargura] !== undefined)
      ? v[ab.meiaLargura] / Math.max(a, 1) : null;
    box.add(ui.Label('CV: ' + (cv === null ? 'sem dado' : fmtVal(cv)),
      { fontSize: '11px', margin: '1px 0 0 0' }));
  });
}

/** Liga/desliga o módulo (cursor + handler de clique). */
function setInspector(on) {
  inspectOn = on;
  try {
    Map.style().set('cursor', on ? 'crosshair' : null);
  } catch (e) { /* ignora */ }
  if (clickHandler) {
    try { Map.onClick.unregister(clickHandler); } catch (e) { /* ignora */ }
    clickHandler = null;
  }
  if (inspectorBox) { try { inspectorBox.clear(); } catch (e) {} }
  if (on) {
    clickHandler = function (coords) { sampleAt(coords); };
    Map.onClick(clickHandler);
    renderInspector([ui.Label('Clique no mapa para inspecionar.',
      { fontSize: '11px', color: '#555' })]);
  }
}

// --- CONTROLES (toggles MAP/THUMBNAILS/INSPECTOR — fora das gavetas) --------
var mapVisible = true;
var thumbsVisible = false;
var mapToggleBtn = ui.Button({ label: 'MAP ON',
  style: { margin: '2px', padding: '2px 6px', fontSize: '11px',
    fontWeight: 'bold' },
  onClick: function () {
    mapVisible = !mapVisible;
    mapToggleBtn.setLabel(mapVisible ? 'MAP ON' : 'MAP OFF');
    UI.applyToggleStyle(mapToggleBtn, mapVisible);
    mlayers.setAllShown(mapVisible);
  } });
UI.applyToggleStyle(mapToggleBtn, true);

var inspectorToggleBtn = ui.Button({ label: 'INSPECTOR OFF',
  style: { margin: '2px', padding: '2px 6px', fontSize: '11px',
    fontWeight: 'bold' },
  onClick: function () {
    setInspector(!inspectOn);
    inspectorToggleBtn.setLabel(inspectOn ? 'INSPECTOR ON' : 'INSPECTOR OFF');
    UI.applyToggleStyle(inspectorToggleBtn, inspectOn);
  } });
UI.applyToggleStyle(inspectorToggleBtn, false);

var thumbToggleBtn = ui.Button({ label: 'THUMBNAILS OFF',
  style: { margin: '2px', padding: '2px 6px', fontSize: '11px',
    fontWeight: 'bold' },
  onClick: function () {
    thumbsVisible = !thumbsVisible;
    thumbToggleBtn.setLabel(thumbsVisible ? 'THUMBNAILS ON' : 'THUMBNAILS OFF');
    UI.applyToggleStyle(thumbToggleBtn, thumbsVisible);
    if (split) split.showRight(thumbsVisible);
    if (thumbsVisible && thumbs) thumbs.update();
  } });
UI.applyToggleStyle(thumbToggleBtn, false);

var toggleRow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
  style: { margin: '0px', padding: '0px' } });
toggleRow.add(mapToggleBtn).add(thumbToggleBtn).add(inspectorToggleBtn);

var cabCtrl = UI.createCabinet({ title: 'CONTROLES', isOpen: true });
shell.body.add(cabCtrl.panel);
cabCtrl.content.add(toggleRow);

// --- MapBiomas Carbono (Cerrado Florestal · Pantanal Florestal · Campestre) --
var cabCarbono = UI.createCabinet({ title: 'MapBiomas Carbono', isOpen: true });
shell.body.add(cabCarbono.panel);
availGroups(GRP_RESULTADO).forEach(function (p) {
  addSubCabinet(cabCarbono, p.label, p.camadas);
});

// --- Referência (uma gaveta por FONTE) ---------------------------------------
var cabRef = UI.createCabinet({ title: 'Referência', isOpen: false });
shell.body.add(cabRef.panel);
availGroups(GRP_REFERENCIA).forEach(function (f) {
  addSubCabinet(cabRef, f.label, f.camadas);
});

// --- Auxiliares (Uso e Cobertura C11) ----------------------------------------
var cabAux = UI.createCabinet({ title: 'Auxiliares', isOpen: false });
shell.body.add(cabAux.panel);
availGroups(GRP_AUXILIAR).forEach(function (a) {
  addSubCabinet(cabAux, a.label, a.camadas);
});

// ---------------------------------------------------------------------------
// LEGENDAS — rampas de cor (Mín/Máx POR RAMPA + opacidade) + Uso e Cobertura (C11)
// ---------------------------------------------------------------------------
// Cada barra de cor (rampa deduplicada) tem Mín/Máx editáveis. O override é
// guardado por chave de rampa; limpar o textbox restaura o valor padrão.
var rampOverrides = {};
function parseNum(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

/** Chave estável da rampa (usa a vis BASE, não a sobrescrita). */
function rampKey(layer) {
  var vis = layer.vis;
  return [layer.unit || '', vis.min, vis.max, vis.palette.join(',')].join('|');
}

/** Aplica o Mín/Máx da rampa (se definido) sobre o vis da camada. */
function applyOverride(layer) {
  var base = layer.vis;
  var v = { min: base.min, max: base.max, palette: base.palette };
  var ov = rampOverrides[rampKey(layer)];
  if (ov) {
    if (ov.min !== null && ov.min !== undefined) v.min = ov.min;
    if (ov.max !== null && ov.max !== undefined) v.max = ov.max;
  }
  return v;
}

/** Grava/limpa o override de um extremo da rampa. */
function setRampOverride(key, which, text) {
  var ov = rampOverrides[key] || {};
  ov[which] = parseNum(text);   // null limpa aquele extremo
  rampOverrides[key] = ov;
  refreshMap();
}

/**
 * Barra de cor com Mín/Máx EDITÁVEIS (local da v01 — não depende do módulo UI,
 * para a v01 seguir stand-alone). Os Textbox ocupam o lugar das labels de mínimo
 * e máximo; o rótulo central é a unidade. Limpar o Textbox restaura o padrão.
 *   { title, unit, min, max, palette, onMin(text), onMax(text) }
 */
function colorBarEditavel(o) {
  var panel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
    style: { margin: '2px 0px', padding: '2px', backgroundColor: '#fafafa',
      border: '1px solid #eee', stretch: 'horizontal' } });
  if (o.title) {
    panel.add(ui.Label(o.title, { fontSize: '11px', fontWeight: 'bold',
      margin: '0px 0px 1px 0px', color: '#333', stretch: 'horizontal' }));
  }
  // Faixa de gradiente renderizada como Thumbnail de ee.Image.pixelLonLat()
  // (padrão do script de referência IFN+EBA). A fileira de ui.Label com
  // `width:'0px'` colapsava a largura e deixava a barra branca.
  var lo = o.min, hi = o.max;
  if (!(hi > lo)) { hi = lo + 1; }   // evita span 0/negativo na faixa
  var faixa = ee.Image.pixelLonLat().select(0)
    .multiply((hi - lo) / 100).add(lo)
    .visualize({ min: lo, max: hi, palette: o.palette });
  panel.add(ui.Thumbnail({ image: faixa,
    params: { bbox: [0, 0, 100, 8], dimensions: '220x14' },
    style: { stretch: 'horizontal', margin: '0px', border: '1px solid #ddd' } }));
  function fmt(v) {
    if (v === null || v === undefined) return '';
    return (Math.round(v * 100) / 100).toString();
  }
  function box(value, align, onChange) {
    return ui.Textbox({ value: fmt(value), onChange: onChange,
      style: { fontSize: '9px', margin: '0px', padding: '0px 1px',
        width: '46px', color: '#333', textAlign: align } });
  }
  var ticks = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
    style: { margin: '1px 0px 0px 0px', padding: '0px',
      stretch: 'horizontal' } });
  ticks.add(box(o.min, 'left', o.onMin));
  ticks.add(ui.Label(o.unit || '', { fontSize: '9px', margin: '0px',
    textAlign: 'center', stretch: 'horizontal', color: '#333',
    fontWeight: 'bold' }));
  ticks.add(box(o.max, 'right', o.onMax));
  panel.add(ticks);
  return panel;
}

var cabRamp = UI.createCabinet({ title: 'LEGENDAS', isOpen: false });
shell.body.add(cabRamp.panel);

var ctrlLbl = { fontSize: '10px', margin: '2px' };

// Opacidade
var opacityRow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
  style: { margin: '0px', padding: '1px', backgroundColor: '#f5f5f5' } });
opacityRow.add(ui.Label('Opacidade:', ctrlLbl));
opacityRow.add(ui.Slider({ min: 0, max: 1, value: state.opacity,
  style: { stretch: 'horizontal' },
  onChange: function (v) { state.opacity = v; refreshMap(); } }));
cabRamp.content.add(opacityRow);

var rampBody = ui.Panel({ style: { margin: '0px', padding: '0px' } });
cabRamp.content.add(rampBody);

// Uso e Cobertura (C11) — ABAIXO das rampas, só quando o C11 estiver ligado.
var lulcBody = ui.Panel({ style: { margin: '0px', padding: '0px' } });
cabRamp.content.add(lulcBody);

// ---------------------------------------------------------------------------
// PAINEL DIREITO · grade de miniaturas (camada × território)
// ---------------------------------------------------------------------------
var currentNames = [];
var thumbValues = { camada: [], territorio: [] };
var rightPanel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
  style: { margin: '0px', padding: '0px', backgroundColor: '#ffffff',
    border: '1px solid #d0d0d0' } });
rightPanel.add(ui.Label('Miniaturas · camada × território',
  { fontSize: '13px', fontWeight: 'bold', margin: '2px', color: '#222' }));

var thumbs = UI.createThumbnailGrid({
  axes: ['camada', 'territorio'],
  axisLabels: { camada: 'Camada', territorio: 'Território' },
  values: thumbValues,
  cellFor: function (vals) {
    var l = layerById(vals.camada.id);
    var region = vals.territorio.id;
    return {
      image: maskedImage(l, featuresFor(state.level, [region])),
      vis: applyOverride(l),
      bounds: boundsFor(state.level, [region]),
      label: vals.camada.label + ' · ' + vals.territorio.label
    };
  }
});
rightPanel.add(thumbs.panel);

var split = UI.createSplitLayout({ mapWidget: shell.mapWidget,
  right: rightPanel });

// ---------------------------------------------------------------------------
// Lógica
// ---------------------------------------------------------------------------
function setLevel(id) {
  state.level = id;
  state.regions = [];
  Object.keys(drawerLevels.buttons).forEach(function (k) {
    UI.styleToggleButton(drawerLevels.buttons[k], k === id);
  });
  refreshRegions();
  refreshMap();
}

function refreshRegions() {
  activity.start();
  regionNames(state.level, activity.wrap(function (names) {
    currentNames = names || [];
    drawerRegions.flowPanel.clear();
    drawerRegions.checkboxes = {};
    var all = ui.Checkbox({ label: 'Brasil', value: state.regions.length === 0,
      onChange: function (v) {
        if (v) { state.regions = []; refreshRegions(); refreshMap(); }
      },
      style: { margin: '1px 3px', padding: '0px', fontSize: '10px',
        backgroundColor: '#f9f9f9' } });
    UI.styleCheck(all, state.regions.length === 0);
    drawerRegions.flowPanel.add(all);
    currentNames.forEach(function (n) {
      var on = state.regions.indexOf(n) > -1;
      var chk = ui.Checkbox({ label: n, value: on,
        onChange: function (v) {
          if (v) { if (state.regions.indexOf(n) === -1) state.regions.push(n); }
          else { state.regions = state.regions.filter(function (x) { return x !== n; }); }
          refreshMap();
        },
        style: { margin: '1px 3px', padding: '0px', fontSize: '10px',
          backgroundColor: '#f9f9f9' } });
      UI.styleCheck(chk, on);
      drawerRegions.checkboxes[n] = chk;
      drawerRegions.flowPanel.add(chk);
    });
    refreshMap();
  }));
}

function refreshMap() {
  mlayers.clear();
  var fc = featuresFor(state.level, state.regions);
  var selected = [];
  available.forEach(function (l) {
    if (!state.layers[l.id]) return;
    mlayers.update(l.id, maskedImage(l, fc), applyOverride(l), l.nome,
      state.opacity);
    selected.push({ id: l.id, label: l.nome });
  });
  thumbValues.camada = selected;
  var regions = state.regions.length ? state.regions : currentNames;
  thumbValues.territorio = regions.map(function (n) {
    return { id: n, label: n };
  });
  refreshRamps();
  if (thumbsVisible) thumbs.update();
}

/** Legenda: uma barra por rampa distinta + LULC (C11) se ligado. */
function refreshRamps() {
  rampBody.clear();
  var seen = {};
  var order = [];
  var lulcOn = false;
  available.forEach(function (l) {
    if (!state.layers[l.id]) return;
    if (l.tipo === 'lulc') { lulcOn = true; return; }
    if (!l.vis || !l.vis.palette) return;
    var key = rampKey(l);
    if (seen[key]) { seen[key].names.push(l.nome); return; }
    seen[key] = { layer: l, names: [l.nome] };
    order.push(key);
  });

  if (!order.length) {
    rampBody.add(ui.Label(
      'Marque camadas contínuas (resultados/referências) para ver a rampa.',
      { fontSize: '10px', color: '#888', margin: '2px' }));
  } else {
    order.forEach(function (k) {
      var g = seen[k];
      var l = g.layer;
      var vis = applyOverride(l);
      var title = g.names.length === 1 ? g.names[0]
        : g.names[0] + '  (+' + (g.names.length - 1) + ')';
      rampBody.add(colorBarEditavel({
        title: title, unit: l.unit, min: vis.min, max: vis.max,
        palette: vis.palette,
        onMin: function (v) { setRampOverride(k, 'min', v); },
        onMax: function (v) { setRampOverride(k, 'max', v); }
      }));
    });
  }

  // Legenda do Uso e Cobertura (C11) — abaixo das rampas, só se estiver ligado.
  lulcBody.clear();
  if (lulcOn) {
    lulcBody.add(ui.Label('Uso e Cobertura (C11)',
      { fontSize: '11px', fontWeight: 'bold', margin: '4px 2px 1px 2px' }));
    lulcBody.add(UI.legendPanel(Object.keys(C11_LEGEND).map(function (code) {
      return { color: C11_LEGEND[code].cor,
        label: C11_LEGEND[code].nome + ' (' + code + ')' };
    })));
  }
}

print('MAPBIOMAS-CARBONO · toolkit view/v01 · run_view');
print('[CAMADAS]', available.length, 'disponíveis de', LAYERS.length);
print('[GRUPOS] produtos:', GRUPOS_RESULTADO.length, '→',
  availGroups(GRP_RESULTADO).length,
  '· fontes:', GRUPOS_REFERENCIA.length, '→',
  availGroups(GRP_REFERENCIA).length,
  '· auxiliares:', GRUPOS_AUXILIAR.length, '→',
  availGroups(GRP_AUXILIAR).length);
print('[TERRITÓRIOS]', LEVEL_ORDER.join(', '));

setLevel('bioma');