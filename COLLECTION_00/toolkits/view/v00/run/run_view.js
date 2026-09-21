/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · run · run_view (APP de QA)
 * ---------------------------------------------------------------------------
 * App interativo de QA visual, usando o SISTEMA DE UI reutilizável (view/ui)
 * com o MESMO design do toolkit de referência.
 *   · TERRITÓRIO: Bioma / UF / Região / Brasil (assets do projeto);
 *   · CAMADAS: Resultados (forest/grassland), Referências, Uso e Cobertura;
 *   · legenda C11 + opacidade.
 * Uso: só rodar.
 ******************************************************************************/
var LAY = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_layers.js');
var LC = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_landcover.js');
var REG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_regions.js');
var LYR = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_layers.js');
var UI = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/ui/module_ui.js');
var ICONS = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/ui/module_icons.js');
var ML = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/ui/module_map_layers.js');

Map.setOptions('SATELLITE');
Map.setCenter(-52.0, -14.0, 4);   // visão Brasil (sem zoom por território)

var shell = UI.createAppShell({ title: 'MapBiomas Carbono · QA' });
var activity = UI.createActivity(shell.activity);
var mlayers = ML.manager(Map);
var state = { level: 'bioma', regions: [], layers: {}, opacity: 0.85 };

// ---------------------------------------------------------------------------
// TERRITÓRIO
// ---------------------------------------------------------------------------
var cabTerr = UI.createCabinet({ title: 'TERRITÓRIO', isOpen: true });
shell.body.add(cabTerr.panel);

var drawerLevels = UI.createButtonDrawer({
  title: 'Nível',
  options: REG.order.map(function (id) {
    return { id: id, label: REG.levels[id].label, active: id === 'bioma',
      onClick: function (id) { setLevel(id); } };
  })
});
cabTerr.content.add(drawerLevels.panel);

var drawerRegions = UI.createLayerDrawer({ title: 'Regiões (vazio = todas)',
  options: [] });
cabTerr.content.add(drawerRegions.panel);

// ---------------------------------------------------------------------------
// CAMADAS
// ---------------------------------------------------------------------------
var cabLayers = UI.createCabinet({ title: 'CAMADAS', isOpen: true });
shell.body.add(cabLayers.panel);

// --- Toggles: MAP ON/OFF · THUMBNAILS ON/OFF ---------------------------------
var mapVisible = true;
var thumbsVisible = false;
var mapToggleBtn = ui.Button({ label: 'MAP ON',
  style: { margin: '2px', padding: '2px 6px', fontSize: '11px',
    fontWeight: 'bold' },
  onClick: function () {
    mapVisible = !mapVisible;
    mapToggleBtn.setLabel(mapVisible ? 'MAP ON' : 'MAP OFF');
    UI.applyToggleStyle(mapToggleBtn, mapVisible);
    mlayers.setAllShown(mapVisible);
  } });
UI.applyToggleStyle(mapToggleBtn, true);

var thumbToggleBtn = ui.Button({ label: 'THUMBNAILS OFF',
  style: { margin: '2px', padding: '2px 6px', fontSize: '11px',
    fontWeight: 'bold' },
  onClick: function () {
    thumbsVisible = !thumbsVisible;
    thumbToggleBtn.setLabel(thumbsVisible ? 'THUMBNAILS ON' : 'THUMBNAILS OFF');
    UI.applyToggleStyle(thumbToggleBtn, thumbsVisible);
    split.showRight(thumbsVisible);
    if (thumbsVisible) thumbs.update();
  } });
UI.applyToggleStyle(thumbToggleBtn, false);

var toggleRow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
  style: { margin: '0px', padding: '0px' } });
toggleRow.add(mapToggleBtn).add(thumbToggleBtn);
cabLayers.content.add(toggleRow);

LAY.GROUPS.forEach(function (g) {
  var sub = UI.createCabinet({ title: g.grupo, isOpen: false,
    indent: '2px 2px 2px 10px' });
  var drawer = UI.createLayerDrawer({
    title: 'camadas',
    options: g.camadas.map(function (l) {
      return { id: l.id, label: l.nome, value: false,
        onChange: function (v) { state.layers[l.id] = v; refreshMap(); } };
    })
  });
  sub.content.add(drawer.panel);
  cabLayers.content.add(sub.panel);
});

// ---------------------------------------------------------------------------
// VISUALIZAÇÃO
// ---------------------------------------------------------------------------
var cabVis = UI.createCabinet({ title: 'VISUALIZAÇÃO', isOpen: false });
shell.body.add(cabVis.panel);
cabVis.content.add(ui.Label('Opacidade',
  { fontSize: '11px', fontWeight: 'bold', margin: '2px' }));
cabVis.content.add(ui.Slider({ min: 0, max: 1, value: state.opacity,
  style: { stretch: 'horizontal' },
  onChange: function (v) { state.opacity = v; refreshMap(); } }));

// ---------------------------------------------------------------------------
// LEGENDA (Uso e Cobertura C11)
// ---------------------------------------------------------------------------
var cabLeg = UI.createCabinet({ title: 'LEGENDA · Uso e Cobertura (C11)',
  isOpen: false });
cabLeg.content.add(UI.legendPanel(Object.keys(LC.LULC_LEGEND).map(function (code) {
  return { color: LC.LULC_LEGEND[code].cor,
    label: LC.LULC_LEGEND[code].nome + ' (' + code + ')' };
})));
shell.body.add(cabLeg.panel);

// ---------------------------------------------------------------------------
// PAINEL DIREITO · grade de miniaturas (camada × território)
// ---------------------------------------------------------------------------
var currentNames = [];
var thumbValues = { camada: [], territorio: [] };
var rightPanel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
  style: { margin: '0px', padding: '0px', backgroundColor: '#ffffff',
    border: '1px solid #d0d0d0' } });
rightPanel.add(ui.Label('Miniaturas · camada × território',
  { fontSize: '13px', fontWeight: 'bold', margin: '2px', color: '#222' }));

var thumbs = UI.createThumbnailGrid({
  axes: ['camada', 'territorio'],
  axisLabels: { camada: 'Camada', territorio: 'Território' },
  values: thumbValues,
  cellFor: function (vals) {
    var l = LAY.byId(vals.camada.id);
    var region = vals.territorio.id;
    return {
      image: LYR.masked(l, REG.featuresFor(state.level, [region])),
      vis: l.vis,
      bounds: REG.boundsFor(state.level, [region]),
      label: vals.territorio.label
    };
  }
});
rightPanel.add(thumbs.panel);

var split = UI.createSplitLayout({ mapWidget: shell.mapWidget,
  right: rightPanel });

// ---------------------------------------------------------------------------
// Lógica
// ---------------------------------------------------------------------------
function setLevel(id) {
  state.level = id;
  state.regions = [];
  Object.keys(drawerLevels.buttons).forEach(function (k) {
    UI.styleToggleButton(drawerLevels.buttons[k], k === id);
  });
  refreshRegions();
  refreshMap();
}

function refreshRegions() {
  activity.start();
  REG.regionNames(state.level, activity.wrap(function (names) {
    currentNames = names || [];
    drawerRegions.flowPanel.clear();
    drawerRegions.checkboxes = {};
    var all = ui.Checkbox({ label: 'Todas', value: state.regions.length === 0,
      onChange: function (v) {
        if (v) { state.regions = []; refreshRegions(); refreshMap(); }
      },
      style: { margin: '1px 3px', padding: '0px', fontSize: '10px',
        backgroundColor: '#f9f9f9' } });
    UI.styleCheck(all, state.regions.length === 0);
    drawerRegions.flowPanel.add(all);
    currentNames.forEach(function (n) {
      var on = state.regions.indexOf(n) > -1;
      var chk = ui.Checkbox({ label: n, value: on,
        onChange: function (v) {
          if (v) { if (state.regions.indexOf(n) === -1) state.regions.push(n); }
          else { state.regions = state.regions.filter(function (x) { return x !== n; }); }
          refreshMap();
        },
        style: { margin: '1px 3px', padding: '0px', fontSize: '10px',
          backgroundColor: '#f9f9f9' } });
      UI.styleCheck(chk, on);
      drawerRegions.checkboxes[n] = chk;
      drawerRegions.flowPanel.add(chk);
    });
    refreshMap();
  }));
}

function refreshMap() {
  mlayers.clear();
  var fc = REG.featuresFor(state.level, state.regions);
  var selected = [];
  LAY.LAYERS.forEach(function (l) {
    if (!state.layers[l.id]) return;
    mlayers.update(l.id, LYR.masked(l, fc), l.vis, l.nome, state.opacity);
    selected.push({ id: l.id, label: l.nome });
  });
  thumbValues.camada = selected;
  var regions = state.regions.length ? state.regions : currentNames;
  thumbValues.territorio = regions.map(function (n) {
    return { id: n, label: n };
  });
  if (thumbsVisible) thumbs.update();
}

print('MAPBIOMAS-CARBONO · toolkit view/v00 · run_view');
print('[CAMADAS]', LAY.LAYERS.length, '·', LAY.GROUPS.length, 'grupos');
print('[TERRITÓRIOS]', REG.order.join(', '));
print('[ÍCONES] pacote:', ICONS.source() || 'fallback textual');

setLevel('bioma');
