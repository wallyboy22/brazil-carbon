# cells_for_collab_notebook

> Células do Google Colab (`.py`) para a **análise de escritório** das
> estatísticas do MAPBIOMAS-CARBONO. As estatísticas são computadas **no GEE**
> (`toolkits/statistics/v00/run/`) e apenas **lidas** aqui — sem Earth Engine
> (exceto a etapa opcional `16_maps`).

## Como usar
Cada arquivo `.py` é **uma célula**: cole o conteúdo (ou use `%run '<caminho>'`).
Rode **na ordem**. O modelo é **sem imports próprios**: as etapas compartilham o
namespace, então a biblioteca (`00`–`06`) precisa rodar antes das etapas.

## Estrutura

**Biblioteca** (rode uma vez, em ordem):
| Arquivo | Papel |
|---|---|
| `00_config.py` | `CONF`, paths (`csv_dir/fig_dir/out_dir`), cores, `manifest`, `save_fig/write_artifact` |
| `01_legends.py` | Legenda LULC Coleção 11 + `def_sec`; `info/natureza/marcador` |
| `02_schema.py` | `GRAPH_COLS`/`REF_COL_MAP`, `_remap_products/_remap_refs`, `_read` |
| `03_loaders.py` | `load_forest` / `load_grassland` / `check_presence` (tabelas longas) |
| `04_qa.py` | `qa_somas` / `qa_defsec` / `qa_territorios` |
| `05_aggregations.py` | `por_classe`, pivôs, `build_compare_*`, `add_data_col` |
| `06_references.py` | mapa das famílias de referência + `load_references_csv` + T1/T2 |

**Etapas**:
| Arquivo | O que faz | Artefatos (OUT_DIR/FIG_DIR) |
|---|---|---|
| `10_auth_drive.py` | monta o Drive e configura `CONF` | — |
| `11_consolidate.py` | consolida forest+grassland (LONGO) e QA | `consolidado_forest_2023.csv`, `consolidado_grassland_2023.csv` |
| `12_join_largo.py` | join largo (forest+grassland+refs) | `consolidado_largo_2023.csv` |
| `13_figures.py` | figuras (por classe/marcador/versão/produto) | `f1..f5_*.png` |
| `14_report.py` | relatório XLSX + resumo `.md` | `resumo_pantanal_2023.xlsx/.md` |
| `15_references.py` | cruzes T1/T2 com as referências | `tabela_cross_2023.csv`, `tabela_melhor_ano_referencia_2023.csv`, `resumo_referencia_2023.md` |
| `16_maps.py` (opcional) | mapas de médias (EE) | `mapa_*.png` |

> `merge_and_analisys.ipynb` é o notebook montado com estas células na ordem.

## Schema dos CSVs do GEE (formato "gráfico-ready")
Os drivers (`run/run_pantanal.js`, `run/run_references.js`) exportam **UMA linha
por COMBINAÇÃO (classe LULC × def_sec)**, com colunas prontas para gráfico.
O território é definido pelo **ESCOPO** (`TERRITORY_SCOPE`), que entra como
sufixo `_<escopo>_` no nome do arquivo:
- `bioma_uf` (default) — cruza bioma × UF (`Bioma`, `UF`, `Unidade Federativa`);
- `bioma` — só `Bioma`; `uf` — só `UF`/`Unidade Federativa`;
- custom (`bap`, `bap_planalto`, `bap_pantanal`, `matopiba`) — sem coluna de
  território (o nome do arquivo carrega a região).
Todas as tabelas têm `ecossistema` (`florestal` | `campestre` | `referencia`).

> **Nomes:** `stats_forest_<escopo>_<ano>.csv`,
> `stats_grassland_<v>_<escopo>_<ano>.csv`,
> `stats_references_<grupo>_<escopo>_<ano>.csv`. Os loaders filtram pelo
> `TERRITORY_SCOPE` de `00_config.py`.

As colunas de valor seguem `<Material> <compartimento> (<unidade>)`, com `*`
quando a métrica é derivada **no estágio de estatística** (ex.: AGB→C):
- **forest** (LARGO) — `ecossistema, Bioma, UF, Unidade Federativa, classe,
  cobertura (n0..n4), Desmatamento e vegetação secundária, ano_lulc, Área (ha)`
  + por versão: `v0X Biomassa acima do solo (t MS)`,
  `v0X Carbono acima do solo (t C)*`, `v0X Incerteza (t MS)`,
  `v0X Incerteza (t C)*`.
- **grassland** (separado por versão) — `ecossistema, produto, versao, ano,
  Bioma, UF, Unidade Federativa, classe, cobertura (n0..n4), Desmatamento e
  vegetação secundária, Área (ha), Biomassa acima do solo (t MS),
  Carbono acima do solo (t C)` + mensais com `período` (`YYYY_MM`:
  `Biomassa acima do solo (t MS)` e `Produtividade primária líquida acima do
  solo (t MS/ano)`).
- **references** (1 CSV por FAMÍLIA) — `ecossistema, Bioma, UF, Unidade
  Federativa, classe, cobertura (n0..n4), Desmatamento e vegetação secundária,
  ano_lulc, Área (ha)` + as métricas da família (`Biomassa acima do solo
  (t MS)`, `Carbono acima do solo (t C)*`, `Carbono acima do solo (t C)`,
  `Biomassa abaixo do solo (t MS)`, `Carbono abaixo do solo (t C)`,
  `Carbono na madeira morta (t C)`, `Carbono na serrapilheira (t C)`,
  `Carbono vivo (t C)`, `Carbono total (t C)`, `Incerteza (t C)`).

## Coluna `data` (Looker Studio)
As tabelas consolidadas ganham uma coluna **`data`** em ISO `YYYY-MM-DD`
(`add_data_col`): linhas mensais → `YYYY-MM-01`; anuais → `YYYY-01-01`. Serve
como dimensão de data no Looker Studio.

## Configuração (`CONF`, em `00_config.py`)
`DRIVE_ROOT` (a 10_auth_drive preenche), `CSV_DIR`, `FIG_DIR`, `OUT_DIR`,
`YEAR`, `TERRITORY_SCOPE`, `FOREST_VERSIONS`, `GRASSLAND_REF_VERSION`,
`CARBON_FRACTION`, `REF_MIN_VALID`, `REF_TERRITORIO`, `FAZER_MAPAS`, `GRID_M`,
`MAP_FOREST_VERSION`.

## Nomenclatura de bandas
Recomendações (inglês) em `COLLECTION_00/docs/BAND_NAMING.md`.
