/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_infra.js
 * ---------------------------------------------------------------------------
 * Infraestrutura de assets e geografia:
 *   · ensureFolder            — since_v01 (v01/0_covariate_source.js)
 *   · ensureImageCollection   — since_v03
 *   · getBiome                — parametrizado (biomeFc/biomeProp/biomeName)
 *   · SAMPLE_PROPS/_SELECTORS — since_v01 (GEDI L4A)
 * Módulo independente: funções puras; o orquestrador da versão injeta os
 * valores do contrato quando necessário.
 ******************************************************************************/

/**
 * Garante pastas de asset nível a nível (Code Editor não cria ao exportar).
 * `minLevels` = 2 assume 'projects/<projeto>' como existente.
 */
exports.ensureFolder = function (folderPath) {
  var parts = folderPath.split('/');
  var MIN_LEVELS = 2;
  var acc = [];
  for (var i = 0; i < parts.length; i++) {
    acc.push(parts[i]);
    if (i < MIN_LEVELS) continue;
    var current = acc.join('/');
    try {
      ee.data.getAsset(current);
    } catch (e) {
      try {
        ee.data.createAsset({ type: 'Folder' }, current);
        print('[INFO] Pasta criada:', current);
      } catch (e2) {
        print('[AVISO] Falha ao criar pasta', current, '—', e2.message);
      }
    }
  }
};

/** Garante que `collectionPath` exista como ImageCollection (cria se faltar). */
exports.ensureImageCollection = function (collectionPath) {
  var parent = collectionPath.slice(0, collectionPath.lastIndexOf('/'));
  exports.ensureFolder(parent);
  try {
    var info = ee.data.getAsset(collectionPath);
    if (info.type !== 'IMAGE_COLLECTION' && info.type !== 'ImageCollection') {
      print('[ERRO] ' + collectionPath + ' existe, mas NÃO é ImageCollection (' +
        info.type + '). Excluir/recriar antes de rodar.');
      return;
    }
    print('[OK] ImageCollection já existe:', collectionPath);
  } catch (e) {
    try {
      ee.data.createAsset({ type: 'ImageCollection' }, collectionPath);
      print('[OK] ImageCollection criada:', collectionPath);
    } catch (e2) {
      print('[AVISO] Falha ao criar ImageCollection', collectionPath, '—', e2.message);
    }
  }
};

/** FeatureCollection do bioma (recorte padrão da predição). */
exports.getBiome = function (biomeFc, biomeProp, biomeName) {
  return ee.FeatureCollection(biomeFc)
    .filter(ee.Filter.eq(biomeProp, biomeName));
};

/** Propriedades GEDI carregadas na matriz de treino (sampleRegions). */
exports.SAMPLE_PROPS = [
  'agbd', 'agbd_se', 'pft_class', 'shot_number',
  'lon_lowestmode', 'lat_lowestmode'
];

/** Seletores completos para o CSV de footprints (Drive). */
exports.GEDI_SELECTORS = [
  'lon_lowestmode', 'lat_lowestmode', 'agbd', 'agbd_se',
  'agbd_pi_lower', 'agbd_pi_upper', 'sensitivity', 'beam',
  'selected_algorithm', 'pft_class', 'region_class', 'landsat_treecover',
  'shot_number', 'delta_time'
];