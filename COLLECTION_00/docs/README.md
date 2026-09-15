# docs — Documentação de referência de datasets

> Documentação de referência dos **datasets que entram no pipeline** do
> MAPBIOMAS-CARBONO: datasets externos (catálogo GEE/papers), dados internos do
> projeto e fontes planejadas. Fichas enxutas com o uso exato no repositório.

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