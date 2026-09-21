/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/ui · module_icons
 * ---------------------------------------------------------------------------
 * Acesso AGNÓSTICO aos ícones do pacote MapBiomas (GEE), com fallback.
 * Consome `users/workspaceipam/packages:mapbiomas-toolkit/utils/b64` quando
 * disponível; se o pacote/chave não existir, devolve um fallback textual.
 ******************************************************************************/
var PKG = 'users/workspaceipam/packages:mapbiomas-toolkit/utils/b64';

var _b64 = null;
try { _b64 = require(PKG); } catch (e) { _b64 = null; }

var FALLBACK = {
  'arraw_v': '▼',
  'arraw_>': '▶',
  'load_gif': ''
};

/** Ícone por chave (data URL) ou fallback textual. */
exports.get = function (key) {
  if (_b64) {
    try {
      var v = _b64.get(key);
      if (v) return v;
    } catch (e) { /* ignora */ }
  }
  return FALLBACK[key] !== undefined ? FALLBACK[key] : '';
};

/** Ícone de seta (aberto/fechado) para os cabinets. */
exports.arrow = function (open) {
  return exports.get(open ? 'arraw_v' : 'arraw_>');
};

/** True se o pacote de ícones está disponível. */
exports.available = function () { return !!_b64; };
