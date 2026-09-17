# Referências — Estatísticas (módulo `require`)

Estatísticas dos **mapas de REFERÊNCIA** de biomassa/carbono (benchmarks
publicados — Saatchi, Baccini, Avitabile, Xu & Saatchi, TCN, QCN —, o catálogo
CCAL espelhado em `docs/Referencias - Mapas de referencia (biomassa e
carbono).md`) por classe de uso e cobertura (MapBiomas **Coleção 11**), para
todos os biomas do Brasil (IBGE 2026), estrato LULC **2023**.

Esta pasta é uma **biblioteca `require`** — não roda sozinha. O fluxo de
referência do projeto (validação) dispara:

```
references/statistics/7_references.js  →  require('...:COLLECTION_00/references/statistics/references_engine.js')
                                           engine.runAllReferences()   → 1 CSV por REF (19 arquivos)
                                                                         com os 6 biomas combinados
```

> O **consumo é OFFLINE no Colab** (`statistics_gcn` → cell06): o notebook lê
> apenas os CSVs exportados pelo GEE — **não autentica nem usa Earth Engine**.

## Arquivos

| Arquivo | Papel |
|---|---|
| `0_contract_references.js` | Contrato: catálogo (19 refs), biomas, LULC, saída |
| `references_engine.js` | Motor: `runAllReferences(opts?)` + QA de somas |
| `7_references.js` | Step: `engine.runAllReferences()` (ou filtros ad-hoc) |

A **legenda C11** é o módulo compartilhado
`COLLECTION_00/pantanal/module_lulc_legends.js` (n0/n1/n2/**n3/n4** + marcador
florestal/campestre + `DEF_SEC_ASSET`).

## Entradas (assets GEE)

- Mapas de referência: `ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps` (e
  `CCAL/public/qcn`), conforme o catálogo do contrato.
- LULC: `.../collection11/mapbiomas_brazil_collection11_coverage_v3`, banda
  `classification_2023`.
- Biomas: `ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026` (`Bioma`).

## Saídas (Drive → `MAPBIOMAS_CARBONO_ESTATISTICAS`)

- `stats_references_<ref_id>_2023.csv` — **1 arquivo por ref**, com as linhas
  de **todos os 6 biomas** (a coluna `territorio` distingue cada um). **UMA
  linha por COMBINAÇÃO (classe LULC × def_sec)**, sem agregações. Colunas
  (formato "gráfico-ready"):

  ```
  fonte, ref_id, territorio, classe, cobertura (n0..n4),
  Desmatamento e vegetação secundária, ano_lulc, ano, Área (ha),
  <pool> (t C) | <pool> (t MS), [Incerteza (t C)]
  ```

  O export usa `selectors` → **sem `.geometry`/`system:index`** no CSV.

- Séries multi-ano (Xu 2000–2019) combinam **todos os anos num único CSV**,
  com a coluna `ano` distinguindo as linhas.

## Unidades e magnitude — marcador NO NOME da coluna

| magnitude | coluna nativa | observação |
|---|---|---|
| `carbono` | `<pool> (t C)` (t C) | banda já em t C/ha |
| `biomassa` | `<pool> (t MS)` (t de biomassa) **e** `<pool> (t C)` (= × `CARBON_FRACTION`) | as duas sempre presentes |
| `incerteza` | `Incerteza (t C)` | erro da ref (saatchi_carbon_error) |

Regra do comparador comum: **todo ref de estoque tem ≥1 coluna `(t C)`** —
garantida por construção. Refs só-biomassa emitem `<pool> (t MS)` (nativa, t)
e `<pool> (t C)` (convertida com `CARBON_FRACTION = 0.47`). A unidade sai no
RÓTULO da coluna (`t C` vs `t MS`) — não há redundância de outra coluna.

## Fórmulas

- `Área (ha)` = `pixelArea()/10000`, mascarado **só pelo LULC** (área sempre
  informativa);
- `<pool> (t C|t MS)` = `banda (t/ha ou t C/ha) × pixelArea()/10000 × fator`,
  nos pixels LULC × ref válidos;
- agrupamento por combinação `combo = lulc * 10 + def_sec`
  (`module_lulc_legends :: comboEncode/comboDecode`) — a estratificação
  def_sec sai num **rótulo** (`Desmatamento e vegetação secundária`), sem
  colunas `mod`.

## Como rodar

1. No Code Editor, abra `references/statistics/7_references.js` e rode
   `engine.runAllReferences()` (19 CSVs) — ou subconjuntos:
   - `engine.runAllReferences({ ref_ids: ['qcnr_total'] })`
   - `engine.runAllReferences({ biomes: ['pantanal'] })`
2. Autorize as exportações para `MAPBIOMAS_CARBONO_ESTATISTICAS`.
3. No Colab (`statistics_gcn`), `cell00` → `cell01` (Drive) → `cell02`
   (consolida + QA) → `cell06` lê os `stats_references_*` via
   `load_references_csv()` e monta T1 (cross 2023) + T2 (melhor ano).

> Detalhe de sincronização: o catálogo GEE (contrato) e o `REF_CATALOG` do
> Colab são espelhos — `ref_id` é a chave de junção (`REF_BY_ID`).