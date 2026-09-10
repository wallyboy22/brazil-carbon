/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal · Legenda LULC C11 (módulo compartilhado)
 * ---------------------------------------------------------------------------
 * Legenda única da Coleção 11 usada por ambos os módulos de estatísticas
 * (pantanal/forest e pantanal/grassland). Nomes herdados do bloco da v00
 * (mb_carbon_agc.js, "legenda oficial Col. 11" brasil.mapbiomas.org).
 *
 * Níveis de agregação:
 *   n0     → classe decimal (código bruto da C11)
 *   n1     → cobertura natural agregada: Floresta | Campestre | Outros
 *   n2     → marcador ecossistêmico:      florestal | campestre | outros
 * O marcador segue as listas do pipeline:
 *   FOREST_CLASSES    = [3,4,6,7,49]  (0_contract v07)
 *   GRASSLAND_CLASSES = [11,12,50]    (0_contract grassland v01)
 *
 * @todo conferir nomes 7/9/15/33 contra o JSON oficial da Coleção 11 quando
 *       necessário (o bloco da v00 é o que o projeto usa hoje).
 ******************************************************************************/

// Nomes das classes decimais relevantes da Coleção 11 (ver v00).
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

// Listas de classe do pipeline (marcador).
exports.FOREST_CLASSES = [3, 4, 6, 7, 49];
exports.GRASSLAND_CLASSES = [11, 12, 50];

// Códigos numéricos do marcador para agrupar na redução (evita colisão com
// códigos decimais reais da C11).
exports.MARK_FOREST = 101;
exports.MARK_GRASS = 102;
exports.MARK_OTHER = 0;

exports.N1_LABELS = {
  101: 'Floresta',
  102: 'Campestre',
  0:   'Outros'
};

exports.N2_LABELS = {
  101: 'florestal',
  102: 'campestre',
  0:   'outros'
};

function clamp(block, code) {
  var v = block[code];
  return v !== undefined ? v : 'Classe ' + code;
}

/**
 * Informação de legenda para um código decimal da C11.
 * @param {number} code classe decimal
 * @returns {{n0: string, n1: string, n2: string, marcador: number}}
 */
exports.info = function (code) {
  var n0 = clamp(exports.DECIMAL, code);
  var mark = exports.MARK_OTHER;
  if (exports.FOREST_CLASSES.indexOf(code) > -1) mark = exports.MARK_FOREST;
  else if (exports.GRASSLAND_CLASSES.indexOf(code) > -1) mark = exports.MARK_GRASS;
  return {
    n0: n0,
    n1: exports.N1_LABELS[mark],
    n2: exports.N2_LABELS[mark],
    marcador: mark
  };
};

/** Marcador de uma classe decimal (101/102/0) — igual a info().marcador. */
exports.markerOf = function (code) {
  return exports.info(code).marcador;
};