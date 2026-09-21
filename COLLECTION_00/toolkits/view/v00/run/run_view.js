/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · run · run_view (APP de QA)
 * ---------------------------------------------------------------------------
 * App interativo (Code Editor) para QA visual genérico do Carbono:
 *   · TERRITÓRIO: Bioma / UF / Região / Brasil (assets do projeto);
 *   · CAMADAS: Resultados (forest/grassland, todas as versões), Referências
 *     (benchmarks/CN) e Uso e Cobertura (MapBiomas C11);
 *   · legenda C11, opacidade e zoom no território.
 *
 * Uso: só rodar. Cada checkbox liga/desliga uma camada no mapa.
 ******************************************************************************/
var LAY = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_layers.js');
var LC = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_landcover.js');
var REG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_regions.js');
var LYR = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_layers.js');

Map.setOptions('SATELLITE');

var state = { level: 'bioma', regions: [], layers: {}, opacity: 0.85 };
var managed = {};          // id -> ui.Map.Layer
var levelButtons = {};     // id -> ui.Button

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------
var panel = ui.Panel({ style: { width: '360px', padding: '6px',
  backgroundColor: '#ffffff' } });
ui.root.insert(0, panel);
panel.add(ui.Label('MapBiomas Carbono · QA',
  { fontWeight: 'bold', fontSize: '15px', margin: '2px' }));

// ---- Território -------------------------------------------------------------
panel.add(ui.Label('Território', { fontWeight: 'bold', margin: '4px 0 0 0' }));
var levelRow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
  style: { stretch: 'horizontal' } });
panel.add(levelRow);
REG.order.forEach(function (id) {
  var b = ui.Button({ label: REG.levels[id].label,
    style: { margin: '1px', padding: '1px' },
    onClick: function () { setLevel(id); } });
  levelButtons[id] = b;
  levelRow.add(b);
});
var regionPanel = ui.Panel({ style: { maxHeight: '160px' } });
panel.add(ui.Label('Regiões (vazio = todas):', { fontSize: '12px' }));
panel.add(regionPanel);

// ---- Camadas ----------------------------------------------------------------
panel.add(ui.Label('Camadas', { fontWeight: 'bold', margin: '6px 0 0 0' }));
var layerChecks = {};
LAY.GROUPS.forEach(function (g) {
  panel.add(ui.Label(g.grupo,
    { fontWeight: 'bold', fontSize: '12px', margin: '4px 0 0 0' }));
  g.camadas.forEach(function (l) {
    var chk = ui.Checkbox({ label: l.nome,
      onChange: function (v) { state.layers[l.id] = v; refreshMap(); } });
    layerChecks[l.id] = chk;
    panel.add(chk);
  });
});

// ---- Opacidade --------------------------------------------------------------
panel.add(ui.Label('Opacidade:', { fontSize: '12px', margin: '6px 0 0 0' }));
panel.add(ui.Slider({ min: 0, max: 1, value: state.opacity,
  style: { stretch: 'horizontal' },
  onChange: function (v) { state.opacity = v; refreshMap(); } }));

// ---- Legenda C11 ------------------------------------------------------------
panel.add(ui.Label('Legenda · Uso e Cobertura (C11)',
  { fontWeight: 'bold', fontSize: '12px', margin: '6px 0 0 0' }));
var legendPanel = ui.Panel({ style: { maxHeight: '180px' } });
Object.keys(LC.LULC_LEGEND).forEach(function (code) {
  var it = LC.LULC_LEGEND[code];
  var sw = ui.Label('', { backgroundColor: it.cor, width: '12px', height: '12px',
    margin: '0 4px 0 0', padding: '0' });
  legendPanel.add(ui.Panel([
    sw, ui.Label(it.nome + ' (' + code + ')', { fontSize: '11px', margin: '0' })
  ], ui.Panel.Layout.flow('horizontal'), { margin: '0', padding: '0' }));
});
panel.add(legendPanel);

// ---------------------------------------------------------------------------
// Lógica
// ---------------------------------------------------------------------------
function setLevel(id) {
  state.level = id;
  state.regions = [];
  Object.keys(levelButtons).forEach(function (k) {
    levelButtons[k].style().set('backgroundColor',
      k === id ? '#cfe8ff' : '#ffffff');
  });
  refreshRegions();
  refreshMap();
}

function refreshRegions() {
  regionPanel.clear();
  var all = ui.Checkbox({ label: 'Todas', value: state.regions.length === 0,
    onChange: function (v) {
      if (v) { state.regions = []; refreshRegions(); refreshMap(); }
    } });
  regionPanel.add(all);
  REG.regionNames(state.level, function (names) {
    regionPanel.clear();
    regionPanel.add(all);
    names.forEach(function (n) {
      regionPanel.add(ui.Checkbox({ label: n,
        value: state.regions.indexOf(n) > -1,
        onChange: function (v) {
          if (v) { if (state.regions.indexOf(n) === -1) state.regions.push(n); }
          else { state.regions = state.regions.filter(function (x) { return x !== n; }); }
          refreshMap();
        } }));
    });
  });
}

function refreshMap() {
  Object.keys(managed).forEach(function (id) {
    Map.layers().remove(managed[id]);
    delete managed[id];
  });
  var geom = REG.geometryFor(state.level, state.regions);
  LAY.LAYERS.forEach(function (l) {
    if (!state.layers[l.id]) return;
    var img = LYR.masked(l, geom);
    var layer = ui.Map.Layer(img, l.vis, l.nome, true, state.opacity);
    Map.layers().add(layer);
    managed[l.id] = layer;
  });
  Map.centerObject(ee.FeatureCollection([ee.Feature(geom)]), 6);
}

print('MAPBIOMAS-CARBONO · toolkit view/v00 · run_view');
print('[CAMADAS]', LAY.LAYERS.length, '·', LAY.GROUPS.length, 'grupos');
print('[TERRITÓRIOS]', REG.order.join(', '));
print('[USO] marque as camadas no painel; escolha o território para filtrar/zoom.');

setLevel('bioma');
