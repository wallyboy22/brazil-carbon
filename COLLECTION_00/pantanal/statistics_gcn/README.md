# Pantanal · Estatísticas — análise de escritório (`statistics_gcn`)

**gcn = google collab notebook.** Cada `statistics_cellNN_*.py` é **uma célula
de um Colab qualquer**: abra um notebook, e em cada célula cole o conteúdo do
`.py` (ou use `%run '<caminho_do_py>'` apontando para o arquivo no Drive).

Diferente do gate `v07/2_3_gcn`, este módulo é **compartilhado entre as duas
cadeias** (forest + grassland) e **não recomputa** estatísticas no Earth
Engine: ele consome os CSVs exportados pelos steps `7_statistics.js`.

## Regra de ouro

Os CSVs são gerados **no GEE** (steps nas versões). Este notebook só LÊ e
analisa. Se faltar arquivo, o `cell01` indica qual step rodar:

| Cadeia | Step no GEE |
|---|---|
| Pantanal Forest V03–V08 | `forest/v0X/7_statistics.js` (v07 e v08 também rodam o comparativo) |
| Pantanal Grassland v01 | `grassland/v01/7_statistics.js` |

Depois, faça download/export dos CSVs para a pasta
`DRIVE_ROOT/estatisticas/`.

## Fluxo de execução (ordem)

| Ordem | Arquivo | O que faz | Artefatos gerados |
|------|---------|-----------|-------------------|
| 1 | `statistics_cell00_autentication_drive.py` | autentica Earth Engine, monta o Drive, configura pasta de output | `statistics_util` importável |
| 2 | `statistics_cell01_consolidar_qa.py` | checa arquivos esperados, consolida forest/grassland, QA de somas (n0=n1=total), exporta consolidados | `consolidado_{forest,grassland}_2023.csv` |
| 3 | `statistics_cell02_graficos.py` | figuras: estoque por classe/marcador/versão (forest) e por produto (grassland) | `f1..f5_*.png` |
| 4 | `statistics_cell03_relatorio.py` | relatório XLSX (abas n0/n1/marcador/total/comparativo por versão e produto) + resumo .md | `resumo_pantanal_2023.xlsx` + `.md` |
| 5 | `statistics_cell04_mapas.py` (OPCIONAL) | mapas de AGC v07 e campestre por grade 10 km — só se `FAZER_MAPAS=True` | `mapa_*.png` |

## Mapa de arquivos

```
pantanal/statistics_gcn/
├── statistics_util.py                # config + leitura CSVs + QA + figuras
├── statistics_cell00_autentication_drive.py
├── statistics_cell01_consolidar_qa.py
├── statistics_cell02_graficos.py
├── statistics_cell03_relatorio.py
├── statistics_cell04_mapas.py        # opcional (recomputa médias no EE)
├── requirements.txt
├── README.md
└── figures/                          # espelho: baixe as figuras para cá
```

## Configuração rápida (`statistics_util.py`)

| Chave | Padrão | O quê |
|-------|--------|-------|
| `CSV_DIR` | `estatisticas` | subpasta com os CSVs do 7_statistics.js |
| `FIG_DIR` | `figures` | biblioteca de figuras |
| `OUT_DIR` | `relatorio` | XLSX + .md de resumo |
| `FOREST_VERSIONS` | `[v03..v08]` | escopo esperado dos arquivos florestais |
| `GRASSLAND_PRODUCTS` | `[biomass, anpp, carbon]` | escopo campestre |
| `MISSING_TOL` | `1.0` Mg | tolerância do QA de somas |
| `FAZER_MAPAS` | `False` | cell04 só roda se `True` |

## Documentação cruzada

- Contratos/hardware das estatísticas: `pantanal/forest/statistics/README.md` e
  `pantanal/grassland/statistics/README.md`.
- Legenda C11 (n0/n1/marcador): módulo GEE
  `COLLECTION_00/pantanal/module_lulc_legends.js` (estampa espelhada em
  `statistics_util.DECIMAL/FOREST_CLASSES/GRASSLAND_CLASSES`).
- As figuras/relatórios gerados espelham as pastas `figures/` deste repo.