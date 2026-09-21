/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de USO E COBERTURA (C11)
 * ---------------------------------------------------------------------------
 * MapBiomas Coleção 11 (coverage v3): asset, paleta e legenda reescritos aqui
 * para a camada "Uso e Cobertura" do app. Banda anual `classification_<ano>`.
 ******************************************************************************/

exports.C11_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';

/** Banda de cobertura do ano `y`. */
exports.band = function (y) { return 'classification_' + y; };

/** Anos disponíveis (C11). */
exports.YEARS = (function () {
  var a = []; for (var y = 1985; y <= 2023; y++) a.push(y); return a;
})();

// ---- Paleta oficial C11 (código → cor) --------------------------------------
exports.LULC_LEGEND = {
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

/** vis pronta: palette densa indexada por código (gaps = preto). */
exports.VIS = (function () {
  var codes = Object.keys(exports.LULC_LEGEND)
    .map(function (k) { return parseInt(k, 10); });
  var maxCode = Math.max.apply(null, codes);
  var palette = [];
  for (var i = 0; i <= maxCode; i++) palette.push('#000000');
  codes.forEach(function (c) { palette[c] = exports.LULC_LEGEND[c].cor; });
  return { min: 0, max: maxCode, palette: palette };
})();
