# Referência — Zimbres et al. 2021 (Cerrado, 30 m)

Mapa de biomassa lenhosa acima do solo da vegetação nativa do Cerrado (Zimbres
et al., 2021) — Random Forest, máscara de vegetação nativa, 30 m.

## Dados

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Zimbres_2021_AGB_NVmasked_RF_cog-v1`
- **Paper:** Zimbres et al., 2021, *Forest Ecology and Management* 499, art. 119615. https://doi.org/10.1016/j.foreco.2021.119615
- **Cobertura:** **Cerrado** (bioma BR)
- **Resolução:** 30 m (Landsat + ALOS)
- **Ano-base:** 2019 (MapBiomas)
- **Formato:** COG, RV (Random Forest), `NVmasked` = máscara de vegetação nativa

## Contexto científico

- Modelo AGWB (biomassa lenhosa) para o Cerrado com 1858 parcelas/LiDAR,
  RF (R²=53%, RMSE rel. 57%) — referência direta de biomassa para o bioma.
- Domínio limitado ao **Cerrado** (não cobre o Pantanal) — uso principal na
  futura expansão para o Cerrado e na validação de magnitude savânica.

## Uso planejado

- Comparação com a futura cadeia **Cerrado** (`cerrado/forest/v00`) e com o
  domínio savânico; por já estar em 30 m e mascarado para NV, é a referência de
  resolução compatível com nossos produtos.
- Unidade presumida: AGB (Mg/ha) — confirmar.

## A confirmar no GEE

- `print('bands', img.bandNames()); print(img)` — banda (`AGWB`?), unidade,
  nodata/máscara e extensão exata.