# docs — Documentação de referência de datasets

> Documentação de referência dos **datasets que entram no pipeline** do
> MAPBIOMAS-CARBONO: datasets externos (catálogo GEE/papers), dados internos do
> projeto e fontes planejadas. Fichas enxutas com o uso exato no repositório.

## Resumo do pipeline

| Categoria | Dataset | Asset GEE | Papel | Bandas/derivados | Desde |
|---|---|---|---|---|---|
| Observado (amostra) | GEDI L4A AGBD v2.1 | `LARSE/GEDI/GEDI04_A_002` | amostras de AGC | `agbd`, `agbd_se` | v00 |
| Observado (amostra) | GEDI L4A table index | `LARSE/GEDI/GEDI04_A_002_INDEX` | descoberta de granules | `table_id`, `time_start/end` | v00 |
| Observado (campo) | IFN — padrão BR | `ee-ipam/.../IFN_2026_BR_PLOTS-v13` · `IFN_2026_BR_Field_plots` | covariáveis + validação | biomassa de parcela | v00/v07 |
| Observado (campo) | Parcelas grassland | `c.FIELD.ASSET` (`biomass_kg_ha`) | reestima Fonseca | biomassa de parcela | gv02 |
| Covariável florestal | NASA HLS v2 | `NASA/HLS/HLSL30/v002` + `HLSS30/v002` | óptico | 24 b: Fmask+7 índices+P10/P50/P90/AMP | v01 |
| Covariável florestal | ALOS PALSAR-2 | `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH` | radar/estrutura | 4 b: HH_db, HV_db, HV_HH, RVI | v01 |
| Covariável florestal | HAND | `users/gena/global-hand/hand-100` | topografia | 2 b: HAND + classes geomorfológicas | v01 |
| Covariável florestal | ERA5-Land | `ECMWF/ERA5_LAND/MONTHLY_AGGR` | clima | 5 b: CWD (atual/clim/3yr), Tmean, Prec | v01 |
| Covariável florestal | MapBiomas C11 | `projects/mapbiomas-public/.../coverage_v3` | máscara+legenda | {3,4,6,7,49} / {11,12,50} | v01 |
| Covariável campestre | Landsat C02 L2 | `LANDSAT/LT05\|LE07\|LC08\|LC09/C02/T1_L2` | biomassa | Reflectância (Fonseca) | gv01 |
| Covariável campestre | MODIS MCD15A3H | `MODIS/061/MCD15A3H` | fPAR | ×0.01 (+QC/interpolação) | gv01 |
| Covariável campestre | MODIS MCD18A1 | `MODIS/061/MCD18A1` | radiação | DSR → MJ/m²/dia | gv01 |
| Covariável campestre | MODIS MOD17A2H | `MODIS/061/MOD17A2H` | εCA observada | Gpp ×0.0001 | gv02 |
| Auxiliar | Limites IBGE | `ee-ipam/.../IBGE` (biomas 2026 · UFs 2025 · municípios 2025) | território/agregação | polígonos | stats |
| Referência | Saatchi · Baccini · Avitabile · Zimbres | a definir | benchmark | assets pendentes | — |
| Planejado | ICESat-2 · CARBONDATA* | a definir | dados futuros | — | — |

## Externos — covariáveis florestais (stack 36 bandas)

| Arquivo | Dataset | Uso no projeto |
|---|---|---|
| `NASA Harmonized Landsat Sentinel HLS v2.md` | NASA HLS v002 (L30/S30) | 24 bandas: Fmask + NDVI/EVI/NDMI/BAI/SAVI/BSI + P10/P50/P90/AMP |
| `JAXA ALOS PALSAR-2 SAR Composite (SAR_EPOCH).md` | ALOS-2 PALSAR (SAR_EPOCH) | HH_db/HV_db/HV_HH/RVI (v08: mosaico global por mediana) |
| `HAND Height Above Nearest Drainage (global).md` | HAND global (gena) | HAND contínuo + classes geomorfológicas 1–4 |
| `ERA5-Land Monthly Aggregated (ECMWF).md` | ERA5-Land mensal | CWD (atual/climatológico/3yr) + Tmean + Prec |
| `MapBiomas Brazil Collection 11 (coverage).md` | MapBiomas C11 (coverage v3) | máscara florestal {3,4,6,7,49} e legenda C11 |

## Externos — campestre (Landsat/MODIS)

| Arquivo | Dataset | Uso no projeto |
|---|---|---|
| `Landsat Collection 2 Level-2 (L5-L7-L8-L9).md` | Landsat C02 T1_L2 (L5/L7/L8/L9) | biomassa campestre (Fonseca log-linear) |
| `MODIS MCD15A3H (LAI-FPAR).md` | MODIS MCD15A3H v6.1 | fPAR (+MODLAND_QC e interpolação na v02) |
| `MODIS MCD18A1 (DSR).md` | MODIS MCD18A1 v6.1 | radiação de superfície (Monteith/ANPP) |
| `MODIS MOD17A2H (GPP).md` | MODIS MOD17A2H v6.1 | εCA observada (v02 · 2_5) |

## Externos — dados observados (amostras)

| Arquivo | Dataset | Uso no projeto |
|---|---|---|
| `GEDI L4A Aboveground Biomass Density, Version 2.1.md` | GEDI L4A AGBD v2.1 | Fonte de amostras de AGC (Coleção 0) |
| `GEDI L4A table index.md` | Índice `LARSE/GEDI/GEDI04_A_002_INDEX` | Descoberta de granules (`discoverGranules`) |

## Internos do projeto

| Arquivo | Asset | Uso no projeto |
|---|---|---|
| `IFN Inventario Florestal Nacional (padrao BR).md` | `ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13` · `IFN_2026_BR_Field_plots` | covariáveis nas parcelas (cerrado v00) + validação independente (v07) |
| `Parcelas de campo grassland (calibracao Fonseca).md` | `c.FIELD.ASSET` (`biomass_kg_ha`) | reestimativa do Fonseca em parcelas (v02) |
| `Limites IBGE (biomas 2026, UFs 2025, municipios 2025).md` | `ee-ipam/ORIGINAIS/IBGE/...` | recorte do bioma e agregação (UF/município) |

## Referências (benchmarks de biomassa/carbono)

| Arquivo | Dataset | Uso no projeto |
|---|---|---|
| `Referencias - Mapas de referencia (biomassa e carbono).md` | Saatchi 2011 · Baccini 2012 · Avitabile 2016 · Zimbres 2021 | calibração/validação (assets a definir) |

## Planejados

| Arquivo | Dataset | Uso no projeto |
|---|---|---|
| `Datasets planejados (ICESAT-2, CARBONDATA).md` | ICESat-2 (ATL08) · CARBONDATA* | dados observados futuros (sem script) |

## Convenção

- Um arquivo por dataset, nomeado como o título oficial do produto.
- Ficha enxuta: dados do asset, uso no projeto (bandas/onde entra) e notas específicas.