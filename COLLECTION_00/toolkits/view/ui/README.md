# toolkit view/ui — Sistema de UI reutilizável

Componentes de UI (mesmo **design do toolkit de referência**, MapBiomas Fogo)
para qualquer app do `toolkits/view`. Genérico e sem conhecimento de domínio.

## Módulos
| Módulo | Papel |
|---|---|
| `module_icons.js` | Ícones do pacote MapBiomas (`users/workspaceipam/packages:mapbiomas-toolkit/utils/b64`) de forma **agnóstica**, com fallback textual |
| `module_ui.js` | `styles`, `createAppShell`, `createActivity`, `createCabinet`, `createLayerDrawer`, `createButtonDrawer`, `styleCheck`, `syncCheckBorder`, `styleToggleButton`, `applyToggleStyle`, `legendPanel`, `colorBarLegend`, `rampColors`, `createSplitLayout`, `createThumbnailGrid` |
| `module_map_layers.js` | Gestão de camadas no `Map` sem duplicação: `manager()` → `update/remove/clear/setAllShown/getIds/debounced` |

## Uso (num app)
```js
var UI = require('.../toolkits/view/ui/module_ui.js');
var ML = require('.../toolkits/view/ui/module_map_layers.js');

var shell = UI.createAppShell({ title: 'Meu app' });
var activity = UI.createActivity(shell.activity);
var mlayers = ML.manager(Map);

var cab = UI.createCabinet({ title: 'SEÇÃO', isOpen: true });
shell.body.add(cab.panel);

var drawer = UI.createLayerDrawer({ title: 'camadas', options: [
  { id: 'a', label: 'Camada A', onChange: function (v) { /* ... */ } }
]});
cab.content.add(drawer.panel);

mlayers.update('a', ee.Image(...), { min: 0, max: 1 }, 'Camada A', 0.85);
```

## Split + grade de miniaturas
```js
// Painel direito com miniaturas cruzando eixos (do mais externo ao mais interno).
var values = { camada: [], territorio: [] };
var grid = UI.createThumbnailGrid({
  axes: ['camada', 'territorio'],
  axisLabels: { camada: 'Camada', territorio: 'Território' },
  values: values,
  cellFor: function (vals) {                 // vals = { camada:{id,label}, ... }
    return { image: ee.Image(...), vis: {...}, bounds: geom, label: '...' };
  }
});
var split = UI.createSplitLayout({ mapWidget: shell.mapWidget, right: grid.panel });
split.showRight(true);                        // mostrar/esconder o painel
values.camada = [{ id: 'x', label: 'X' }];    // eixos são mutáveis
grid.update();                                // redesenha a grade

UI.applyToggleStyle(btn, true);               // verde ON / vermelho OFF
mlayers.setAllShown(true);                    // MAP ON/OFF
```

## Legenda de rampa de cor
```js
// Barra contínua interpolada da paleta + extremos + unidade.
var bar = UI.colorBarLegend({
  title: 'Forest v07', unit: 't/ha', min: 0, max: 75,
  palette: ['#d73027', '#fc8d59', '#fee08b', '#d9ef8b', '#91cf60', '#1a9850']
});
cab.content.add(bar);
UI.rampColors(palette, 40);                   // ['#..', ...] interpolado
```

## Convenções
- **Sem logo** (o shell mostra só o título + atividade).
- Ícones: sempre via `module_icons` (nunca require direto do pacote no app).
- O app não recria componentes — só compõe cabinets/drawers e pluga a lógica.
