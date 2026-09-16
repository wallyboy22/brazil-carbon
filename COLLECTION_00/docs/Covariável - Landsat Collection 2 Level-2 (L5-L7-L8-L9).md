# Landsat Collection 2 Level-2 (L5 · L7 · L8 · L9)

Reflectância de superfície (Collection 2, Level-2) das missões Landsat — fonte
espectral da biomassa campestre (grassland).

## Dados

- **Assets GEE:**
  - `LANDSAT/LT05/C02/T1_L2` (Landsat 5)
  - `LANDSAT/LE07/C02/T1_L2` (Landsat 7)
  - `LANDSAT/LC08/C02/T1_L2` (Landsat 8)
  - `LANDSAT/LC09/C02/T1_L2` (Landsat 9)
- **Produtor:** USGS / NASA
- **Versão:** Collection 2, Tier 1 (Level-2, reflectância de superfície)
- **Disponibilidade:** L5 1984–2012 · L7 1999–presente · L8 2013–presente · L9 2021–presente
- **Link oficial:** https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LT05_C02_T1_L2 (e análogos para L7/L8/L9)

## Uso no projeto

- **Papel:** entrada do modelo de **biomassa campestre** (Fonseca log-linear),
  série 2000–2023.
- **Onde entra:** módulo `0_sensor_landsat_modis.js` (grassland v01/v02), `v00/anpp_grasland_pampa.js` — Landsat **harmonizado** L5/L7/L8/L9.

## Notas do projeto

- A cadeia campestre usa **Landsat** (e não HLS); a florestal usa **HLS**.
- "Landsat harmonizado" = concatenação das 4 missões com correções para
  consistência temporal da série.