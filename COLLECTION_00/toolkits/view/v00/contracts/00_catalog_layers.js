/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de CAMADAS (registry)
 * ---------------------------------------------------------------------------
 * Compõe as CAMADAS visualizáveis do app a partir dos catálogos:
 *   · Resultados (Cerrado Florestal / Pantanal Florestal / Pantanal Campestre)
 *   · Referências (benchmarks/CN)  — agrupadas por FONTE
 *   · Auxiliares (Uso e Cobertura MapBiomas C11)
 *
 * Cada camada: { id, nome, tipo, asset|col, band, unit, vis, ... }
 *   tipo: 'resultado' | 'referencia' | 'lulc'
 *   produto: id do produto (resultados) · fonte: id da fonte (referências)
 *   auxiliar: id do auxiliar (lulc)
 ******************************************************************************/
var PROD = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_products.js');
var REF = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_references.js');
var LC = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_landcover.js');

var LAYERS = [];

// ---- Resultados: Cerrado Florestal ------------------------------------------
PROD.CERRADO.forEach(function (v) {
  LAYERS.push({ id: 'res_cerrado_' + v.id, produto: 'cerrado_florestal',
    nome: 'Cerrado Florestal ' + v.label, tipo: 'resultado',
    asset: v.asset, band: v.band, year: v.year, unit: v.unit, vis: v.vis });
});

// ---- Resultados: Pantanal Florestal -----------------------------------------
PROD.FOREST.forEach(function (v) {
  LAYERS.push({ id: 'res_forest_' + v.id, produto: 'pantanal_florestal',
    nome: 'Pantanal Forest ' + v.label, tipo: 'resultado',
    col: v.col, band: v.band, stdBand: v.stdBand, year: v.year,
    unit: v.unit, vis: v.vis });
});

// ---- Resultados: Pantanal Campestre -----------------------------------------
PROD.GRASSLAND.forEach(function (v) {
  LAYERS.push({ id: 'res_grass_' + v.id, produto: 'pantanal_campestre',
    nome: 'Pantanal Campestre ' + v.label, tipo: 'resultado',
    asset: v.asset, band: v.band, unit: v.unit, vis: v.vis });
});

// ---- Referências (por fonte) ------------------------------------------------
REF.REFERENCES.forEach(function (r) {
  LAYERS.push({ id: 'ref_' + r.id, fonte: r.grupo,
    nome: r.fonte, tipo: 'referencia',
    asset: r.asset, band: r.band, unit: r.unit, nodata_le: r.nodata_le,
    multi_year: r.multi_year, filter_index: r.filter_index, vis: r.vis });
});

// ---- IFN (inventário de campo) — rasterizado via `paint` --------------------
REF.IFN_COLUNAS.forEach(function (c) {
  LAYERS.push({ id: 'ref_ifn_' + c.id, fonte: 'ifn',
    nome: 'IFN · ' + c.label + ' (' + c.unit + ')', tipo: 'referencia',
    paint: { fc: REF.IFN_ASSET, prop: c.prop }, unit: c.unit, vis: c.vis });
});

// ---- Auxiliares: Uso e Cobertura (C11) — anos-chave -------------------------
[1985, 2000, 2010, 2023].forEach(function (y) {
  LAYERS.push({ id: 'lulc_' + y, auxiliar: 'uso_cobertura',
    nome: 'MapBiomas C11 · ' + y, tipo: 'lulc',
    asset: LC.C11_ASSET, band: LC.band(y), vis: LC.VIS });
});

exports.LAYERS = LAYERS;

/** Agrupa um array de camadas por uma chave, na ordem de `defs`. */
function group(defs, key, field) {
  return defs.map(function (d) {
    var g = { id: d.id, label: d.label, camadas: [] };
    LAYERS.forEach(function (l) {
      if (l[key] === d.id) g.camadas.push(l);
    });
    return g;
  }).filter(function (g) { return g.camadas.length > 0; });
}

/** Resultados por produto (Cerrado/Pantanal). */
exports.PRODUTOS = group([
  { id: 'cerrado_florestal', label: 'Cerrado Florestal' },
  { id: 'pantanal_florestal', label: 'Pantanal Florestal' },
  { id: 'pantanal_campestre', label: 'Pantanal Campestre' }
], 'produto');

/** Referências por fonte. */
exports.REF_FONTES = group(Object.keys(REF.FONTES).map(function (id) {
  return { id: id, label: REF.FONTES[id] };
}), 'fonte');

/** Auxiliares (Uso e Cobertura). */
exports.AUXILIARES = group([
  { id: 'uso_cobertura', label: 'Uso e Cobertura (C11)' }
], 'auxiliar');

/** Agrupa um array arbitrário de camadas na ordem de exibição (legado). */
exports.grouped = function (layers) {
  var order = [];
  var byGroup = {};
  (layers || []).forEach(function (l) {
    var g = l.produto || l.fonte || l.auxiliar || 'outros';
    if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
    byGroup[g].push(l);
  });
  return order.map(function (g) { return { grupo: g, camadas: byGroup[g] }; });
};

/** Busca por id. */
exports.byId = function (id) {
  for (var i = 0; i < LAYERS.length; i++) {
    if (LAYERS[i].id === id) return LAYERS[i];
  }
  return null;
};
