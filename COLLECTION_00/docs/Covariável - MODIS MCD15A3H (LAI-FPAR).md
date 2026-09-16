# MODIS MCD15A3H — Leaf Area Index / FPAR (4 dias)

Fração da radiação fotossinteticamente ativa absorvida (fPAR), composição de
4 dias — insumo dos produtos de biomassa/ANPP campestre.

## Dados

- **Asset GEE:** `MODIS/061/MCD15A3H`
- **Produtor:** NASA LP DAAC
- **Versão:** Collection 6.1 (`061`)
- **Disponibilidade:** 2000–presente
- **Link oficial:** https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD15A3H

## Uso no projeto

- **Papel:** entrada do modelo de Monteith (biomassa/ANPP campestre).
- **Banda:** `Fpar` (escala `×0.01`).
- **Onde entra:** `0_sensor_landsat_modis.js` (v01/v02), `v00/anpp_grasland_pampa.js`.

## Notas do projeto

- v02 adiciona **Fpar_QC** (`MODLAND_QC ≤ 1`, via `USE_QC`) e **interpolação de
  fPAR ausente** (mês sem dado = média dos meses adjacentes).
- `PARa = fPAR × DSR × 0.48`.