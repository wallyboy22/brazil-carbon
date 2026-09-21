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
var ML = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/ui/module_map_layers.js');
var INFRA = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_infra.js');

// Ícones: MESMA fonte do toolkit do MapBiomas Fogo (require no topo do script).
var b64 = null;
try {
  b64 = require('users/workspaceipam/packages:mapbiomas-toolkit/utils/b64');
} catch (e) {
  print('[AVISO] pacote b64 indisponível (usando fallback textual):', e);
}
UI.setIcons(b64);

// Só camadas cujo asset EXISTE (pula o que ainda não foi exportado, ex.: v08).
var available = LAY.LAYERS.filter(function (l) {
  var target = l.col || l.asset || (l.paint && l.paint.fc);
  if (INFRA.assetExists(target)) return true;
  print('[AVISO] camada ausente (ignorada):', l.nome, '\u2192', target);
  return false;
});

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

var drawerRegions = UI.createLayerDrawer({ title: 'Regiões (vazio = Brasil)',
  options: [] });
cabTerr.content.add(drawerRegions.panel);

// ---------------------------------------------------------------------------
// CAMADAS — gavetas aninhadas (MapBiomas Carbono · Referência · Auxiliares)
// ---------------------------------------------------------------------------
// Índice por ID (o `require` do GEE serializa os exports, então comparar
// identidade de objeto falha — ver `available` × `LAY.PRODUTOS`).
var availIds = {};
available.forEach(function (l) { availIds[l.id] = true; });

/** Mantém só os grupos com camadas disponíveis (comparação por ID). */
function availGroups(groups) {
  return (groups || []).map(function (g) {
    return { id: g.id, label: g.label,
      camadas: (g.camadas || []).filter(function (l) {
        return !!availIds[l.id];
      }) };
  }).filter(function (g) { return g.camadas.length > 0; });
}

function addLayerDrawer(parent, layers) {
  var drawer = UI.createLayerDrawer({
    title: 'camadas',
    options: layers.map(function (l) {
      return { id: l.id, label: l.nome, value: false,
        onChange: function (v) { state.layers[l.id] = v; refreshMap(); } };
    })
  });
  parent.content.add(drawer.panel);
}

function addSubCabinet(parent, label, layers) {
  try {
    var sub = UI.createCabinet({ title: label, isOpen: false,
      indent: '2px 2px 2px 10px' });
    addLayerDrawer(sub, layers);
    parent.content.add(sub.panel);
  } catch (e) {
    print('[ERRO] subgaveta', label, e);
  }
}

// --- CONTROLES (toggles MAP/THUMBNAILS — FORA das gavetas de camadas) --------
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
    if (split) split.showRight(thumbsVisible);
    if (thumbsVisible && thumbs) thumbs.update();
  } });
UI.applyToggleStyle(thumbToggleBtn, false);

var toggleRow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
  style: { margin: '0px', padding: '0px' } });
toggleRow.add(mapToggleBtn).add(thumbToggleBtn);

var cabCtrl = UI.createCabinet({ title: 'CONTROLES', isOpen: true });
shell.body.add(cabCtrl.panel);
cabCtrl.content.add(toggleRow);

// --- MapBiomas Carbono (Cerrado Florestal · Pantanal Florestal · Campestre) --
var cabCarbono = UI.createCabinet({ title: 'MapBiomas Carbono', isOpen: true });
shell.body.add(cabCarbono.panel);
availGroups(LAY.PRODUTOS).forEach(function (p) {
  addSubCabinet(cabCarbono, p.label, p.camadas);
});

// --- Referência (uma gaveta por FONTE) ---------------------------------------
var cabRef = UI.createCabinet({ title: 'Referência', isOpen: false });
shell.body.add(cabRef.panel);
availGroups(LAY.REF_FONTES).forEach(function (f) {
  addSubCabinet(cabRef, f.label, f.camadas);
});

// --- Auxiliares (Uso e Cobertura C11) ----------------------------------------
var cabAux = UI.createCabinet({ title: 'Auxiliares', isOpen: false });
shell.body.add(cabAux.panel);
availGroups(LAY.AUXILIARES).forEach(function (a) {
  addSubCabinet(cabAux, a.label, a.camadas);
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
// LEGENDAS — rampas de cor (com Mín/Máx global) + Uso e Cobertura (C11)
// ---------------------------------------------------------------------------
var visOverride = { min: null, max: null };
function parseNum(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
/** Aplica o Mín/Máx global (se definido) sobre o vis da camada. */
function applyOverride(vis) {
  var v = { min: vis.min, max: vis.max, palette: vis.palette };
  if (visOverride.min !== null) v.min = visOverride.min;
  if (visOverride.max !== null) v.max = visOverride.max;
  return v;
}

var cabRamp = UI.createCabinet({ title: 'LEGENDAS', isOpen: false });
shell.body.add(cabRamp.panel);

var tbMin = ui.Textbox({ value: '', placeholder: 'mín padrão',
  style: { margin: '1px 2px', fontSize: '10px', width: '64px' },
  onChange: function (v) {
    visOverride.min = parseNum(v); refreshMap(); refreshRamps();
  } });
var tbMax = ui.Textbox({ value: '', placeholder: 'máx padrão',
  style: { margin: '1px 2px', fontSize: '10px', width: '64px' },
  onChange: function (v) {
    visOverride.max = parseNum(v); refreshMap(); refreshRamps();
  } });
var rampControls = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
  style: { margin: '0px', padding: '1px', backgroundColor: '#f5f5f5' } });
var ctrlLbl = { fontSize: '10px', margin: '2px' };
rampControls.add(ui.Label('Mín:', ctrlLbl)).add(tbMin)
  .add(ui.Label('Máx:', ctrlLbl)).add(tbMax);
cabRamp.content.add(rampControls);

var rampBody = ui.Panel({ style: { margin: '0px', padding: '0px' } });
cabRamp.content.add(rampBody);

// Uso e Cobertura (C11) — mais abaixo, na mesma gaveta de legendas.
cabRamp.content.add(ui.Label('Uso e Cobertura (C11)',
  { fontSize: '11px', fontWeight: 'bold', margin: '4px 2px 1px 2px' }));
cabRamp.content.add(UI.legendPanel(Object.keys(LC.LULC_LEGEND).map(function (code) {
  return { color: LC.LULC_LEGEND[code].cor,
    label: LC.LULC_LEGEND[code].nome + ' (' + code + ')' };
})));

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
      vis: applyOverride(l.vis),
      bounds: REG.boundsFor(state.level, [region]),
      label: vals.camada.label + ' \u00B7 ' + vals.territorio.label
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
    var all = ui.Checkbox({ label: 'Brasil', value: state.regions.length === 0,
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
  available.forEach(function (l) {
    if (!state.layers[l.id]) return;
    mlayers.update(l.id, LYR.masked(l, fc), applyOverride(l.vis), l.nome,
      state.opacity);
    selected.push({ id: l.id, label: l.nome });
  });
  thumbValues.camada = selected;
  var regions = state.regions.length ? state.regions : currentNames;
  thumbValues.territorio = regions.map(function (n) {
    return { id: n, label: n };
  });
  refreshRamps();
  if (thumbsVisible) thumbs.update();
}

/** Legenda de rampa: uma barra por rampa distinta entre as camadas marcadas. */
function refreshRamps() {
  rampBody.clear();
  var seen = {};
  var order = [];
  available.forEach(function (l) {
    if (!state.layers[l.id]) return;
    if (l.tipo === 'lulc' || !l.vis || !l.vis.palette) return;
    var key = [l.unit || '', l.vis.min, l.vis.max,
      l.vis.palette.join(',')].join('|');
    if (seen[key]) { seen[key].names.push(l.nome); return; }
    seen[key] = { layer: l, names: [l.nome] };
    order.push(key);
  });
  if (!order.length) {
    rampBody.add(ui.Label(
      'Marque camadas contínuas (resultados/referências) para ver a rampa.',
      { fontSize: '10px', color: '#888', margin: '2px' }));
    return;
  }
  order.forEach(function (k) {
    var g = seen[k];
    var l = g.layer;
    var vis = applyOverride(l.vis);
    var title = g.names.length === 1 ? g.names[0]
      : g.names[0] + '  (+' + (g.names.length - 1) + ')';
    rampBody.add(UI.colorBarLegend({
      title: title, unit: l.unit, min: vis.min, max: vis.max,
      palette: vis.palette
    }));
  });
}

print('MAPBIOMAS-CARBONO · toolkit view/v00 · run_view');
print('[CAMADAS]', available.length, 'disponíveis de', LAY.LAYERS.length);
print('[GRUPOS] produtos:', (LAY.PRODUTOS || []).length, '→',
  availGroups(LAY.PRODUTOS).length,
  '· fontes:', (LAY.REF_FONTES || []).length, '→',
  availGroups(LAY.REF_FONTES).length,
  '· auxiliares:', (LAY.AUXILIARES || []).length);
print('[TERRITÓRIOS]', REG.order.join(', '));
print('[ÍCONES] b64:', b64 ? 'ok' : 'fallback textual');

setLevel('bioma');
