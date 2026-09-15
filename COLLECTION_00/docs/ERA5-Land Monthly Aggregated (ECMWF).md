# ERA5-Land Monthly Aggregated (ECMWF)

Reanálise climática do ECMWF sobre a superfície terrestre, agregada ao mês —
base do déficit hídrico climatológico (CWD).

## Dados

- **Asset GEE:** `ECMWF/ERA5_LAND/MONTHLY_AGGR`
- **Produtor:** ECMWF / Copernicus Climate Change Service
- **Versão:** ERA5-Land (agregação mensal)
- **Disponibilidade:** 1950–presente
- **Link oficial:** https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_MONTHLY_AGGR

## Uso no projeto

- **Papel:** contexto climático (disponibilidade de água) na predição de carbono.
- **Bandas (5):** **CWD** atual, climatológico e de 3 anos
  (`CWD_anual = Σ max(ETP − P, 0)` dos 12 meses), temperatura média e precipitação.
- **Onde entra:** `forest/covariate/_era5.js` (`since_v01`).

## Notas do projeto

- O CWD é a métrica-chave: resume o déficit hídrico acumulado (pressão hídrica
  sobre a biomassa).
- Separar versões "atual × climatológico" permite distinguir efeito interanual de
  estrutura climática de longo prazo.