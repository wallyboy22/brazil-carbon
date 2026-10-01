# toolkit view/v01 — QA visual (MapBiomas Carbono) · **sem ninho de requires**

App interativo (GEE Code Editor) para **QA visual** das camadas do projeto, com os
**mesmos recursos da v00**, mas com todo o código de dados + engine + app em **um
único arquivo** (`run_view.js`). A única coisa que vem por `require` é a **UI
reutilizável**, compartilhada com a v00.

## Por que a v01 existe

Na v00, adicionar ou remover uma camada significava editar vários módulos de
catálogo encadeados por `require` (`contracts/00_catalog_*`, `engine/*`), e era
fácil errar um nome de grupo ou esquecer de atualizar um `require`. Na v01 **não
existe esse ninho**:

- Toda camada mora na **lista `LAYERS`**, no topo do arquivo.
- Adicionar camada = **adicionar um objeto na lista**.
- Remover camada = **apagar a linha**.
- Não é preciso mexer em nenhum outro arquivo nem em nenhum `require`.

## Uso

Rodar `run_view.js` no Code Editor. O painel esquerdo permite:

- **TERRITÓRIO**: Bioma / UF / Região (BAP, Matopiba) / Brasil + seleção de
  regiões (vazio = Brasil);
- **MapBiomas Carbono** (gavetas): Cerrado Florestal · Pantanal Florestal ·
  Pantanal Campestre · NPP · AGB IFN+EBA;
- **Referência** (gavetas): uma por fonte (Saatchi, Baccini, Zimbres, Avitabile,
  Xu & Saatchi, TCN, QCN, QCN-r, **IFN**);
- **Auxiliares** (gavetas): Uso e Cobertura (C11) · MapBiomas Pastagem ·
  MapBiomas Solo;
- **LEGENDAS**: opacidade, barras de cor por rampa (com **Mín/Máx editável em
  cada barra**) e a legenda do Uso e Cobertura (C11) (quando ligado).

Cada barra de cor tem caixas de **Mín** e **Máx** no lugar das labels dos
extremos: digite e confirme (Enter) para ajustar a faixa daquela rampa; **apagar
a caixa** restaura o valor padrão. Como a barra é deduplicada por rampa, o ajuste
vale para **todas** as camadas que compartilham aquela rampa (ex.: uma única
barra `VIS_AREA` cobre Cerrado/Pantanal/NPP/MapBiomas).

No cabinet **CONTROLES** há os toggles **MAP ON/OFF**, **THUMBNAILS ON/OFF** e
**INSPECTOR ON/OFF** (a grade de miniaturas cruza **camada × território**).

Camadas cujo asset ainda **não existe** (ex.: `v08 GEDI/IFN`) são **ignoradas**
automaticamente — o app só lista o que existe.

## Módulo INSPECTOR

Com **INSPECTOR ON**, o cursor vira crosshair e cada clique no mapa mostra, num
painel no canto superior direito, o **valor do pixel para cada camada ligada**
(mesma máscara do mapa → clique mostra o que está visível). Quando as **3 camadas
AGB IFN+EBA** estão ligadas, acrescenta um bloco com **AGB**, **IC90**
(`[ic_inf, ic_sup]`), **± meia_largura** e **CV** (incerteza relativa).

## AGB IFN+EBA (Brasil, gaveta sob MapBiomas Carbono)

Coleção `projects/ee-redd-brazil/assets/AGB_IFNEBA_ic_v1` (prop. `ano`). No app só
há **2024**, então **não há seletor de ano** — cada camada fixa `year` (camadas
podem ter anos diferentes entre si).

| Camada | Banda | Unidade | Rampa |
|---|---|---|---|
| AGB (2024) | `AGB_Mg_ha` | t/ha | `VIS_AREA` |
| Incerteza IC90 (2024) | `meia_largura` | t/ha | `VIS_ERR` |
| Incerteza relativa (2024) | derivada `meia_largura / AGB_Mg_ha.max(1)` | — (CV) | `VIS_CV` |

> O script de referência do autor está em
> `../references/toolkit_agb_ifneba_brasil.js` (verbatim; usa `.clip`, só para
> exibição — o app usa máscara `paint(...).eq(0)`).

## NPP (Pampa)

Iniciativa de NPP do Pampa — banda única `carbono_campo`, em **t C/ha**, rampa
`VIS_NPP` (viridis, **0–2**):

- `NPP 2025` → `pampa_carbono_max_quente_2025`
- `NPP 2024` → `cerrado_carbono_max_quente_2024`

## Como adicionar uma camada

1. Abra `run_view.js` e vá em **PARTE 6 · REGISTRY DE CAMADAS**.
2. Adicione um objeto à lista `LAYERS` (copie um existente e mude o asset/banda):

```js
LAYERS.push({ id: 'res_forest_v09', grupo: 'pantanal_florestal',
  nome: 'Pantanal Forest v09', tipo: 'resultado',
  col: FOREST_BASE + '/V09/PREDICTIONS/COL', band: 'prediction_2023',
  year: 2023, unit: 't/ha', vis: VIS_AREA });
```

3. Certifique-se de que o `grupo` existe em **PARTE 7 · GRUPOS** (se for um grupo
   novo, inclua `{ id: ..., label: ... }` na lista de grupos correspondente —
   `GRUPOS_RESULTADO`, `GRUPOS_REFERENCIA` ou `GRUPOS_AUXILIAR`).

Para resultados do **Forest** há um atalho `addForest('v09', 'v09', FOREST_BASE +
'/V09');`. Para referências use o helper `addRef({...})`; para o IFN, `addIfn(...)`.

## Campos de uma camada

| Campo | Significado |
|---|---|
| `id` | identificador único (usado nos toggles) |
| `nome` | rótulo exibido na gaveta e no mapa |
| `tipo` | `resultado` · `referencia` · `lulc` · `auxiliar` |
| `grupo` | chave da gaveta (ver PARTE 7) |
| `asset` **ou** `col` | asset de imagem, ou ImageCollection (`col` + `year`) |
| `paint` | `{fc, prop}` para rasterizar uma FC numa banda (IFN) |
| `band` | banda a selecionar (em séries use `multi_year`) |
| `derived` | string de expressão (bandas do mosaico) p/ gerar a banda (ex.: CV) |
| `yearProp` | propriedade de ano da coleção (padrão `year`; ex.: `ano`) |
| `multi_year` | `{start, end}` → usa a última banda da série |
| `nodata_le` | mascara valores ≤ este número (sentinelas -1e30, etc.) |
| `unit` / `vis` | unidade e rampa de cor |

## Estrutura do `run_view.js`

```
PARTE 1 · VIS                  rampas compartilhadas (AREA, ERR)
PARTE 2 · LIMITES              assets IBGE (biomas, UFs) + props de nome
PARTE 3 · TERRITÓRIOS          níveis da UI (bioma/uf/região/brasil)
PARTE 4 · USO E COBERTURA      MapBiomas C11 (asset, legenda, vis)
PARTE 5 · PRODUTOS/REFERÊNCIAS endereços base + auxiliares MapBiomas + IFN
PARTE 6 · REGISTRY DE CAMADAS  >>> ADICIONE/REMOVA CAMADAS AQUI <<<
PARTE 7 · GRUPOS               ordem + rótulos das gavetas
PARTE 8 · ENGINE               assetExists, buildImage, masked, região
PARTE 9 · APP (UI)             corpo interativo + módulo INSPECTOR
```

## Notas

- **Quantidade por área** (t/ha, t C/ha, t CO2e/ha — resultados, referências
  e auxiliares) usa a **mesma rampa** `VIS_AREA` (0–300) para comparação direta;
  incerteza usa `VIS_ERR` (0–60), incerteza relativa `VIS_CV` (0–0,6) e o NPP uma
  rampa própria `VIS_NPP` (viridis, 0–2). O Mín/Máx de cada barra sobrescreve a
  faixa padrão daquela rampa.
- **Regra de ouro** (AGENTS.md): nunca `.clip` — máscara via `paint(fc).eq(0)`.
- Os **requires** são só os dois da UI (`ui/module_ui.js`, `ui/module_map_layers.js`),
  compartilhados com a v00 — se a UI evoluir, a v01 acompanha. Os ícones são
  resolvidos dentro de `module_ui`.
- A barra de cor com **Mín/Máx editável** é **local** (`colorBarEditavel`, no
  `run_view.js`), usando só `UI.rampColors` — assim funciona mesmo com o
  `module_ui.js` original; o `colorBarLegend` compartilhado segue igual (v00).
- Diferente da v00, aqui **não há serialização de `require`**, então a identidade
  dos objetos é preservada; o app compara camadas por `id` mesmo assim (robusto).
- A v00 (`view/v00/`) segue intacta e independente — inclusive o `run_simple.js`.