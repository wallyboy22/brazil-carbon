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
                                           engine.runAllReferences()   → 1 CSV por REF × BIOMA
                                                                         (19 refs × 6 biomas = 114 arquivos)
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

- `stats_references_<ref_id>_<slug_bioma>_2023.csv` — **1 arquivo por ref ×
  bioma**. Colunas (todas as refs):

  ```
  fonte, ref_id, territorio, classe, n0, n1, n2, n3, n4, natureza, marcador,
  ano_lulc, ano, area_ha, <pool>_tC | <pool>_tB, incerteza_tC,
  area_mod0..7_ha, <pool>_mod0..7_tC | _tB
  ```

  O export usa `selectors` → **sem `.geometry`/`system:index`** no CSV.

- Séries multi-ano (Xu 2000–2019) combinam **todos os anos num único CSV**,
  com a coluna `ano` distinguindo as linhas.

## Unidades e magnitude — marcador NO NOME da coluna

| magnitude | coluna nativa | observação |
|---|---|---|
| `carbono` | `<pool>_tC` (t C) | banda já em t C/ha |
| `biomassa` | `<pool>_tB` (t de biomassa) **e** `<pool>_tC` (= × `CARBON_FRACTION`) | as duas sempre presentes |
| `incerteza` | `incerteza_tC` | erro da ref (saatchi_carbon_error) |

Regra do comparador comum: **todo ref de estoque tem ≥1 coluna `*_tC`** —
garantida por construção. Refs só-biomassa emitem `<pool>_tB` (nativa, t) e
`<pool>_tC` (convertida com `CARBON_FRACTION = 0.47`). Não há colunas
redundantes de magnitude/unidade — a informação está no sufixo (`tC`/`tB`).

## Fórmulas

- `area_ha` = `pixelArea()/10000`, mascarado **só pelo LULC** (área sempre
  informativa);
- `<pool>_tC|_tB` = `banda (t/ha ou t C/ha) × pixelArea()/10000 × fator`, nos
  pixels LULC × ref válidos;
- `area_mod{X}_ha` / `<pool>_mod{X}_tC|_tB` para `X ∈ 0..7`
  (`DEF_SEC_VEG_LEGEND`) com `def_sec.unmask(0)` ⇒ `Σ área_mod0..7 = área_ha`.

## Como rodar

1. No Code Editor, abra `references/statistics/7_references.js` e rode
   `engine.runAllReferences()` (114 CSVs) — ou subconjuntos:
   - `engine.runAllReferences({ ref_ids: ['qcnr_total'] })`
   - `engine.runAllReferences({ biomes: ['pantanal'] })`
2. Autorize as exportações para `MAPBIOMAS_CARBONO_ESTATISTICAS`.
3. No Colab (`statistics_gcn`), `cell00` → `cell01` (Drive) → `cell02`
   (consolida + QA) → `cell06` lê os `stats_references_*` via
   `load_references_csv()` e monta T1 (cross 2023) + T2 (melhor ano).

> Detalhe de sincronização: o catálogo GEE (contrato) e o `REF_CATALOG` do
> Colab são espelhos — `ref_id` é a chave de junção (`REF_BY_ID`).