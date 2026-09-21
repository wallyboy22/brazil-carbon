/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de CAMADAS (registry)
 * ---------------------------------------------------------------------------
 * Compõe as CAMADAS visualizáveis do app a partir dos catálogos:
 *   · Resultados (Forest / Grassland)  — 00_catalog_products.js
 *   · Referências (benchmarks/CN)      — 00_catalog_references.js
 *   · Uso e Cobertura (MapBiomas C11)  — 00_catalog_landcover.js
 *
 * Cada camada: { id, grupo, nome, tipo, asset, band, stdBand?, vis, legenda? }
 *   tipo: 'resultado' | 'referencia' | 'lulc'
 ******************************************************************************/
var PROD = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_products.js');
var REF = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_references.js');
var LC = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_landcover.js');

var LAYERS = [];

// ---- Resultados: Forest (todas as versões) ----------------------------------
PROD.FOREST.forEach(function (v) {
  LAYERS.push({ id: 'res_forest_' + v.id, grupo: 'Resultados · Forest',
    nome: 'Forest ' + v.label, tipo: 'resultado',
    asset: v.asset, band: v.band, stdBand: v.stdBand, vis: v.vis });
});

// ---- Resultados: Grassland --------------------------------------------------
PROD.GRASSLAND.forEach(function (v) {
  LAYERS.push({ id: 'res_grass_' + v.id, grupo: 'Resultados · Grassland',
    nome: 'Grassland ' + v.label, tipo: 'resultado',
    asset: v.asset, band: v.band, vis: v.vis });
});

// ---- Referências ------------------------------------------------------------
REF.REFERENCES.forEach(function (r) {
  LAYERS.push({ id: 'ref_' + r.id, grupo: 'Referências',
    nome: r.fonte, tipo: 'referencia',
    asset: r.asset, band: r.band, nodata_le: r.nodata_le,
    multi_year: r.multi_year, filter_index: r.filter_index, vis: r.vis });
});

// ---- Uso e Cobertura (C11) — anos-chave para comparação ---------------------
[1985, 2000, 2010, 2023].forEach(function (y) {
  LAYERS.push({ id: 'lulc_' + y, grupo: 'Uso e Cobertura',
    nome: 'MapBiomas C11 · ' + y, tipo: 'lulc',
    asset: LC.C11_ASSET, band: LC.band(y), vis: LC.VIS });
});

exports.LAYERS = LAYERS;

/** Camadas agrupadas na ordem de exibição. */
exports.GROUPS = (function () {
  var order = [];
  var byGroup = {};
  LAYERS.forEach(function (l) {
    if (!byGroup[l.grupo]) { byGroup[l.grupo] = []; order.push(l.grupo); }
    byGroup[l.grupo].push(l);
  });
  return order.map(function (g) { return { grupo: g, camadas: byGroup[g] }; });
})();

/** Busca por id. */
exports.byId = function (id) {
  for (var i = 0; i < LAYERS.length; i++) {
    if (LAYERS[i].id === id) return LAYERS[i];
  }
  return null;
};
