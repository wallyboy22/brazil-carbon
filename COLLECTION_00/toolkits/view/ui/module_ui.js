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
 *   styleCheck / syncCheckBorder / styleToggleButton
 *   legendPanel(entries)           — legenda (cor + rótulo)
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
    activity: activity };
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
