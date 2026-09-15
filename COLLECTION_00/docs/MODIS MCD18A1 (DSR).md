# MODIS MCD18A1 — Surface Radiation (DSR)

Radiação de onda curta incidente na superfície (downwelling shortwave) — entrada
do modelo de Monteith/ANPP.

## Dados

- **Asset GEE:** `MODIS/061/MCD18A1`
- **Produtor:** NASA LP DAAC
- **Versão:** Collection 6.1 (`061`)
- **Disponibilidade:** 2001–presente
- **Link oficial:** https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD18A1

## Uso no projeto

- **Papel:** radiação disponível para fotossíntese.
- **Conversão:** `DSR (W/m²) → MJ/m²/dia` × `86400 × 1e-6`.
- **Onde entra:** `0_sensor_landsat_modis.js` (v01/v02), `v00/anpp_grasland_pampa.js`.

## Notas do projeto

- Juntamente com o fPAR compõe o `PARa` (radiação fotossinteticamente ativa
  absorvida) usado no modelo de produção campestre.