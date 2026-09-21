/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/ui · module_ui (sistema de UI reutilizável)
 * ---------------------------------------------------------------------------
 * Componentes de UI genéricos (sem conhecimento de domínio), extraídos do
 * design do toolkit de referência (MapBiomas Fogo). Qualquer app do `view`
 * monta a interface a partir daqui.
 *
 *   styles()                       — dicionário de estilos
 *   createAppShell({title})        — painel raiz (head + body + atividade)
 *   createActivity(label)          — indicador de operações em andamento
 *   createCabinet({title,...})     — card colapsável
 *   createLayerDrawer({title,options}) — drawer de checkboxes
 *   createButtonDrawer({title,options}) — toggle-buttons (multi/single)
 *   styleCheck / syncCheckBorder / styleToggleButton / applyToggleStyle
 *   legendPanel(entries)           — legenda (cor + rótulo)
 *   createSplitLayout({mapWidget,right}) — SplitPanel mapa | painel direito
 *   createThumbnailGrid({axes,values,cellFor}) — grade de miniaturas
 ******************************************************************************/
var ICONS = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/ui/module_icons.js');

// ---------------------------------------------------------------------------
// Estilos (0~1px)
// ---------------------------------------------------------------------------
var STYLES = {
  main_panel: { margin: '0px', padding: '1px', backgroundColor: '#ffffff',
    border: '1px solid #d0d0d0' },
  card: { margin: '1px', padding: '2px', border: '1px solid #e0e0e0',
    backgroundColor: '#fcfcfc' },
  row: { margin: '0px', padding: '0px', stretch: 'horizontal',
    backgroundColor: 'ffffff00' },
  title: { margin: '1px', padding: '2px', fontSize: '15px',
    fontWeight: 'bold', color: '#222' },
  label: { margin: '1px', padding: '0px', fontSize: '12px', color: '#555' },
  input: { margin: '1px', padding: '0px', stretch: 'horizontal' }
};
exports.styles = function () { return STYLES; };

// ---------------------------------------------------------------------------
// Shell do app (painel raiz)
// ---------------------------------------------------------------------------
exports.createAppShell = function (o) {
  o = o || {};
  var panel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
    style: STYLES.main_panel });
  panel.style().set('width', o.width || '350px');
  var mapWidget = ui.root.widgets().get(0);
  ui.root.insert(0, panel);

  var head = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
    style: STYLES.row });
  var body = ui.Panel({ style: { margin: '0px', padding: '0px' } });
  panel.add(head).add(body);

  var title = ui.Label(o.title || '', { fontSize: '15px', fontWeight: 'bold',
    color: '#222', margin: '1px', stretch: 'horizontal' });
  var activity = ui.Label('', { fontSize: '13px', margin: '1px', shown: false });
  var titleRow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
    style: { margin: '0px', padding: '0px', stretch: 'horizontal',
      backgroundColor: 'ffffff00' } });
  titleRow.add(title).add(activity);
  head.add(titleRow);

  return { panel: panel, head: head, body: body, title: title,
    activity: activity, mapWidget: mapWidget };
};

// ---------------------------------------------------------------------------
// Indicador de atividade
// ---------------------------------------------------------------------------
exports.createActivity = function (label) {
  var pending = 0;
  var gif = ICONS.get('load_gif');
  if (gif) label.setImageUrl(gif); else label.setValue('…');
  label.style().set('shown', false);
  function update() { label.style().set('shown', pending > 0); }
  var api = {
    start: function () { pending++; update(); },
    end: function () { if (pending > 0) pending--; update(); },
    wrap: function (fn) {
      return function () { api.end(); return fn.apply(null, arguments); };
    }
  };
  return api;
};

// ---------------------------------------------------------------------------
// Cabinet (card colapsável)
// ---------------------------------------------------------------------------
exports.createCabinet = function (o) {
  o = o || {};
  var panel = ui.Panel({ style: { margin: o.indent || '4px 0px', padding: '2px',
    border: '1px solid #dcdcdc', borderRadius: '4px',
    backgroundColor: '#fdfdfd' } });
  var content = ui.Panel({ style: { margin: '0px', padding: '0px',
    backgroundColor: '#fdfdfd' } });
  var header = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'),
    style: { margin: '2px 0px', padding: '1px', backgroundColor: '#f0f0f0',
      border: '1px solid #ddd' } });

  var open = !!o.isOpen;
  var toggleBtn = ui.Button({ imageUrl: ICONS.arrow(open),
    style: { margin: '0px', padding: '0px', backgroundColor: 'ffffff00' } });
  header.add(toggleBtn).add(ui.Label(o.title || '', {
    fontSize: o.indent ? '15px' : '18px', fontWeight: 'bold', margin: '1px 4px',
    color: '#444', backgroundColor: 'ffffff00' }));
  panel.add(header).add(content);
  content.style().set('shown', open);
  toggleBtn.onClick(function () {
    var isShown = content.style().get('shown');
    content.style().set('shown', !isShown);
    toggleBtn.setImageUrl(ICONS.arrow(!isShown));
  });
  return { panel: panel, content: content, header: header, toggle: toggleBtn };
};

// ---------------------------------------------------------------------------
// Drawer de checkboxes
// ---------------------------------------------------------------------------
exports.createLayerDrawer = function (o) {
  o = o || {};
  var panel = ui.Panel({ style: { margin: '2px 0px', padding: '1px',
    border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' } });
  var flow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal', true),
    style: { margin: '0px', padding: '0px', backgroundColor: '#f9f9f9',
      maxHeight: '100px' } });
  var checkboxes = {};
  (o.options || []).forEach(function (opt) {
    var chk = ui.Checkbox({ label: opt.label, value: opt.value || false,
      onChange: function (v) {
        exports.syncCheckBorder(chk);
        if (opt.onChange) opt.onChange(v);
        if (o.onChange) o.onChange(opt.id, v);
      },
      style: { margin: '1px 3px', padding: '0px', fontSize: '10px',
        backgroundColor: '#f9f9f9' } });
    exports.styleCheck(chk, opt.value || false);
    checkboxes[opt.id] = chk;
    flow.add(chk);
  });
  panel.add(ui.Label(o.title || '', { fontSize: '11px', fontWeight: 'bold',
    margin: '1px 2px', backgroundColor: '#f9f9f9' })).add(flow);
  return { panel: panel, checkboxes: checkboxes, flowPanel: flow };
};

// ---------------------------------------------------------------------------
// Drawer de botões (toggle)
// ---------------------------------------------------------------------------
exports.createButtonDrawer = function (o) {
  o = o || {};
  var panel = ui.Panel({ style: { margin: '2px 0px', padding: '1px',
    border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' } });
  var flow = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal', true),
    style: { margin: '0px', padding: '0px', backgroundColor: '#f9f9f9',
      maxHeight: '100px', stretch: 'horizontal' } });
  var buttons = {};
  (o.options || []).forEach(function (opt) {
    var btn = ui.Button({ label: opt.label,
      style: { margin: '0px', padding: '0px 2px', fontSize: '10px',
        border: '1px solid rgba(0,0,0,0)' },
      onClick: function () { if (opt.onClick) opt.onClick(opt.id, btn); } });
    exports.styleToggleButton(btn, opt.active || false);
    buttons[opt.id] = btn;
    flow.add(btn);
  });
  panel.add(ui.Label(o.title || '', { fontSize: '11px', fontWeight: 'bold',
    margin: '1px 2px', backgroundColor: '#f9f9f9' })).add(flow);
  return { panel: panel, buttons: buttons, flowPanel: flow };
};

// ---------------------------------------------------------------------------
// Estilos de check/botão
// ---------------------------------------------------------------------------
exports.styleCheck = function (chk, active) {
  chk.style().set('border', active ? '1px solid #1a73e8' : '1px solid #cccccc');
  chk.style().set('backgroundColor', active ? '#e8f0fe' : '#ffffff');
};
exports.syncCheckBorder = function (chk) {
  exports.styleCheck(chk, chk.getValue());
};
exports.styleToggleButton = function (btn, active) {
  btn.style().set('backgroundColor', active ? '#e8f0fe' : '#ffffff');
  btn.style().set('border', active ? '1px solid #1a73e8'
    : '1px solid rgba(0,0,0,0)');
  btn.style().set('color', active ? '#1a73e8' : '#333');
};

// ---------------------------------------------------------------------------
// Legenda (cor + rótulo)
// ---------------------------------------------------------------------------
exports.legendPanel = function (entries, opts) {
  opts = opts || {};
  var p = ui.Panel({ style: { maxHeight: opts.maxHeight || '200px',
    margin: '0px', padding: '0px' } });
  (entries || []).forEach(function (e) {
    var sw = ui.Label('', { backgroundColor: e.color, width: '12px',
      height: '12px', margin: '0 4px 0 0', padding: '0' });
    p.add(ui.Panel([sw, ui.Label(e.label, { fontSize: '11px', margin: '0' })],
      ui.Panel.Layout.flow('horizontal'), { margin: '0', padding: '0' }));
  });
  return p;
};

// ---------------------------------------------------------------------------
// Botão toggle verde/vermelho (MAP ON/OFF, THUMBNAILS ON/OFF)
// ---------------------------------------------------------------------------
exports.applyToggleStyle = function (btn, on) {
  btn.style().set({
    backgroundColor: on ? '#2e7d32' : '#c62828',
    border: on ? '1px solid #1b5e20' : '1px solid #b71c1c',
    color: '#ffffff'
  });
};

// ---------------------------------------------------------------------------
// Layout em SplitPanel (controles | mapa | painel direito)
// ---------------------------------------------------------------------------
exports.createSplitLayout = function (o) {
  o = o || {};
  var right = o.right;
  right.style().set({ width: o.width || '460px', shown: !!o.shown });
  var mapWidget = o.mapWidget || ui.root.widgets().get(0);
  ui.root.remove(mapWidget);
  ui.root.insert(1, ui.SplitPanel({
    firstPanel: mapWidget,
    secondPanel: right,
    orientation: 'horizontal'
  }));
  return {
    right: right,
    showRight: function (b) { right.style().set('shown', !!b); }
  };
};

// ---------------------------------------------------------------------------
// Grade de miniaturas (genérica, N eixos, do mais externo ao mais interno)
// ---------------------------------------------------------------------------
exports.createThumbnailGrid = function (o) {
  o = o || {};
  var values = o.values || {};
  var cellFor = o.cellFor;
  var axisLabels = o.axisLabels || {};
  var axes = (o.axes || []).slice();
  var dimensions = o.dimensions || 180;
  var cssSize = o.cssSize || 180;
  var cache = {};
  var cachedDim = -1;

  function axisLabel(id) { return axisLabels[id] || id; }
  function labelOf(v) {
    return (v && v.label !== undefined) ? v.label : String(v);
  }
  function idOf(v) {
    return (v && v.id !== undefined) ? v.id : String(v);
  }
  function clone(o2) {
    var r = {}; Object.keys(o2).forEach(function (k) { r[k] = o2[k]; }); return r;
  }
  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    var out = [];
    arr.forEach(function (x, i) {
      permutations(arr.slice(0, i).concat(arr.slice(i + 1)))
        .forEach(function (p) { out.push([x].concat(p)); });
    });
    return out;
  }
  function emptyVis() {
    return ee.Image(0).rename(['vis-red', 'vis-green', 'vis-blue'])
      .selfMask().int8();
  }
  function visualized(cfg) {
    try { return cfg.image.visualize(cfg.vis); } catch (e) { return emptyVis(); }
  }

  // ---- Controles ----
  var dimSelect = ui.Select({
    items: ['180', '360', '512', '720', '1024'],
    value: String(dimensions),
    style: { margin: '1px 3px', fontSize: '10px' },
    onChange: function (v) { dimensions = parseInt(v, 10); update(); }
  });
  var sizeSelect = ui.Select({
    items: ['120', '180', '240', '360', '512', '720', '1024'],
    value: String(cssSize),
    style: { margin: '1px 3px', fontSize: '10px' },
    onChange: function (v) { cssSize = parseInt(v, 10); applySize(); }
  });
  var layoutOptions = permutations(axes);
  var layoutLabels = layoutOptions.map(function (p) {
    return p.map(axisLabel).join(' \u00D7 ');
  });
  var layoutSelect = ui.Select({
    items: layoutLabels,
    value: layoutLabels[0],
    style: { margin: '1px 3px', fontSize: '10px' },
    onChange: function (v) {
      var i = layoutLabels.indexOf(v);
      if (i >= 0) { axes = layoutOptions[i].slice(); update(); }
    }
  });
  var invertBtn = ui.Button({
    label: '\u27F7 Inverter',
    style: { margin: '1px 3px', padding: '1px 4px', fontSize: '10px' },
    onClick: function () {
      axes = axes.slice().reverse();
      var lbl = axes.map(axisLabel).join(' \u00D7 ');
      if (layoutLabels.indexOf(lbl) >= 0) layoutSelect.setValue(lbl, false);
      update();
    }
  });
  var clearBtn = ui.Button({
    label: 'Limpar memoria',
    style: { margin: '1px 3px', padding: '1px 4px', fontSize: '10px' },
    onClick: function () { cache = {}; update(); }
  });

  var ctrlStyle = { margin: '1px 2px', fontSize: '9px', padding: '0px' };
  var controls = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: { margin: '0px', padding: '1px', backgroundColor: '#f5f5f5',
      border: '1px solid #ddd' }
  });
  var line1 = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal', true),
    style: { margin: '0px', padding: '1px', backgroundColor: '#f5f5f5' } });
  line1.add(ui.Label('Dimensao:', ctrlStyle)).add(dimSelect)
    .add(ui.Label('Tamanho:', ctrlStyle)).add(sizeSelect);
  var line2 = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal', true),
    style: { margin: '0px', padding: '1px', backgroundColor: '#f5f5f5' } });
  line2.add(ui.Label('Grid:', ctrlStyle)).add(layoutSelect).add(invertBtn);
  var line3 = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal', true),
    style: { margin: '0px', padding: '1px', backgroundColor: '#f5f5f5' } });
  line3.add(clearBtn);
  controls.add(line1).add(line2).add(line3);

  var body = ui.Panel({ style: { margin: '0px', padding: '2px' } });
  var panel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
    style: { margin: '0px', padding: '0px' } });
  panel.add(controls).add(body);

  // ---- Render ----
  function applySize() {
    var w = cssSize + 'px';
    Object.keys(cache).forEach(function (k) {
      try { if (cache[k]) cache[k].style().set({ width: w }); } catch (e) {}
    });
  }

  function cellPanel(vals) {
    var cfg = cellFor(vals);
    var key = axes.map(function (a) { return idOf(vals[a]); })
      .join('_').replace(/ /g, '_');
    var cell = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
      style: { margin: '1px', padding: '0px', border: '1px solid #ddd',
        backgroundColor: '#fefefe' } });
    cell.add(ui.Label(cfg.label || '', { fontSize: '9px', fontWeight: 'bold',
      textAlign: 'center', margin: '1px', padding: '1px',
      backgroundColor: '#e8e8e8', color: '#444', stretch: 'horizontal' }));
    var thumb = ui.Thumbnail(visualized(cfg), {
      dimensions: dimensions, region: cfg.bounds });
    if (thumb) {
      try { thumb.style().set({ width: cssSize + 'px' }); } catch (e) {}
      cell.add(thumb);
      cache[key] = thumb;
      thumb.onClick(function () {
        try { thumb.setImage(visualized(cellFor(vals))); } catch (e) {}
      });
    }
    return cell;
  }

  function renderLevel(level, prefix, container) {
    var axis = axes[level];
    var items = values[axis] || [];
    if (level === axes.length - 1) {
      var row = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal', true),
        style: { margin: '0px', padding: '0px' } });
      items.forEach(function (item) {
        var vals = clone(prefix); vals[axis] = item;
        row.add(cellPanel(vals));
      });
      container.add(row);
      return;
    }
    items.forEach(function (item) {
      var vals = clone(prefix); vals[axis] = item;
      var block = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'),
        style: { margin: '3px 2px', border: '1px solid #aaa', padding: '2px',
          backgroundColor: '#fefefe' } });
      block.add(ui.Label(axisLabel(axis) + ': ' + labelOf(item),
        { fontSize: '11px', fontWeight: 'bold', margin: '2px', padding: '2px',
          color: '#222', backgroundColor: '#e8e8e8', stretch: 'horizontal' }));
      renderLevel(level + 1, vals, block);
      container.add(block);
    });
  }

  function update() {
    if (dimensions !== cachedDim) { cache = {}; cachedDim = dimensions; }
    body.clear();
    if (!axes.length || !cellFor) return;
    var empty = axes.some(function (a) {
      return !(values[a] && values[a].length);
    });
    if (empty) {
      body.add(ui.Label('Marque ao menos uma camada e um territorio.',
        { fontSize: '11px', color: '#888', margin: '10px' }));
      return;
    }
    renderLevel(0, {}, body);
  }

  return { panel: panel, body: body, controls: controls, update: update };
};
