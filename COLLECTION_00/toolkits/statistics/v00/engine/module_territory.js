/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · module_territory (módulo)
 * ---------------------------------------------------------------------------
 * Território compartilhado pelos 3 motores de estatística (references,
 * forest, grassland): banda `territory` = bioma×100 + UF e os rótulos IBGE
 * (Bioma / UF / Unidade Federativa) usados nas colunas dos CSVs.
 *
 * Generaliza as diferenças históricas dos motores:
 *   · biomeCodeProp: 'GEOCODE' (forest/grassland) ou 'CD_BIOMA' (references)
 *   · ufEnabled:     references SEMPRE pinta UFs; forest/grassland só quando
 *                    `UF_LIST` não vazio (senão uf=0 → região pura do bioma)
 *   · biomeFallbackProp: references cai para 'NM_BIOMA' quando 'Bioma' falta
 *
 * API (chamar configure 1× por execução, antes dos runX):
 *   configure(cfg)          — fixa a config do módulo
 *   territoryImage()        — ee.Image 'territory' (bioma×100+uf)
 *   loadTerritories(cb)     — getInfo 1× dos rótulos (bioma/UF)
 *   labels()                — {biomeLabels, ufLabels} carregados
 *   buildLabelDicts(leg)    — {info,biome,sigla,nome,defsec} ee.Dictionary
 *   regionGeom(biomeName)   — geometria do bioma (por nome)
 ******************************************************************************/

var _CFG = null;
var _TERRITORY = { biomeLabels: {}, ufLabels: {} };

/** Configura o módulo (1× por run). Campos:
 *   biomeFc, biomeCodeProp, biomeNameProp, biomeFallbackProp,
 *   ufFc, ufCodeProp, ufSiglaProp, ufNameProp, ufEnabled */
exports.configure = function (cfg) {
  _CFG = cfg;
  _TERRITORY = { biomeLabels: {}, ufLabels: {} };
};

function cfg() {
  if (!_CFG) throw new Error('module_territory.configure() não foi chamado');
  return _CFG;
}

/** Banda `territory` = paint(bioma)×100 + paint(UF). */
exports.territoryImage = function () {
  var c = cfg();
  var ufLayer = c.ufEnabled
    ? ee.Image()
      .paint(ee.FeatureCollection(c.ufFc)
        .map(function (f) {
          return f.set('_u', ee.Number.parse(f.get(c.ufCodeProp)));
        }), '_u')
    : ee.Image(0);
  return ee.Image()
    .paint(ee.FeatureCollection(c.biomeFc)
      .map(function (f) {
        return f.set('_b', ee.Number.parse(f.get(c.biomeCodeProp)));
      }), '_b')
    .multiply(100)
    .add(ufLayer)
    .rename('territory').int();
};

/** Carrega 1× os rótulos bioma/UF dos FCs (dicionário por código). */
exports.loadTerritories = function (cb) {
  var c = cfg();
  ee.FeatureCollection(c.biomeFc).getInfo(function (bf) {
    ee.FeatureCollection(c.ufFc).getInfo(function (ufs) {
      (bf.features || []).forEach(function (f) {
        var label = f.properties[c.biomeNameProp];
        if (c.biomeFallbackProp) {
          label = label || f.properties[c.biomeFallbackProp];
        }
        _TERRITORY.biomeLabels[parseInt(f.properties[c.biomeCodeProp], 10)] = label;
      });
      (ufs.features || []).forEach(function (f) {
        _TERRITORY.ufLabels[parseInt(f.properties[c.ufCodeProp], 10)] = {
          sigla: f.properties[c.ufSiglaProp] || '',
          nome: f.properties[c.ufNameProp] || ''
        };
      });
      cb();
    }, function () {
      print('[ERRO] não foi possível carregar UF_FC:', c.ufFc); cb();
    });
  }, function () {
    print('[ERRO] não foi possível carregar BIOME_FC:', c.biomeFc); cb();
  });
};

/** Rótulos carregados (bioma/UF). */
exports.labels = function () { return _TERRITORY; };

/** ee.Dictionary de rótulos (constantes p/ as lambdas do rowsFC). */
exports.buildLabelDicts = function (leg) {
  var info = {}, biome = {}, sigla = {}, nome = {}, defsec = {};
  var infoPlain = leg.infoMap();
  Object.keys(infoPlain).forEach(function (k) { info[k] = infoPlain[k]; });
  Object.keys(_TERRITORY.biomeLabels).forEach(function (k) {
    biome[k] = _TERRITORY.biomeLabels[k];
  });
  Object.keys(_TERRITORY.ufLabels).forEach(function (k) {
    sigla[k] = _TERRITORY.ufLabels[k].sigla;
    nome[k] = _TERRITORY.ufLabels[k].nome;
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

/** Geometria de um bioma (recorte por região para a redução). */
exports.regionGeom = function (biomeName) {
  var c = cfg();
  return ee.FeatureCollection(c.biomeFc)
    .filter(ee.Filter.eq(c.biomeNameProp, biomeName))
    .first().geometry();
};
