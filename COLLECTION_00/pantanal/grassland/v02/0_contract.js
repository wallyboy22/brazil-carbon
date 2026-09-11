/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland v02 · Contrato
 * ---------------------------------------------------------------------------
 * Mudanças da v02 em relação à v01 (ver reflexao_v02.md):
 *   1. PREDICT_FULL_BIOME = true → produtos de biomassa/ANPP/carbono são
 *      gerados para TODO o Pantanal (a máscara C11 deixa de filtrar produção);
 *   2. Biomassa calibrada em PARCELAS DE CAMPO (Fonseca log-linear reestimado)
 *      via 2_1_amostras_campo_toAsset + gate 2_3_gcn; enquanto não há fit, os
 *      coeficientes provisórios do Pampa são retidos com clamp de suporte;
 *   3. Máscara de água permanente (MASK_WATER) e QA do fPAR (USE_QC) ativos.
 ******************************************************************************/

exports.VERSION = 'v02';
exports.YEAR = 2023;
exports.YEARS = [2023];
exports.SCALE = 30;

exports.BIOME_FC =
  'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.BIOME_PROP = 'Bioma';
exports.BIOME_NAME = 'Pantanal';
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.GRASSLAND_CLASSES = [11, 12, 50];

// ---- v02: produção em TODO o bioma (não mascarar produto pela LULC) --------
exports.PREDICT_FULL_BIOME = true;
/**
 * Anos de estabilidade para a BANDA de elegibilidade do carbono (elig_carbon):
 * LULC ∈ {11,12,50} em TODOS estes anos antes do ano alvo. Como o produto cobre
 * o bioma todo (o modelo de campo não vale para floresta), a banda marca onde o
 * carbono pode ser contabilizado sem arrastar outros estratos (reflexão D15).
 * Vazia = banda omitida. Ativa por padrão na v02.
 */
exports.STABILITY_YEARS = [2021, 2022, 2023];

// ---- Biomassa: calibrada por parcela de campo (2_1 + 2_3_gcn) --------------
// coefficients são substituídos pelo biomass_model.json gerado no gate offline
// quando houver parcelas (source muda de 'pampa_provisorio' p/ 'campo_...').
exports.BIOMASS_MODEL = {
  type: 'fonseca_loglinear',
  coefficients: { intercept: 5.8195, red: 26.1616, swir1: 21.6240,
    swir2: -48.9521 },
  source: 'pampa_provisorio',
  clampMgHa: { min: 0.3, max: 12 }
};

// ---- Parcelas de campo (configurar para calibrar) --------------------------
exports.FIELD = {
  /** ex.: 'projects/mapbiomas-brazil/assets/.../PANTANAL_GRASSLAND/FIELD/parcelas_v02' */
  ASSET: null,
  BIOMASS_PROP: 'biomass_kg_ha',
  DATE_PROP: 'date'
};

// ---- Carbono ---------------------------------------------------------------
exports.CARBON_FRACTION = 0.47;
/** 0 = parte aérea (AGC); >0 adiciona raiz (AGBC = AGC × (1+k)). */
exports.ROOT_SHOOT_K = 0.0;

// ---- Monteith (εCA) --------------------------------------------------------
exports.ECA_MONTHLY = {
  1: 0.263, 2: 0.347, 3: 0.315, 4: 0.286,
  5: 0.257, 6: 0.154, 7: 0.083, 8: 0.091,
  9: 0.272, 10: 0.291, 11: 0.211, 12: 0.233
};
/** Gate provisório (fase 4): modula εCA pelo NDWI mensal (déficit/umidade). */
exports.ECA_MODULATE_CWD = false;

// ---- Entradas MODIS / hidroperíodo -----------------------------------------
exports.USE_QC = true;     // Fpar_QC (MODLAND_QC ≤ 1) aplicado no fPAR
exports.MASK_WATER = true; // água permanente fora dos produtos
/** Fase 4: cheia dinâmica mensal (máscara por NDWI mensal). */
exports.MASK_FLOOD = false;
/**
 * Fase 4: interpolação temporal do fPAR — mês sem fPAR/DSR válido é preenchido
 * com a média dos meses adjacentes (reflexão C11), evitando subestimar a ANPP
 * anual em meses sem observações. Requer uma rodada a mais de vizinhos por mês.
 */
exports.INTERP_MISSING_FPAR = false;

exports.ASSET_ROOT =
  'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_GRASSLAND/V02';