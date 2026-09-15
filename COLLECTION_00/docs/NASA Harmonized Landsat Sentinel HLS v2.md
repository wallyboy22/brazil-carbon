# NASA Harmonized Landsat Sentinel (HLS), Version 2

Imagens Landsat 8/9 + Sentinel-2 ortorretificadas e calibradas em um único
produto — fonte espectral das covariáveis da cadeia florestal.

## Dados

- **Asset GEE:** `NASA/HLS/HLSL30/v002` (Landsat 8/9, 30 m) · `NASA/HLS/HLSS30/v002` (Sentinel-2, 30 m)
- **Produtor:** NASA (HLS Project / ESP)
- **Versão:** v002
- **Disponibilidade:** 2013–presente
- **Link oficial:**
  - https://developers.google.com/earth-engine/datasets/catalog/NASA_HLS_HLSL30_v002
  - https://developers.google.com/earth-engine/datasets/catalog/NASA_HLS_HLSS30_v002

## Uso no projeto

- **Papel:** covariável espectral da cadeia florestal (stack de 36 bandas).
- **Derivados usados:** Fmask (qualidade); índices NDVI, EVI, NDMI, BAI, SAVI, BSI;
  percentis **P10/P50/P90**; amplitude **AMP** → **24 bandas**.
- **Onde entra:** `forest/covariate/_hls.js` (`since_v01`), orquestrado nos
  `0_covariate_source.js` de v00–v08.

## Notas do projeto

- Os percentis (P10/P50/P90) e a amplitude (AMP) resumem a variabilidade sazonal
  do ano de referência.
- A cadeia campestre (grassland) **não** usa HLS — usa Landsat + MODIS.