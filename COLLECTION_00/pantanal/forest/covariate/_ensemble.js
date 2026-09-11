/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_ensemble.js
 * ---------------------------------------------------------------------------
 * Ensemble RF — subconjunto determinístico de bandas por membro.
 * Política since_v07 (resposta D15-17) — registrado em _metadata.js.
 * Módulo independente: só usa `ee` e o objeto ENSEMBLE passado em `cfg`.
 ******************************************************************************/

function hashString(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** ~BAND_FRACTION das FEATURE_BANDS, escolhidas por hash banda+i (determinístico). */
exports.getMemberBands = function (cfg, i) {
  var frac = cfg.ensemble.BAND_FRACTION;
  var chosen = cfg.featureBands.filter(function (b) {
    return (hashString(b + '::' + i) % 1000) / 1000 < frac;
  });
  if (chosen.length < 3) {
    return cfg.featureBands.slice(0, Math.max(3, chosen.length));
  }
  return chosen;
};