/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · module_territory (módulo)
 * ---------------------------------------------------------------------------
 * Território compartilhado pelos motores de estatística. Generalizado em
 * ESCOPOS (ver contracts/00_catalog_territories.js):
 *   · bioma_uf — banda `territory` = bioma×100 + UF (multi-feição);
 *   · bioma    — banda `territory` = código do bioma (CD_BIOMA);
 *   · uf       — banda `territory` = código da UF (CD_UF);
 *   · custom   — banda `territory` = 1 (região única; rótulo = nome do arquivo).
 * Todos os escopos são SEMPRE limitados pela ÁREA do contrato (REGION).
 *
 * API (chamar configure 1× por escopo, antes dos runX):
 *   configure(scope, region) — scope = resolveScope(id); region = contrato.REGION
 *   labelCols()              — colunas de rótulo do escopo
 *   territoryImage()         — ee.Image 'territory'
 *   regionGeom()             — geometria da área de análise (redução)
 *   buildLabelDicts(leg)     — { info, biome, sigla, nome, defsec } ee.Dictionary
 *   labelProps(code, D)      — props de rótulo (EE) p/ um código de território
 ******************************************************************************/
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_limits.js');
var TER = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_territories.js');

var _SCOPE = null;
var _REGION = null;

exports.configure = function (scope, region) {
  _SCOPE = scope;
  _REGION = region || {};
};

function scope() {
  if (!_SCOPE) throw new Error('module_territory.configure() não foi chamado');
  return _SCOPE;
}

function region() { return _REGION || {}; }

exports.labelCols = function () { return scope().labelCols || []; };

/** FeatureCollection custom do escopo (com filtro opcional por propriedade). */
function customFc(s) {
  var fc = ee.FeatureCollection(s.fc);
  if (s.filterProp) {
    fc = fc.filter(ee.Filter.eq(s.filterProp, s.filterValue));
  }
  return fc;
}

/** Banda `territory` (código) conforme o modo do escopo. */
exports.territoryImage = function () {
  var s = scope();
  if (s.mode === 'custom') {
    return ee.Image().paint(customFc(s), 1).rename('territory').int();
  }
  if (s.mode === 'bioma') {
    var biomes = ee.FeatureCollection(LIM.BIOMES_FC).map(function (f) {
      return f.set('_b', ee.Number.parse(f.get(LIM.BIOME_CODE_PROP)));
    });
    return ee.Image().paint(biomes, '_b').rename('territory').int();
  }
  if (s.mode === 'uf') {
    var ufs = ee.FeatureCollection(LIM.UFS_FC).map(function (f) {
      return f.set('_u', ee.Number.parse(f.get(LIM.UF_CODE_PROP)));
    });
    return ee.Image().paint(ufs, '_u').rename('territory').int();
  }
  // bioma_uf (default)
  var biomeLayer = ee.Image().paint(
    ee.FeatureCollection(LIM.BIOMES_FC).map(function (f) {
      return f.set('_b', ee.Number.parse(f.get(LIM.BIOME_CODE_PROP)));
    }), '_b');
  var ufLayer = ee.Image().paint(
    ee.FeatureCollection(LIM.UFS_FC).map(function (f) {
      return f.set('_u', ee.Number.parse(f.get(LIM.UF_CODE_PROP)));
    }), '_u');
  return biomeLayer.multiply(100).add(ufLayer).rename('territory').int();
};

/** ee.Dictionary de rótulos (constantes p/ as lambdas do rowsFC). */
exports.buildLabelDicts = function (leg) {
  var info = {}, biome = {}, sigla = {}, nome = {}, defsec = {};
  var infoPlain = leg.infoMap();
  Object.keys(infoPlain).forEach(function (k) { info[k] = infoPlain[k]; });
  Object.keys(TER.BIOMAS).forEach(function (k) { biome[k] = TER.BIOMAS[k]; });
  Object.keys(TER.UFS).forEach(function (k) {
    sigla[k] = TER.UFS[k].sigla;
    nome[k] = TER.UFS[k].nome;
  });
  var dlm = leg.defsecLabelMap();
  Object.keys(dlm).forEach(function (k) { defsec[k] = dlm[k]; });
  return {
    info: ee.Dictionary(info),
    biome: ee.Dictionary(biome),
    sigla: ee.Dictionary(sigla),
    nome: ee.Dictionary(nome),
    defsec: ee.Dictionary(defsec)
  };
};

/** Props de rótulo (EE) para um código de território, conforme o escopo. */
exports.labelProps = function (code, D) {
  var s = scope();
  var c = ee.Number(code).int();
  if (s.mode === 'bioma_uf') {
    var b = c.divide(100).int();
    var u = c.mod(100).int();
    return {
      'Bioma': ee.String(D.biome.get(b, '')),
      'UF': ee.String(D.sigla.get(u, '')),
      'Unidade Federativa': ee.String(D.nome.get(u, ''))
    };
  }
  if (s.mode === 'bioma') {
    return { 'Bioma': ee.String(D.biome.get(c, '')) };
  }
  if (s.mode === 'uf') {
    return {
      'UF': ee.String(D.sigla.get(c, '')),
      'Unidade Federativa': ee.String(D.nome.get(c, ''))
    };
  }
  return {}; // custom: o nome do arquivo carrega o território
};

/** Geometria da ÁREA de análise (recorte para a redução). Aceita override. */
exports.regionGeom = function (regionOverride) {
  var r = regionOverride || region();
  if (r.biomeName) {
    return ee.FeatureCollection(LIM.BIOMES_FC)
      .filter(ee.Filter.eq(LIM.BIOME_NAME_PROP, r.biomeName))
      .first().geometry();
  }
  if (r.fc) {
    var fc = ee.FeatureCollection(r.fc);
    if (r.filterProp) fc = fc.filter(ee.Filter.eq(r.filterProp, r.filterValue));
    return fc.geometry();
  }
  // allBiomes (referências) ou default: união de todos os biomas
  return ee.FeatureCollection(LIM.BIOMES_FC).geometry();
};
