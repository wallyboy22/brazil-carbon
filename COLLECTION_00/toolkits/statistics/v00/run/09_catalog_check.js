/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · run · 09_catalog_check (QA)
 * ---------------------------------------------------------------------------
 * Verifica a existência dos assets registrados nos catálogos do toolkit
 * (limites, landcover, referências, produtos e covariáveis), usando
 * `module_infra.assetExists` (listAssets na pasta-pai).
 *
 * Uso no Code Editor: só rodar. Imprime uma linha por asset e um resumo.
 *
 * Nota: assets PÚBLICOS (projects/mapbiomas-public, users/gena, NASA, …) podem
 * aparecer como [FALTA] quando o `listAssets` da pasta não é acessível ao
 * usuário — nesse caso o resultado é indicativo, não definitivo.
 ******************************************************************************/
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_limits.js');
var LC = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_landcover.js');
var COV = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_covariates.js');
var REF = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_references.js');
var PROD = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_products.js');
var INFRA = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/module_infra.js');

var entries = [];
function add(cat, kind, id, asset) {
  entries.push({ cat: cat, kind: kind, id: id, asset: asset || null });
}

// ---- Limites ----------------------------------------------------------------
add('limits', 'biomas', 'BIOMES_FC', LIM.BIOMES_FC);
add('limits', 'ufs', 'UFS_FC', LIM.UFS_FC);
add('limits', 'municipios', 'MUNS_FC', LIM.MUNS_FC);

// ---- Landcover --------------------------------------------------------------
add('landcover', 'c11', 'C11_ASSET', LC.C11_ASSET);
add('landcover', 'def_sec', 'DEF_SEC_ASSET', LC.DEF_SEC_ASSET);

// ---- Referências ------------------------------------------------------------
REF.REFERENCES.forEach(function (r) { add('references', r.id, r.id, r.asset); });

// ---- Produtos ---------------------------------------------------------------
PROD.FOREST.forEach(function (v) {
  add('products', 'forest', v.id, v.mosaic);
});
PROD.GRASSLAND_PRODUCTS.forEach(function (p) {
  add('products', 'grassland', p.version + '/' + p.id, p.asset);
});
PROD.GRASSLAND_MONTHLY.forEach(function (p) {
  add('products', 'grassland_monthly', p.version + '/' + p.id, p.asset);
});

// ---- Covariáveis ------------------------------------------------------------
COV.ALL.forEach(function (d) {
  (d.assets || []).forEach(function (a, i) {
    add('covariates', d.id, d.id + '#' + i, a);
  });
});

print('MAPBIOMAS-CARBONO · toolkit statistics/v00 · 09_catalog_check');
var ok = 0, miss = 0, skip = 0;
entries.forEach(function (e) {
  if (!e.asset) {
    skip++;
    print('[--] (sem id @todo)', e.cat, '·', e.kind, '·', e.id);
    return;
  }
  var exists = INFRA.assetExists(e.asset);
  if (exists) ok++; else miss++;
  print(exists ? '[OK]' : '[FALTA]', e.cat, '·', e.kind, '·', e.id, '→', e.asset);
});
print('[FIM] catálogo:', entries.length, 'assets ·', ok, 'OK ·', miss,
  'faltando ·', skip, 'sem id (@todo).');
