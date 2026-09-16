/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal · Legenda LULC C11 (módulo compartilhado)
 * ---------------------------------------------------------------------------
 * Legenda única da Coleção 11 usada pelos módulos de estatísticas
 * (pantanal/forest e pantanal/grassland) e por scripts ad-hoc.
 *
 * GESTÃO DE CLASSES E NÍVEIS (ref. coleção 11 oficial, brasil.mapbiomas.org):
 *   A fonte ÚNICA de verdade são os dicionários oficiais por nível
 *   (LULC_NIVEIS + LULC_NIVEL_0..4 / LULC_NIVEL_1_1) e a legenda de
 *   desmatamento/vegetação secundária (DEF_SEC_VEG_LEGEND). Todos são
 *   OBJETOS JS (client-side) de propósito — `info()` faz lookups síncronos.
 *
 *   n0        → nome detalhado da classe: nível 4 para lavouras específicas
 *               (soja, cana, …) e nível 2 nas demais
 *   n1        → nível 1 oficial (Floresta | Vegetação Herbácea e Arbustiva |
 *               Área não vegetada | Agropecuária | Corpos D´água | Não observado)
 *   n2        → nome nível 2 oficial (Formação Florestal/Savânica, Mangue, …)
 *   natureza  → nível 0 oficial (Natural | Antrópico | Não observado)
 *   marcador  → ecossistema derivado de n1:
 *               Floresta → florestal; Veg. Herbácea e Arbustiva → campestre;
 *               demais → outros (strings, compatíveis com statistics_gcn)
 *
 *   Os dicionários repetem códigos-agregados (1, 10, 14, 22, 26) que NUNCA
 *   ocorrem como valor de pixel — são nós-pai da árvore da legenda. `info()`
 *   só recebe classes-folha.
 *
 * Assets oficiais aqui centralizados:
 *   C11_ASSET     → cobertura (mapbiomas_brazil_collection11_coverage_v3,
 *                   bandas classification_1985..2025)
 *   DEF_SEC_ASSET → desmatamento e vegetação secundária
 *                   (mapbiomas_brazil_collection11_deforestation_secondary_vegetation_v5,
 *                   bandas classification_1987..2025, valores 0..7 — def_sec)
 *
 * Deprecados (mantidos como aliases transitórios, NÃO usar em código novo):
 *   DECIMAL, FOREST_CLASSES, GRASSLAND_CLASSES, MARK_*, N1_LABELS, N2_LABELS,
 *   markerOf() — o pipeline agora deriva tudo dos níveis oficiais.
 ******************************************************************************/

// ---- Assets oficiais usados no pipeline -------------------------------------
exports.C11_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.DEF_SEC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_deforestation_secondary_vegetation_v5';

/** Banda anual de desmatamento/veg. secundária do ano `y` (classification_<y>). */
exports.defsecBand = function (y) { return 'classification_' + y; };

// ---- Legenda de desmatamento / vegetação secundária (v5) --------------------
// 0..7 — cobrem todo o bioma (sem pixels "sem dados" no Pantanal 2023).
exports.DEF_SEC_VEG_LEGEND = {
  0: 'Não Observado',
  1: 'Antrópico',
  2: 'Vegetação Primária',
  3: 'Vegetação Secundária',
  4: 'Desmatamento Primário',
  5: 'Recrescimento',
  6: 'Desmatamento Secundário',
  7: 'Outras Transições'
};

/** Módulos def_sec disponíveis nas colunas das estatísticas. */
exports.DEFSEC_MODS = [0, 1, 2, 3, 4, 5, 6, 7];

/** Tipo semântico de cada mod def_sec (agrupamento p/ análise/QA). */
exports.DEFSEC_TIPOS = {
  0: 'nao_observado',
  1: 'antropico',
  2: 'primaria',
  3: 'secundaria',
  4: 'desmatamento',
  5: 'recrescimento',
  6: 'desmatamento',
  7: 'transicao'
};

// ---- Legendas oficiais da Coleção 11 por nível de agregação -----------------
// (código → nome). Objetos JS client-side. Níveis conforme lulc_mbc11:
//   LULC_NIVEIS    → nível da classe (1..4) · [1=agreg N1, 2=classe, 3=lavoura,
//                    4=lavoura específica]
//   LULC_NIVEL_0   → Natural | Antrópico | Não observado
//   LULC_NIVEL_1   → Floresta | Veg. Herbácea e Arbustiva | Área não vegetada |
//                    Agropecuária | Corpos D´água | Não observado
//   LULC_NIVEL_1_1 → formação de detalhe (Formação Florestal/Savânica/Campestre…)
//   LULC_NIVEL_2   → classe de detalhe (mangue, restinga, apicum, lavoura…)
//   LULC_NIVEL_3   → agregação de lavoura (temporária/perene)
//   LULC_NIVEL_4   → lavoura específica (soja, cana, arroz, algodão…)
exports.LULC_NIVEIS = {
  0: 'Não observado',
  1: 'Nível 1',
  3: 'Nível 2',
  4: 'Nível 2',
  5: 'Nível 2',
  6: 'Nível 2',
  7: 'Nível 2',
  49: 'Nível 2',
  10: 'Nível 1',
  11: 'Nível 2',
  12: 'Nível 2',
  77: 'Nível 2',
  32: 'Nível 2',
  29: 'Nível 2',
  50: 'Nível 2',
  13: 'Nível 2',
  84: 'Nível 2',
  14: 'Nível 1',
  15: 'Nível 2',
  18: 'Nível 2',
  19: 'Nível 3',
  39: 'Nível 4',
  20: 'Nível 4',
  40: 'Nível 4',
  62: 'Nível 4',
  41: 'Nível 4',
  36: 'Nível 3',
  46: 'Nível 4',
  47: 'Nível 4',
  35: 'Nível 4',
  48: 'Nível 4',
  9: 'Nível 2',
  21: 'Nível 2',
  22: 'Nível 1',
  23: 'Nível 2',
  24: 'Nível 2',
  30: 'Nível 2',
  75: 'Nível 2',
  91: 'Nível 2',
  25: 'Nível 2',
  26: 'Nível 1',
  33: 'Nível 2',
  31: 'Nível 3',
  27: 'Não observado'
};

exports.LULC_NIVEL_0 = {
  0: 'Não observado',
  1: 'Natural',
  3: 'Natural',
  4: 'Natural',
  5: 'Natural',
  6: 'Natural',
  7: 'Natural',
  49: 'Natural',
  10: 'Natural',
  11: 'Natural',
  12: 'Natural',
  77: 'Natural',
  32: 'Natural',
  29: 'Antrópico',
  50: 'Natural',
  13: 'Natural',
  84: 'Natural',
  14: 'Antrópico',
  15: 'Antrópico',
  18: 'Antrópico',
  19: 'Antrópico',
  39: 'Antrópico',
  20: 'Antrópico',
  40: 'Antrópico',
  62: 'Antrópico',
  41: 'Antrópico',
  36: 'Antrópico',
  46: 'Antrópico',
  47: 'Antrópico',
  35: 'Antrópico',
  48: 'Antrópico',
  9: 'Antrópico',
  21: 'Antrópico',
  22: 'Antrópico',
  23: 'Antrópico',
  24: 'Antrópico',
  30: 'Antrópico',
  75: 'Antrópico',
  91: 'Antrópico',
  25: 'Antrópico',
  26: 'Antrópico',
  33: 'Antrópico',
  31: 'Antrópico',
  27: 'Não observado'
};

exports.LULC_NIVEL_1 = {
  0: 'Não observado',
  1: 'Floresta',
  3: 'Floresta',
  4: 'Floresta',
  5: 'Floresta',
  6: 'Floresta',
  7: 'Floresta',
  49: 'Floresta',
  10: 'Vegetação Herbácea e Arbustiva',
  11: 'Vegetação Herbácea e Arbustiva',
  12: 'Vegetação Herbácea e Arbustiva',
  77: 'Vegetação Herbácea e Arbustiva',
  32: 'Vegetação Herbácea e Arbustiva',
  29: 'Área não vegetada',
  50: 'Vegetação Herbácea e Arbustiva',
  13: 'Vegetação Herbácea e Arbustiva',
  84: 'Vegetação Herbácea e Arbustiva',
  14: 'Agropecuária',
  15: 'Agropecuária',
  18: 'Agropecuária',
  19: 'Agropecuária',
  39: 'Agropecuária',
  20: 'Agropecuária',
  40: 'Agropecuária',
  62: 'Agropecuária',
  41: 'Agropecuária',
  36: 'Agropecuária',
  46: 'Agropecuária',
  47: 'Agropecuária',
  35: 'Agropecuária',
  48: 'Agropecuária',
  9: 'Agropecuária',
  21: 'Agropecuária',
  22: 'Área não vegetada',
  23: 'Área não vegetada',
  24: 'Área não vegetada',
  30: 'Área não vegetada',
  75: 'Área não vegetada',
  91: 'Área não vegetada',
  25: 'Área não vegetada',
  26: 'Corpos D´água',
  33: 'Corpos D´água',
  31: 'Corpos D´água',
  27: 'Não observado'
};

exports.LULC_NIVEL_1_1 = {
  0: 'Não observado',
  1: 'Formação Florestal',
  3: 'Formação Florestal',
  4: 'Formação Savânica',
  5: 'Formação Florestal',
  6: 'Formação Florestal',
  7: 'Formação Florestal',
  49: 'Formação Savânica',
  10: 'Formação Campestre',
  11: 'Campo Alagado e Área Pantanosa',
  12: 'Formação Campestre',
  77: 'Formação Campestre',
  32: 'Formação Campestre',
  29: 'Outros',
  50: 'Formação Campestre',
  13: 'Formação Campestre',
  84: 'Formação Campestre',
  14: 'Agropecuária',
  15: 'Pastagem',
  18: 'Agricultura',
  19: 'Agricultura',
  39: 'Agricultura',
  20: 'Agricultura',
  40: 'Agricultura',
  62: 'Agricultura',
  41: 'Agricultura',
  36: 'Agricultura',
  46: 'Agricultura',
  47: 'Agricultura',
  35: 'Agricultura',
  48: 'Agricultura',
  9: 'Silvicultura',
  21: 'Mosaico de Usos',
  22: 'Outros',
  23: 'Outros',
  24: 'Outros',
  30: 'Outros',
  75: 'Outros',
  91: 'Outros',
  25: 'Outros',
  26: 'Outros',
  33: 'Outros',
  31: 'Outros',
  27: 'Não observado'
};

exports.LULC_NIVEL_2 = {
  0: 'Não observado',
  1: 'Floresta',
  3: 'Formação Florestal',
  4: 'Formação Savânica',
  5: 'Mangue',
  6: 'Floresta Alagável',
  7: 'Savana Alagada',
  49: 'Restinga Arbórea',
  10: 'Vegetação Herbácea e Arbustiva',
  11: 'Campo Alagado e Área Pantanosa',
  12: 'Formação Campestre',
  77: 'Formação Herbáceo Arbustiva',
  32: 'Apicum',
  29: 'Afloramento Rochoso',
  50: 'Restinga herbácea',
  13: 'Outras Formações não Florestais',
  84: 'Marisma',
  14: 'Agropecuária',
  15: 'Pastagem',
  18: 'Agricultura',
  19: 'Agricultura',
  39: 'Agricultura',
  20: 'Agricultura',
  40: 'Agricultura',
  62: 'Agricultura',
  41: 'Agricultura',
  36: 'Agricultura',
  46: 'Agricultura',
  47: 'Agricultura',
  35: 'Agricultura',
  48: 'Agricultura',
  9: 'Silvicultura',
  21: 'Mosaico de Usos',
  22: 'Área não vegetada',
  23: 'Praia, Duna e Areal',
  24: 'Área Urbanizada',
  30: 'Mineração',
  75: 'Usina Fotovoltaica',
  91: 'Energia Eólica',
  25: 'Outras Áreas não Vegetadas',
  26: 'Corpos D´água',
  33: 'Rio, Lago e Oceano',
  31: 'Aquicultura',
  27: 'Não observado'
};

exports.LULC_NIVEL_3 = {
  0: 'Não observado',
  1: 'Floresta',
  3: 'Formação Florestal',
  4: 'Formação Savânica',
  5: 'Mangue',
  6: 'Floresta Alagável',
  7: 'Savana Alagada',
  49: 'Restinga Arbórea',
  10: 'Formação Natural não Florestal',
  11: 'Campo Alagado e Área Pantanosa',
  12: 'Formação Campestre',
  77: 'Formação Herbáceo Arbustiva',
  32: 'Apicum',
  29: 'Afloramento Rochoso',
  50: 'Restinga herbácea',
  13: 'Outras Formações não Florestais',
  84: 'Marisma',
  14: 'Agropecuária',
  15: 'Pastagem',
  18: 'Agricultura',
  19: 'Lavoura Temporária',
  39: 'Lavoura Temporária',
  20: 'Lavoura Temporária',
  40: 'Lavoura Temporária',
  62: 'Lavoura Temporária',
  41: 'Lavoura Temporária',
  36: 'Lavoura Perene',
  46: 'Lavoura Perene',
  47: 'Lavoura Perene',
  35: 'Lavoura Perene',
  48: 'Lavoura Perene',
  9: 'Silvicultura',
  21: 'Mosaico de Usos',
  22: 'Área não vegetada',
  23: 'Praia, Duna e Areal',
  24: 'Área Urbanizada',
  30: 'Mineração',
  75: 'Usina Fotovoltaica',
  91: 'Energia Eólica',
  25: 'Outras Áreas não Vegetadas',
  26: 'Corpos D´água',
  33: 'Rio, Lago e Oceano',
  31: 'Aquicultura',
  27: 'Não observado'
};

exports.LULC_NIVEL_4 = {
  0: 'Não observado',
  1: 'Floresta',
  3: 'Formação Florestal',
  4: 'Formação Savânica',
  5: 'Mangue',
  6: 'Floresta Alagável',
  7: 'Savana Alagada',
  49: 'Restinga Arbórea',
  10: 'Formação Natural não Florestal',
  11: 'Campo Alagado e Área Pantanosa',
  12: 'Formação Campestre',
  77: 'Formação Herbáceo Arbustiva',
  32: 'Apicum',
  29: 'Afloramento Rochoso',
  50: 'Restinga herbácea',
  13: 'Outras Formações não Florestais',
  84: 'Marisma',
  14: 'Agropecuária',
  15: 'Pastagem',
  18: 'Agricultura',
  19: 'Lavoura Temporária',
  39: 'Soja',
  20: 'Cana',
  40: 'Arroz',
  62: 'Algodão',
  41: 'Outras Lavouras Temporárias',
  36: 'Lavoura Perene',
  46: 'Café',
  47: 'Citrus',
  35: 'Dendê',
  48: 'Outras Lavouras Perenes',
  9: 'Silvicultura',
  21: 'Mosaico de Usos',
  22: 'Área não Vegetada',
  23: 'Praia, Duna e Areal',
  24: 'Área Urbanizada',
  30: 'Mineração',
  75: 'Usina Fotovoltaica',
  91: 'Energia Eólica',
  25: 'Outras Áreas não Vegetadas',
  26: 'Corpos D´água',
  33: 'Rio, Lago e Oceano',
  31: 'Aquicultura',
  27: 'Não observado'
};

/** Códigos de lavoura com nome específico no nível 4 (n0 usará o nível 4). */
exports.LAVOURA_N4_CODES = [19, 20, 35, 36, 39, 40, 41, 46, 47, 48, 62];

// ---------------------------------------------------------------------------
// Helpers de legenda (client-side)
// ---------------------------------------------------------------------------

function clampPlain(dict, code) {
  var v = dict[code];
  return v !== undefined ? v : 'Classe ' + code;
}

/** Rótulo de `code` em um dicionário de nível oficial, com fallback `Classe X`. */
exports.labelOf = function (code, dict) {
  return clampPlain(dict, code);
};

/** Nome detalhado (n0): nível 4 p/ lavouras específicas, senão nível 2. */
exports.n0Of = function (code) {
  var v;
  if (exports.LAVOURA_N4_CODES.indexOf(code) > -1) v = exports.LULC_NIVEL_4[code];
  if (v === undefined) v = exports.LULC_NIVEL_2[code];
  if (v === undefined) v = exports.DECIMAL[code];
  return v !== undefined ? v : 'Classe ' + code;
};

/** Nível 1 oficial. */
exports.n1Of = function (code) {
  return clampPlain(exports.LULC_NIVEL_1, code);
};

/** Nível 2 oficial. */
exports.n2Of = function (code) {
  return clampPlain(exports.LULC_NIVEL_2, code);
};

/** Nível 3 oficial (agregação de lavoura: temporária/perene). */
exports.n3Of = function (code) {
  return clampPlain(exports.LULC_NIVEL_3, code);
};

/** Nível 4 oficial (lavoura específica: soja, cana, arroz, algodão…). */
exports.n4Of = function (code) {
  return clampPlain(exports.LULC_NIVEL_4, code);
};

/** Natureza (nível 0 oficial): Natural | Antrópico | Não observado. */
exports.naturezaOf = function (code) {
  return clampPlain(exports.LULC_NIVEL_0, code);
};

/** Marcador ecossistêmico (florestal|campestre|outros) derivado do nível 1. */
exports.marcadorFromN1 = function (n1) {
  if (n1 === 'Floresta') return 'florestal';
  if (n1 === 'Vegetação Herbácea e Arbustiva') return 'campestre';
  return 'outros';
};

/** Marcador ecossistêmico de um código decimal (via nível 1). */
exports.marcadorOf = function (code) {
  return exports.marcadorFromN1(exports.n1Of(code));
};

/**
 * Informação de legenda para um código decimal da C11 (classes-folha).
 * @param {number} code classe decimal
 * @returns {{n0: string, n1: string, n2: string, natureza: string,
 *            marcador: string}}
 */
exports.info = function (code) {
  var n1 = exports.n1Of(code);
  return {
    n0: exports.n0Of(code),
    n1: n1,
    n2: exports.n2Of(code),
    n3: exports.n3Of(code),
    n4: exports.n4Of(code),
    natureza: exports.naturezaOf(code),
    marcador: exports.marcadorFromN1(n1)
  };
};

/**
 * Informação de legenda de um mod def_sec (0..7).
 * @param {number} mod valor da banda def_sec do ano
 * @returns {{mod: number, label: string, natureza: string, tipo: string}}
 */
exports.defsecInfo = function (mod) {
  var m = typeof mod === 'number' ? mod : Number(mod);
  var natureza = m === 0 ? 'Não observado' : (m === 1 ? 'Antrópico' : 'Natural');
  return {
    mod: m,
    label: clampPlain(exports.DEF_SEC_VEG_LEGEND, m),
    natureza: natureza,
    tipo: exports.DEFSEC_TIPOS[m] !== undefined ? exports.DEFSEC_TIPOS[m] : 'outro'
  };
};

// ---------------------------------------------------------------------------
// Encode/decode de banda combinada (LULC × def_sec)
// ---------------------------------------------------------------------------
/**
 * Gera banda combinada `combo = lulc * 10 + def_sec` para agrupar classe LULC
 * e desmatamento/vegetação secundária numa ÚNICA banda de classificação.
 * Pixels com LULC mascarado são mantidos mascarados via `updateMask`.
 * A banda pode ser usada como groupField do reducer.
 *
 * @param {ee.Image} lulc   banda classification_<ano> (classe LULC C11)
 * @param {ee.Image} defsec banda classification_<ano> do DEF_SEC_ASSET (0..7)
 * @returns {ee.Image} banda combo (mascarada onde lulc era mascarado)
 */
exports.comboEncode = function (lulc, defsec) {
  return lulc.unmask().multiply(10).add(defsec.unmask(0)).toInt()
    .rename('combo').updateMask(lulc.mask());
};

/**
 * Decodifica um código combo gerado por `comboEncode`.
 * @param {number} code valor numérico da banda combo
 * @returns {{classe: number, defsec: number}} classe LULC e módulo def_sec
 */
exports.comboDecode = function (code) {
  return { classe: Math.floor(code / 10), defsec: code % 10 };
};

/**
 * Rótulo legível de uma banda combo (classe + def_sec) para uso nas colunas.
 * @param {number} code código combo
 * @returns {{n0: string, n1: string, n2: string, n3: string, n4: string,
 *            classe: number, def_sec: string, natureza: string, marcador: string}}
 */
exports.comboInfo = function (code) {
  var d = exports.comboDecode(code);
  var info = exports.info(d.classe);
  var ds = exports.defsecInfo(d.defsec);
  return {
    classe: d.classe,
    n0: info.n0, n1: info.n1, n2: info.n2,
    n3: exports.n3Of(d.classe), n4: exports.n4Of(d.classe),
    def_sec: ds.label, natureza: info.natureza, marcador: info.marcador
  };
};

// ---------------------------------------------------------------------------
// Deprecados — aliases transitórios (não usar em código novo)
// ---------------------------------------------------------------------------
exports.DECIMAL = {
  3:  'Formação Florestal',
  4:  'Formação Savânica',
  5:  'Mangue',
  6:  'Floresta Alagável',
  7:  'Savana Alagada (beta)',
  9:  'Silvicultura',
  11: 'Campo Alagado e Área Pantanosa',
  12: 'Formação Campestre',
  15: 'Pastagem',
  18: 'Agricultura',
  19: 'Lavoura Temporária',
  20: 'Cana',
  21: 'Mosaico de Usos',
  23: 'Praia, Duna e Areal',
  24: 'Área Urbanizada',
  25: 'Outras Áreas Não Vegetadas',
  29: 'Afloramento Rochoso',
  30: 'Mineração',
  31: 'Aquicultura',
  32: 'Apicum',
  33: 'Rio, Lago e Oceano',
  35: 'Dendê',
  36: 'Lavoura Perene',
  39: 'Soja',
  40: 'Arroz',
  41: 'Outras Lavouras Temporárias',
  46: 'Café',
  47: 'Citrus',
  48: 'Outras Lavouras Perenes',
  49: 'Restinga Arbórea',
  50: 'Restinga Herbácea ou Arbustiva',
  75: 'Usina Fotovoltaica',
  77: 'Formação Herbácea Arbustiva',
  84: 'Marisma (beta)',
  91: 'Parque eólico (beta)'
};
exports.FOREST_CLASSES = [3, 4, 6, 7, 49];
exports.GRASSLAND_CLASSES = [11, 12, 50];
exports.MARK_FOREST = 101;
exports.MARK_GRASS = 102;
exports.MARK_OTHER = 0;
exports.N1_LABELS = { 101: 'Floresta', 102: 'Campestre', 0: 'Outros' };
exports.N2_LABELS = { 101: 'florestal', 102: 'campestre', 0: 'outros' };
exports.markerOf = function (code) {
  var mark = exports.MARK_OTHER;
  if (exports.FOREST_CLASSES.indexOf(code) > -1) mark = exports.MARK_FOREST;
  else if (exports.GRASSLAND_CLASSES.indexOf(code) > -1) mark = exports.MARK_GRASS;
  return mark;
};