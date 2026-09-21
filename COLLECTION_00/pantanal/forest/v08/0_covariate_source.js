/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · Fonte de covariáveis
 * ---------------------------------------------------------------------------
 * FIX DA V08 (artefato de excesso pós-v07): o PALSAR é construído UMA VEZ
 * como mosaico GLOBAL determinístico do ano e injetado em todas as células,
 * em vez do `.first()` por célula herdado da v01 (que escolhia strips
 * arbitrárias por AOI e criava platôs de HV/HH alinhados à grade).
 *
 * Política de contratos/covariáveis (set/2026): arquivo ÚNICO e autossuficiente
 * (sem require de outras versões). Lê o próprio contrato (v08/0_contract.js) +
 * biblioteca compartilhada covariate/* (formulações desde_vNN em _metadata.js).
 *
 *   buildPalsarGlobal(year):
 *     - ImageCollection anual de SAR_EPOCH no bioma
 *     - DN <= 0 mascarado como nodata (updateMask(img.gt(0)))
 *     - combinação por MEDIANA (determinística) das observações válidas
 *     - conversão dB idêntica à cadeia (pow²·log10·10−83), HV/HH ratio, RVI
 *       e filtro de speckle focal_mean(3)
 *   getFootprints():
 *     - footprints/parcelas da fonte ativa (GEDI: merge dos anos BAP; IFN:
 *       centroide + AGB_Mg_ha→agbd), SEM mascaramento
 *   filtro de TREINO (no 2_2, por célula): mapbiomas_lulc ∈ FOREST_CLASSES +
 *     notNull(FEATURE_BANDS). As antigas máscaras de imagem (lulc_forest /
 *     palsar_nodata) ficam como legado abaixo.
 *   buildTypedCovariatesStack(aoi, year):
 *     - remove bandas PALSAR per-célula do stack (não computadas no output)
 *     - injeta o mosaico global tipado de PALSAR do ano (determinístico)
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var infra = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_infra.js');
var palsar = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_palsar.js');
var ens = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_ensemble.js');
var build_stack = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/build_stack.js');
var metadata = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/covariate/_metadata.js');

var PALSAR_BANDS = ['HH_db', 'HV_db', 'HV_HH_ratio', 'RVI'];

// ---------------------------------------------------------------------------
// Config (contrato da própria versão)
// ---------------------------------------------------------------------------
exports.ASSET_ROOT = c.ASSET_ROOT;
exports.SOURCE = c.SOURCE;
exports.SOURCE_CFG = c.SOURCE_CFG;
exports.BAP_ASSET = c.BAP_ASSET;
exports.LULC_ASSET = c.LULC_ASSET;
exports.FOREST_CLASSES = c.FOREST_CLASSES;
exports.SCALE = c.SCALE;
exports.FEATURE_BANDS = c.FEATURE_BANDS;
exports.TARGET = c.TARGET;
exports.CONTINUOUS_BANDS = c.CONTINUOUS_BANDS;
exports.CATEGORICAL_BANDS = c.CATEGORICAL_BANDS;
exports.ENSEMBLE = c.ENSEMBLE;
exports.makeTiles = c.makeTiles;
exports.makeCellDefinitions = c.makeCellDefinitions;
exports.makeCellFeatures = c.makeCellFeatures;

// ---------------------------------------------------------------------------
// Infra de assets (biblioteca compartilhada)
// ---------------------------------------------------------------------------
exports.ensureFolder = infra.ensureFolder;
exports.ensureImageCollection = infra.ensureImageCollection;
exports.SAMPLE_PROPS = infra.SAMPLE_PROPS;

// ---------------------------------------------------------------------------
// Domínio BAP (Bacia do Alto Paraguai = Pantanal + Planalto)
// União dos 3 polígonos do asset numa feição única com `domain = 'BAP'`.
// ---------------------------------------------------------------------------
exports.getDomain = function () {
  var geom = ee.FeatureCollection(c.BAP_ASSET).geometry();
  return ee.FeatureCollection([ee.Feature(geom, { domain: c.DOMAIN_NAME })]);
};

// ---------------------------------------------------------------------------
// Amostras por fonte (multi-fonte: gedi | ifn)
// ---------------------------------------------------------------------------
exports.getSampleProps = function () {
  return c.SOURCE_CFG.sampleProps;
};

/**
 * Footprints/parcelas da fonte ativa, normalizados para o schema do pipeline:
 *   · gedi — merge dos footprints BAP (`gedi_footprint_bap_<ano>`), alvo já `agbd`;
 *   · ifn  — parcelas IFN normalizadas e PERSISTIDAS pelo `2_0_ifn_export_footprint`
 *            (`ifn_footprint_<ano>`: centroide + `AGB_Mg_ha` → `agbd`).
 * O alvo final é sempre `agbd` (t/ha).
 */
exports.getFootprints = function () {
  var S = c.SOURCE_CFG;
  if (c.SOURCE === 'gedi') {
    // Tolera anos sem asset (o exportador pula anos sem pegadas) e falha com
    // mensagem clara se NENHUM gedi_footprint_bap_* existir.
    var existing = [];
    var missing = [];
    S.footprintAssets.forEach(function (a) {
      try { ee.data.getAsset(a); existing.push(a); }
      catch (e) { missing.push(a); }
    });
    if (missing.length) {
      print('[AVISO] footprints ausentes (ok se o ano não tinha GEDI):',
        missing.join(', '));
    }
    if (!existing.length) {
      throw new Error('Nenhum gedi_footprint_bap_* encontrado — rode ' +
        '2_0_gedi_export_footprint.js no GEE e aguarde as tasks.');
    }
    return ee.FeatureCollection(existing.map(function (a) {
      return ee.FeatureCollection(a);
    })).flatten();
  }
  // ifn — parcelas já normalizadas (centroide + agbd) pelo 2_0.
  var existingIfn = [];
  var missingIfn = [];
  S.footprintAssets.forEach(function (a) {
    try { ee.data.getAsset(a); existingIfn.push(a); }
    catch (e) { missingIfn.push(a); }
  });
  if (missingIfn.length) {
    print('[AVISO] footprints IFN ausentes:', missingIfn.join(', '));
  }
  if (!existingIfn.length) {
    throw new Error('Nenhum ifn_footprint_* encontrado — rode ' +
      '2_0_ifn_export_footprint.js e aguarde a task.');
  }
  return ee.FeatureCollection(existingIfn.map(function (a) {
    return ee.FeatureCollection(a);
  })).flatten();
};

// ---------------------------------------------------------------------------
// PALSAR-2 global (FIX v08)
// ---------------------------------------------------------------------------
exports.buildPalsarGlobal = function (year) {
  return palsar.buildPalsarGlobal(exports.getDomain(), year);
};

exports.getPalsarValidMask = function (year) {
  return palsar.getPalsarValidMask(exports.getDomain(), year);
};

// ---------------------------------------------------------------------------
// Ensemble — subconjunto determinístico de bandas para o membro i
// ---------------------------------------------------------------------------
exports.getMemberBands = function (i) {
  return ens.getMemberBands({ ensemble: c.ENSEMBLE, featureBands: c.FEATURE_BANDS }, i);
};

// ---------------------------------------------------------------------------
// Stack tipado com PALSAR GLOBAL (FIX v08)
// ---------------------------------------------------------------------------
exports.buildTypedCovariatesStack = function (aoi, year) {
  var raw = build_stack.buildTypedCovariatesStack(aoi, year, {
    continuous: c.CONTINUOUS_BANDS,
    categorical: c.CATEGORICAL_BANDS,
    feature: c.FEATURE_BANDS
  });
  // Remove as bandas PALSAR per-célula (não são computadas no output)
  var contNoPalsar = c.CONTINUOUS_BANDS.filter(function (b) {
    return PALSAR_BANDS.indexOf(b) === -1;
  });
  var typed = raw.select(contNoPalsar).toFloat()
    .addBands(raw.select(c.CATEGORICAL_BANDS).toUint8())
    .select(contNoPalsar.concat(c.CATEGORICAL_BANDS)).clip(aoi);
  // Injeta o mosaico global de PALSAR do ano (determinístico)
  var palsarGlobal = exports.buildPalsarGlobal(year)
    .select(PALSAR_BANDS).toFloat().clip(aoi);
  return typed.addBands(palsarGlobal).select(c.FEATURE_BANDS).clip(aoi);
};

// ---------------------------------------------------------------------------
// Metadata de covariáveis — impressa como propriedade no modelo
// ---------------------------------------------------------------------------
exports.COVARIATES_REGISTRY = metadata.COVARIATES_REGISTRY;
exports.COVARIATES_VERSION = metadata.COVARIATES_VERSION;