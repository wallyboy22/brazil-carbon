/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · module_territory (módulo)
 * ---------------------------------------------------------------------------
 * Território compartilhado pelos motores de estatística: banda `territory` =
 * bioma×100 + UF e os rótulos Bioma / UF / Unidade Federativa das colunas.
 *
 * Alinhado à referência do mapbiomas-fire:
 *   · bioma pintado pelo CÓDIGO numérico do asset (`CD_BIOMA`, 1..6);
 *   · UF pintada pelo CÓDIGO `CD_UF`;
 *   · SEMPRE cruza bioma×UF (não há mais toggle);
 *   · rótulos decodificados por dicionários ESTÁTICOS (sem getInfo/evaluate).
 *
 * API (chamar configure 1× por execução, antes dos runX):
 *   configure(cfg)        — { biomeFc, biomeCodeProp, biomeNameProp, ufFc, ufCodeProp }
 *   territoryImage()      — ee.Image 'territory' (bioma×100 + uf)
 *   buildLabelDicts(leg)  — { info, biome, sigla, nome, defsec } ee.Dictionary
 *   regionGeom(biomeName) — geometria do bioma (por nome)
 ******************************************************************************/
var TER = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/00_catalog_territories.js');

var _CFG = null;

exports.configure = function (cfg) { _CFG = cfg; };

function cfg() {
  if (!_CFG) throw new Error('module_territory.configure() não foi chamado');
  return _CFG;
}

/** Banda `territory` = paint(bioma, código)×100 + paint(UF, código). */
exports.territoryImage = function () {
  var c = cfg();
  var biomeLayer = ee.Image().paint(
    ee.FeatureCollection(c.biomeFc).map(function (f) {
      return f.set('_b', ee.Number.parse(f.get(c.biomeCodeProp)));
    }), '_b');
  var ufLayer = ee.Image().paint(
    ee.FeatureCollection(c.ufFc).map(function (f) {
      return f.set('_u', ee.Number.parse(f.get(c.ufCodeProp)));
    }), '_u');
  return biomeLayer.multiply(100).add(ufLayer).rename('territory').int();
};

/** ee.Dictionary de rótulos (constantes p/ as lambdas do rowsFC). */
exports.buildLabelDicts = function (leg) {
  var info = {}, sigla = {}, nome = {}, defsec = {};
  var infoPlain = leg.infoMap();
  Object.keys(infoPlain).forEach(function (k) { info[k] = infoPlain[k]; });
  Object.keys(TER.UFS).forEach(function (k) {
    sigla[k] = TER.UFS[k].sigla;
    nome[k] = TER.UFS[k].nome;
  });
  var dlm = leg.defsecLabelMap();
  Object.keys(dlm).forEach(function (k) { defsec[k] = dlm[k]; });
  return {
    info: ee.Dictionary(info),
    biome: ee.Dictionary(TER.BIOMAS),
    sigla: ee.Dictionary(sigla),
    nome: ee.Dictionary(nome),
    defsec: ee.Dictionary(defsec)
  };
};

/** Geometria de um bioma (recorte por região para a redução). */
exports.regionGeom = function (biomeName) {
  var c = cfg();
  return ee.FeatureCollection(c.biomeFc)
    .filter(ee.Filter.eq(c.biomeNameProp, biomeName))
    .first().geometry();
};
