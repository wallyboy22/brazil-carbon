# Pantanal · Estatísticas — análise de escritório (`statistics_gcn`)

**gcn = google collab notebook.** Cada `2_3_N_statistics_cellNN_*.py` é **uma célula
de um Colab qualquer**: abra um notebook, e em cada célula cole o conteúdo do
`.py` (ou use `%run '<caminho_do_py>'` apontando para o arquivo no Drive).

Seguindo o esquema do gate `v08/2_3_gcn`: **não há script de utilidade** —
a `2_3_0_statistics_cell00_util.py` é uma célula **normal**, que é *rodada*
(executada) para carregar `CONF`, as funções e a estrutura de referência no
namespace do runtime; as demais células chamam direto (sem `import` de módulo
próprio).

Diferente do gate `v07/2_3_gcn`, este notebook é **compartilhado entre as duas
cadeias** (forest + grassland) e **não recomputa** estatísticas no Earth
Engine: ele consome os CSVs exportados pelos steps `7_statistics.js`.

## Regra de ouro

Os CSVs são gerados **no GEE** (steps nas versões). Este notebook só LÊ e
analisa. Se faltar arquivo, a `cell02` indica qual step rodar:

| Cadeia | Step no GEE |
|---|---|
| Pantanal Forest V03–V08 | `forest/v0X/7_statistics.js` (1 CSV por versão) |
| Pantanal Grassland v01 | `grassland/v01/7_statistics.js` |
| Pantanal Grassland v02 | `grassland/v02/7_statistics.js` |

> Os comparativos entre versões (forest) e entre produtos (grassland, ref. v02)
> são montados **offline** por este notebook (`build_compare_forest` /
> `build_compare_grassland`), a partir dos CSVs consolidados.

Depois, faça download/export dos CSVs para a pasta
`DRIVE_ROOT/estatisticas/`.

## Fluxo de execução (ordem)

| Ordem | Arquivo | O que faz | Artefatos gerados |
|------|---------|-----------|-------------------|
| 1 | `2_3_0_statistics_cell00_util.py` | carrega CONF + funções + catálogo de referências no namespace (rodar SEMPRE primeiro) | (namespace) |
| 2 | `2_3_1_statistics_cell01_autentication_drive.py` | monta o Google Drive e configura `CONF["DRIVE_ROOT"]` (NÃO autentica Earth Engine) | — |
| 3 | `2_3_2_statistics_cell02_consolidar_qa.py` | checa arquivos esperados, consolida forest/grassland, QA de somas (n0=n1=total), exporta consolidados | `consolidado_{forest,grassland}_2023.csv` |
| 4 | `2_3_3_statistics_cell03_graficos.py` | figuras: estoque por classe/marcador/versão (forest) e por produto (grassland) | `f1..f5_*.png` |
| 5 | `2_3_4_statistics_cell04_relatorio.py` | relatório XLSX (abas n0/n1/marcador/total/comparativo por versão e produto) + resumo .md | `resumo_pantanal_2023.xlsx` + `.md` |
| 6 | `2_3_5_statistics_cell05_mapas.py` (OPCIONAL) | mapas de AGC v07 e campestre por grade 10 km — só se `CONF["FAZER_MAPAS"]=True` | `mapa_*.png` |
| 7 | `2_3_6_statistics_cell06_referencia.py` | lê os CSVs de referência (exportados pelo GEE), cruzamento T1 cross 2023 + T2 melhor ano por classe + resumo | `tabela_cross_2023.csv`, `tabela_melhor_ano_referencia_2023.csv`, `resumo_referencia_2023.md` |

> **Esquema de runtime:** rodar `cell00` primeiro; os demais `.py` assumem que
> `CONF`, `pd`, `fig_dir/out_dir/manifest`, a legenda C11 e o catálogo
> `REF_CATALOG` (com `cross_2023`, `best_reference_year`, …) já estão no
> namespace. Não importe nada próprio.

## Mapa de arquivos

```
pantanal/statistics_gcn/
├── 2_3_0_statistics_cell00_util.py     # componentes compartilhados (RODAR 1º)
├── 2_3_1_statistics_cell01_autentication_drive.py
├── 2_3_2_statistics_cell02_consolidar_qa.py
├── 2_3_3_statistics_cell03_graficos.py
├── 2_3_4_statistics_cell04_relatorio.py
├── 2_3_5_statistics_cell05_mapas.py    # opcional (recomputa médias no EE)
├── 2_3_6_statistics_cell06_referencia.py
├── requirements.txt
├── README.md
└── figures/                            # espelho: baixe as figuras para cá
```

## Configuração rápida (`CONF` na `cell00`)

| Chave | Padrão | O quê |
|-------|--------|-------|
| `DRIVE_ROOT` | `/content/drive/MyDrive/mapbiomas_carbono/pantanal` | raiz da pasta de output (setado pela cell01) |
| `CSV_DIR` | `estatisticas` | subpasta com os CSVs do 7_statistics.js |
| `FIG_DIR` | `figures` | biblioteca de figuras |
| `OUT_DIR` | `relatorio` | XLSX + .md de resumo |
| `FOREST_VERSIONS` | `[v03..v08]` | escopo esperado dos arquivos florestais |
| `GRASSLAND_PRODUCTS` | `[biomass, anpp, carbon]` | escopo campestre |
| `GRASSLAND_REF_VERSION` | `v02` | versão de referência do comparativo de produtos |
| `CARBON_FRACTION` | `0.47` | AGB → C (IPCC default) |
| `REF_MIN_VALID` | `0.05` | mín. fração de área válida das referências |
| `REF_TERRITORIO` | `Pantanal (bioma)` | território filtrado nos CSVs de referência |
| `REF_BIOME_SLUG` | `pantanal` | slug do bioma nos nomes de arquivo refs |
| `MISSING_TOL` | `1.0` Mg | tolerância do QA de somas |
| `FAZER_MAPAS` | `False` | cell05 só roda se `True` |

## Documentação cruzada

- Dados de referência (17 assets CCAL + QCN/TCN) e fichas: `COLLECTION_00/docs`.
- Contratos/hardware das estatísticas: `pantanal/forest/statistics/README.md` e
  `pantanal/grassland/statistics/README.md`.
- Legenda C11 (n0/n1/marcador): módulo GEE
  `COLLECTION_00/pantanal/module_lulc_legends.js` (estampa espelhada na
  `cell00` — dicionários `LULC_NIVEL_*` e helpers `n0_label/marcador_of`).
- As figuras/relatórios gerados espelham as pastas `figures/` deste repo.