/******************************************************************************
 * MAPBIOMAS-CARBONO — pantanal · Infra compartilhada (módulo require)
 * ---------------------------------------------------------------------------
 * Helpers comuns aos ecossistemas (forest/grassland) sem depender de um
 * pipeline específico:
 *   · ensureFolder(folderPath)          — cria pastas de asset que faltam
 *   · assetExists(imageId)              — testa existência de um asset
 * Portado de forest/v01/0_covariate_source.js; reusado p/ desacoplar o
 * grassland do caminho florestal (revisão v02 — B6).
 ******************************************************************************/

/** Cria pastas de asset que faltam (o Code Editor não cria automaticamente). */
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

/** true se o asset existir no projeto (usa listAssets na pasta-pai). */
exports.assetExists = function (imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) { return false; }
};