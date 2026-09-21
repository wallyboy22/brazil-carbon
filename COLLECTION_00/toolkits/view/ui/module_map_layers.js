/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/ui · module_map_layers
 * ---------------------------------------------------------------------------
 * Gestão de camadas no Map sem duplicação (padrão do toolkit de referência):
 *   manager(map?) → update/remove/clear/debounced
 * Nomes de camada são truncados (limite de descrição do Code Editor).
 ******************************************************************************/
var MAX_NAME = 90;

function safeName(name, fallback) {
  var s = String(name === null || name === undefined ? fallback : name);
  return s.length > MAX_NAME ? s.slice(0, MAX_NAME) : s;
}

exports.manager = function (map) {
  map = map || Map;
  var managed = {};
  var timer = null;

  return {
    /** Cria/atualiza a camada `id` (não duplica). */
    update: function (id, eeObject, vis, name, opacity) {
      var nm = safeName(name, id);
      if (managed[id]) {
        managed[id].setEeObject(eeObject);
        managed[id].setVisParams(vis);
        managed[id].setName(nm);
        if (opacity !== undefined) managed[id].setOpacity(opacity);
      } else {
        var l = ui.Map.Layer(eeObject, vis, nm, true,
          opacity === undefined ? 1 : opacity);
        managed[id] = l;
        var idx = Math.max(0, map.layers().length() - 2);
        map.layers().insert(idx, l);
      }
    },
    /** Remove a camada `id`. */
    remove: function (id) {
      if (managed[id]) { map.layers().remove(managed[id]); delete managed[id]; }
    },
    /** Remove todas as camadas gerenciadas. */
    clear: function () {
      Object.keys(managed).forEach(function (id) {
        map.layers().remove(managed[id]);
        delete managed[id];
      });
    },
    /** Agenda `fn` (debounce). */
    debounced: function (fn, ms) {
      if (timer) ui.util.clearTimeout(timer);
      timer = ui.util.setTimeout(fn, ms || 600);
    }
  };
};
