# MAPBIOMAS-CARBONO — Mapeamento do notebook `mb_carbon_agc.py`

> Portado para o **GEE Code Editor**, subdividido em scripts por região/bioma:
> `COLLECTION_00/cerrado/mb_carbon_agc.js`, `COLLECTION_00/pantanal/mb_carbon_agc.js`
> e `COLLECTION_00/cerrado/mb_carbon_agc_points.js` (exemplo: pontos genéricos).
> Ver `COLLECTION_00/README.md` — cofre de conhecimento.
>
> Legenda: 🔧 infraestrutura · ⚙️ preparação · 📊 análise · 📦 **SAÍDA**

## Visão geral

O notebook (Colab) baixa footprints **GEDI L4A v002**, aplica filtros de qualidade,
monta um **stack de covariáveis** (HLS + PALSAR + HAND + ERA5/CWD + MapBiomas) e
exporta amostras para modelagem de carbono acima do solo (AGC). A versão JS
**mantém apenas as saídas** e automatiza o export **em loop por região**
(Google Drive + Assets GEE).

## Mapeamento célula a célula

| # | Etapa do notebook | O que faz | Tipo | Portado p/ JS? |
|---|---|---|---|---|
| 1 | `pip install` + imports | Instala geemap, folium, pandas, sklearn, xgboost, shap... | 🔧 | ❌ (não aplicável no Code Editor) |
| 2 | `ee.Authenticate` + `ee.Initialize('mapbiomas-brazil')` | Autentica e inicializa GEE | 🔧 | ❌ (Code Editor já autenticado) |
| 3 | Config: `YEAR`, bbox AOI (tiles comentados), `SCALE`, `PAGE_SIZE`, `MAX_FOOTPRINTS` | Parâmetros do fluxo | ⚙️ | ✅ `YEAR`, `SCALE`, `GRIDS`, `ACTIVE_GRIDS` |
| 4 | Mapa geemap da AOI | Visualiza a área de interesse | 📊 | ➖ Map.addLayer da AOI (diagnóstico) |
| 5 | Índice `LARSE/GEDI/GEDI04_A_002_INDEX` filtrado por data+bounds | Descobre granules (`table_id`) | ⚙️ | ✅ `discoverGranules()` |
| 6 | Fallback para 2022 se sem granules | Contingência de dados | ⚙️ | ✅ fallback ano anterior |
| 7 | `filter_gedi()` | Filtros de qualidade (flags, erro relativo, sensitivity, beams, noturno) | ⚙️ | ✅ `filterGedi()` |
| 8 | Loop por granule → coleta client-side (`getInfo`) | Acumula footprints num DataFrame | ⚙️ | ❌ substituído por FC server-side |
| 9 | Limpeza: numéricos, drop NaN, `rel_error_pct` | Higienização dos dados | ⚙️ | ❌ (desnecessário no fluxo server-side) |
| 10 | Outliers IQR Tukey 1.5× por `pft_class` | Remove outliers por PFT | 📊 | ❌ removido (decisão "só saída") |
| 11 | Mapa folium (MapBiomas + footprints) | Visualização | 📊 | ❌ removido |
| 12 | EDA: 6 gráficos + `describe()` | Análise exploratória | 📊 | ❌ removido |
| 13 | **Export CSV footprints** (`df_out`) | Baixa footprints filtrados | 📦 | ✅ `Export.table.toDrive` + `toAsset` |
| 14 | HLS: Fmask + índices espectrais + P10/P50/P90/AMP | Covariável espectral (24 bandas) | ⚙️ | ✅ `maskHlsClouds` / `addSpectralIndices` / `percentileComposite` |
| 15 | PALSAR-2: HH/HV dB, razão, RVI + speckle | Covariável SAR (4 bandas) | ⚙️ | ✅ |
| 16 | HAND + classes geomorfológicas | Covariável topográfica (2 bandas) | ⚙️ | ✅ |
| 17 | ERA5/CWD: CWD atual/clim/3yr + T + Prec | Covariável climática (5 bandas) | ⚙️ | ✅ `computeAnnualCWD` |
| 18 | MapBiomas LULC do ano | Covariável de uso (1 banda) | ⚙️ | ✅ **Coleção 11** (`collection11/...coverage_v3`, banda `classification_<ano>`) |
| 19 | Stack integrado (36 bandas, clip AOI) | Monta imagem final | ⚙️ | ✅ `buildCovariateStack()` |
| 20 | **Export batch `sampleRegions` → Drive** | Amostras com covariáveis em CSVs | 📦 | ✅ batches no Drive + **novo: Asset FC única** |
| 21 | Monitor de tasks + merge dos batches (comentado) | Acompanha e une saídas | 🔧 | ➖ aba TASKS no Code Editor |

## Saídas de fato (o que o JS gera)

Por **cada região ativa** no loop (`ACTIVE_GRIDS`):

### 1. Footprints GEDI filtrados (sem covariáveis)
| Destino | Nome |
|---|---|
| Drive | `GEDI_L4A_AGB_{ANO}_{grid}_filtered.csv` |
| Asset | `.../GEDI/footprint_{grid}_{ANO}` |

### 2. Amostras com covariáveis (para modelagem AGC)
| Destino | Nome |
|---|---|
| Drive | `AGC_samples_{grid}_{ANO}_batchNNN.csv` (batches de 1000) |
| Asset | `.../GEDI/AGC_samples_{grid}_{ANO}` (FC única) |

> Bases dos assets (uma por região; pastas-pai devem existir no Assets):
> - Cerrado: `projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/CERRADO_FOREST/SAMPLES`
> - Pantanal: `projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/SAMPLES`

## Regiões (GRIDS)

Os registros de grids foram **subdivididos por script** (um por bioma):

- **`cerrado/mb_carbon_agc.js`** → 14 tiles do Cerrado (`t0_0` … `t3_3`, bbox de referência do notebook) + Maranhão (exemplo comentado). `ACTIVE_GRIDS` default: `['t0_0']`.
- **`pantanal/mb_carbon_agc.js`** → grid **Pantanal — bioma completo** ativo por padrão: quadro `[-60.6788, -22.8138, -52.5489, -12.9587]`. `ACTIVE_GRIDS` default: `['pantanal']`.
- **`cerrado/mb_carbon_agc_points.js`** → **exemplo de pontos genéricos** (não aleatórios): dado um asset `POINTS_FC`, extrai o stack e exporta `points_samples_{ANO}` (Asset + Drive). AOI = bounds dos pontos; `randomPoints` aparece só comentado como exemplo.

O Pantanal pode divergir do Cerrado a partir desta versão (grids, covariáveis, filtros, escala, parâmetros).

## Mudanças em relação ao notebook

- Removida toda a análise (EDA, gráficos, outliers, mapas folium/geemap).
- Removida a coleta client-side de footprints (substituída por `FeatureCollection` server-side).
- Export duplicado: **Drive (CSV)** + **Asset GEE (FeatureCollection)**.
- Loop por região com registro central de grids.
- **Scripts subdivididos por região/bioma** (`cerrado/` e `pantanal/`) — cada um com `ASSET_BASE`, `GRIDS` e `ACTIVE_GRIDS` próprios, para o Pantanal divergir do Cerrado sem afetá-lo.
- **LULC migrado para a Coleção 11** (`collection11/mapbiomas_brazil_collection11_coverage_v3`, banda `classification_<ano>`).
- **Seção 7 — Legenda MapBiomas Col. 11 (inteligência, copiável)**: `MAPBIOMAS_LEGEND` (35 classes, códigos+cores), `MAPBIOMAS_LEVEL1` (5 classes do nível 1), `MAPBIOMAS_VIS` (`{bands:['classification'], min:0, max:91, palette}` gerado do objeto) e `addMapBiomasLegend()` — legenda discreta no canto inferior esquerdo (margin/padding 0px, font-size 12px, max-height 60%). `overflow` removido (não é estilo válido de `ui.Panel`).
- **Sem `getInfo()` — estratégia `evaluate()` assíncrona**: a função principal que cria os exports (`runMain`) só roda depois de baixar as variáveis importantes de cada região — lista de granules (`EVALUATE #1`) e total de pegadas filtradas (`EVALUATE #2`). Cada `Export.*` recebe `.start()` explícito (dentro de callback o auto-start do Code Editor não dispara).
- **Correção da descoberta de granules**: o índice `LARSE/GEDI/GEDI04_A_002_INDEX` **não tem `system:time_start`** — `filterDate`/`dateRange` retornavam 0 granules. O filtro agora usa a propriedade **`time_start` em millis** (`ee.Filter.gte/lt` com `ee.Date().millis()`), janela `[inicio, fim)` (fim exclusivo — `(YEAR+1)-01-01`, não `YYYY-12-31`). Obs.: o notebook Python mantém o problema original.
- **Novo script de pontos genéricos** (`cerrado/mb_carbon_agc_points.js`): extração de covariáveis para um asset `POINTS_FC` (exemplo, não aleatório) — 2 EVALs (total de pontos + bandas).
- **Viz do limite do bioma** (IBGE/IPAM): camada de diagnóstico `Limite {Bioma}` nos 3 scripts (`Cerrado` no cerrado/points; `Pantanal` no pantanal).
- Fallback de ano agora usa `YEAR-1` (o notebook usava 2022 fixo).