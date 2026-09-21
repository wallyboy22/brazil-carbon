/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/ui · module_icons
 * ---------------------------------------------------------------------------
 * Acesso AGNÓSTICO aos ícones do pacote MapBiomas (GEE), com fallback.
 * Tenta os caminhos conhecidos de `packages`; se nenhum resolver, devolve um
 * fallback textual (setas). Sem logo.
 ******************************************************************************/
var PATHS = [
  'users/workspaceipam/packages:mapbiomas-toolkit/utils/b64',
  'users/workspaceipam/packages:mapbiomas-toolkit/utils/b64.js',
  'users/workspaceipam/mapbiomas-toolkit:utils/b64'
];

var _b64 = null;
var _path = null;
for (var i = 0; i < PATHS.length; i++) {
  try {
    var mod = require(PATHS[i]);
    if (mod && typeof mod.get === 'function') { _b64 = mod; _path = PATHS[i]; break; }
  } catch (e) { /* tenta o próximo */ }
}

var FALLBACK = { 'arraw_v': '▼', 'arraw_>': '▶', 'load_gif': '' };

/** Ícone por chave (data URL) ou fallback textual. */
exports.get = function (key) {
  if (_b64) {
    try { var v = _b64.get(key); if (v) return v; } catch (e) { /* ignora */ }
  }
  return FALLBACK[key] !== undefined ? FALLBACK[key] : '';
};

/** Ícone de seta (aberto/fechado) para os cabinets. */
exports.arrow = function (open) {
  return exports.get(open ? 'arraw_v' : 'arraw_>');
};

/** True se o pacote de ícones está disponível. */
exports.available = function () { return !!_b64; };

/** Caminho do pacote resolvido (diagnóstico). */
exports.source = function () { return _path; };
