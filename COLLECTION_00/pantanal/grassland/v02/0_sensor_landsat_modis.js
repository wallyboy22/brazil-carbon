/******************************************************************************
 * Pantanal Grassland v02 · Sensor Landsat/MODIS
 * ---------------------------------------------------------------------------
 * Mesma interface da v01 (um futuro módulo HLS preserva as funções públicas),
 * com as decisões da v02:
 *   · produtos mensais saem para TODO o bioma (PREDICT_FULL_BIOME) e apenas a
 *     água permanente (MASK_WATER) é removida;
 *   · biomassa usa o modelo calibrado por campo (c.BIOMASS_MODEL) com clamp;
 *   · fPAR aplica Fpar_QC quando USE_QC;
 *   · expõe monthlyReflectance (covariáveis) usada em 1_check, 2_1 (parcelas)
 *     e 6_qa.
 ******************************************************************************/

var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/v02/0_contract.js');
var infra = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_infra.js');

var NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
var SLOPES = ee.Image.constant([0.8474, 0.8483, 0.9047, 0.8462, 0.8937, 0.9071]).rename(NAMES);
var ITCPS = ee.Image.constant([0.0003, 0.0088, 0.0061, 0.0412, 0.0254, 0.0172]).rename(NAMES);
var MOD = c.BIOMASS_MODEL;

exports.ensureFolder = infra.ensureFolder;

exports.getBiome = function () {
  return ee.FeatureCollection(c.BIOME_FC)
    .filter(ee.Filter.eq(c.BIOME_PROP, c.BIOME_NAME));
};

/** Máscara campestre C11 — análise/rotulação (não filtra mais a produção). */
exports.getGrasslandMask = function (year) {
  var biome = exports.getBiome();
  var lulc = ee.Image(c.LULC_ASSET).select('classification_' + year);
  return lulc.updateMask(ee.Image().paint(biome, 1))
    .remap(c.GRASSLAND_CLASSES,
      c.GRASSLAND_CLASSES.map(function () { return 1; }), 0)
    .selfMask().rename('grassland_mask').toUint8();
};

/** Água permanente: classe 33 (Rio/Lago) ou NDWI de seca > 0,15. */
exports.getWaterMask = function (year) {
  var biome = exports.getBiome();
  var lulc = ee.Image(c.LULC_ASSET).select('classification_' + year)
    .updateMask(ee.Image().paint(biome, 1));
  var waterLulc = lulc.eq(33);
  // NDWI seco = percentil 10 dos NDWI mensais do ano (evolução da v01, que
  // fixava jul/ago/set — reflexão B4). Mede o estado de seca real do pixel.
  var MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  var ndwiDry = ee.ImageCollection(MONTHS.map(function (month) {
    return exports.monthlyReflectance(year, month).select('ndwi');
  })).reduce(ee.Reducer.percentile([10])).rename('ndwi_dry');
  var water = waterLulc.unmask(0).or(ndwiDry.gt(0.15));
  return water.gte(1).rename('water_mask')
    .updateMask(ee.Image().paint(biome, 1)).toUint8();
};

function maskClouds(image) {
  var qa = image.select('QA_PIXEL');
  return image.updateMask(
    qa.bitwiseAnd(1 << 1).eq(0)
      .and(qa.bitwiseAnd(1 << 2).eq(0))
      .and(qa.bitwiseAnd(1 << 3).eq(0))
      .and(qa.bitwiseAnd(1 << 4).eq(0))
  );
}

function prepTmEtm(image) {
  return maskClouds(image)
    .select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'], NAMES)
    .multiply(0.0000275).add(-0.2)
    .copyProperties(image, image.propertyNames());
}

function prepOli(image) {
  var refl = maskClouds(image)
    .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], NAMES)
    .multiply(0.0000275).add(-0.2);
  return refl.subtract(ITCPS).divide(SLOPES)
    .copyProperties(image, image.propertyNames());
}

function addIndices(image) {
  var ndvi = image.normalizedDifference(['nir', 'red']).rename('ndvi');
  var ndwi = image.normalizedDifference(['green', 'nir']).rename('ndwi');
  return image.addBands([ndvi, ndwi]);
}

/** Modelo calibrado (Fonseca log-linear) com clamp de suporte. */
function addBiomass(image) {
  var m = MOD.coefficients;
  var pred = image.expression(
    'exp(a + b * red + cc * swir1 + d * swir2)',
    { a: m.intercept, b: m.red, cc: m.swir1, d: m.swir2,
      red: image.select('red'), swir1: image.select('swir1'),
      swir2: image.select('swir2') });
  var clamped = pred.min(MOD.clampMgHa.max).max(MOD.clampMgHa.min);
  return image.addBands(clamped.rename('biomass_kg_ha').toFloat());
}

/** Cheia dinâmica mensal: NDWI do próprio mês > 0,15 (reflexão C9/fase 4). */
exports.getFloodMask = function (year, month) {
  return exports.monthlyReflectance(year, month).select('ndwi')
    .gt(0.15).rename('flood_mask').toUint8();
};

/** Máscara aplicada aos produtos: água (e grassland se PREDICT≠full; e a
 * cheia mensal se MASK_FLOOD). */
function productMask(year, month) {
  var keep = null;
  if (!c.PREDICT_FULL_BIOME) keep = exports.getGrasslandMask(year);
  if (c.MASK_WATER) {
    var land = exports.getWaterMask(year).not();
    keep = keep ? keep.mask(land) : land.updateMask(land);
  }
  if (c.MASK_FLOOD && month) {
    var dry = exports.getFloodMask(year, month).not().selfMask();
    keep = keep ? keep.mask(dry) : dry.updateMask(dry);
  }
  return keep ? keep : ee.Image.constant(1);
}

function filterScenes(biome, start, end) {
  var f = function (col) {
    return ee.ImageCollection(col).filterBounds(biome.geometry())
      .filterDate(start, end).filter(ee.Filter.lt('CLOUD_COVER', 40));
  };
  return f('LANDSAT/LT05/C02/T1_L2').map(prepTmEtm)
    .merge(f('LANDSAT/LE07/C02/T1_L2').map(prepTmEtm))
    .merge(f('LANDSAT/LC08/C02/T1_L2').map(prepOli))
    .merge(f('LANDSAT/LC09/C02/T1_L2').map(prepOli));
}

/** Reflectância mensal (média das cenas) sobre todo o bioma, SEM máscaras. */
exports.monthlyReflectance = function (year, month) {
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');
  var biome = exports.getBiome();
  return filterScenes(biome, start, end).map(addIndices)
    .mean().select(['red', 'green', 'nir', 'swir1', 'swir2', 'ndvi', 'ndwi'])
    .float()
    .set('year', year).set('month', month);
};

/** Biomassa mensal (kg MS/ha) em todo o bioma (água mascarada). */
exports.monthlyBiomass = function (year, month) {
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');
  var biome = exports.getBiome();
  var col = filterScenes(biome, start, end).map(addBiomass);
  return col.select('biomass_kg_ha').mean()
    .updateMask(productMask(year, month)).rename('biomass_' + month).toFloat()
    .set('year', year).set('month', month);
};

function qcFpar(image) {
  if (!c.USE_QC) return image;
  var qc = image.select('Fpar_QC');
  return image.updateMask(qc.bitwiseAnd(3).lte(1)); // MODLAND_QC ≤ 1
}

function qcDsr(image) {
  if (!c.USE_QC) return image;
  var qc = image.select('DSR_QC');
  return image.updateMask(qc.bitwiseAnd(3).lte(1)
    .and(qc.bitwiseAnd(12).eq(0))); // qualidade ≤ 1 e céu claro (bits 2-3)
}

/** PARa mensal bruto (MJ/m²) de um único mês — sem máscara/renome. */
function paraCore(year, month) {
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');
  var fpar = ee.ImageCollection('MODIS/061/MCD15A3H')
    .filterDate(start, end).filterBounds(exports.getBiome().geometry())
    .select('Fpar', 'Fpar_QC');
  var dsr = ee.ImageCollection('MODIS/061/MCD18A1')
    .filterDate(start, end).filterBounds(exports.getBiome().geometry())
    .select('DSR', 'DSR_QC');
  return fpar.map(function (image) {
    var t = image.date();
    var dsrMean = dsr.filterDate(t, t.advance(4, 'day')).map(qcDsr)
      .mean().multiply(86400).multiply(1e-6);
    return qcFpar(image).multiply(0.01).resample('bilinear')
      .multiply(dsrMean.multiply(0.48)).multiply(4).rename('para');
  }).sum();
}

/** PARa mensal (MJ/m²/mês) em todo o bioma. */
exports.monthlyPara = function (year, month) {
  var para = paraCore(year, month);
  if (c.INTERP_MISSING_FPAR) {
    // Interpolação temporal (reflexão C11): mês sem fPAR válido é preenchido
    // com a média dos meses adjacentes. Sem recursão — vizinhos via paraCore.
    var prev = paraCore(year, month > 1 ? month - 1 : 12, month);
    var next = paraCore(year, month < 12 ? month + 1 : 1, month);
    var need = para.mask().unmask(0).not(); // pixels sem fPAR no mês
    var fill = prev.addBands(next).reduce(ee.Reducer.mean())
      .rename('para').updateMask(need);
    para = para.unmask(fill);
  }
  return para.updateMask(productMask(year, month)).rename('para_' + month).toFloat()
    .set('year', year).set('month', month);
};

/** Modulador de déficit hídrico/umidade (gate; provisório — fase 4). */
function ecaModulation(year, month) {
  if (!c.ECA_MODULATE_CWD) return ee.Image.constant(1);
  var ndwi = exports.monthlyReflectance(year, month).select('ndwi');
  return ndwi.min(0.2).max(0).divide(0.2).multiply(0.5).add(0.5)
    .rename('eca_mod');
}

/** ANPP mensal (kg MS/ha/mês) em todo o bioma. */
exports.monthlyAnpp = function (year, month) {
  return exports.monthlyPara(year, month)
    .multiply(c.ECA_MONTHLY[month])
    .multiply(ecaModulation(year, month)).multiply(10)
    .rename('anpp_' + month).toFloat()
    .set('year', year).set('month', month);
};