# Referência — Zimbres et al. 2021 (Cerrado, 30 m)

Mapa de biomassa lenhosa acima do solo da vegetação nativa do Cerrado (Zimbres
et al., 2021) — Random Forest, máscara de vegetação nativa, 30 m.

## Dados

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Zimbres_2021_AGB_NVmasked_RF_cog-v1`
- **Paper:** Zimbres et al., 2021, *Forest Ecology and Management* 499, art. 119615. https://doi.org/10.1016/j.foreco.2021.119615
- **Cobertura:** **apenas o bioma Cerrado** (domínio confirmado no GEE: bbox ~[-61.0 .. -40.6, -25.6 .. -1.4] — não cobre o Pantanal)
- **Resolução:** 30 m (Landsat + ALOS) — confirmado ~30 m no GEE
- **CRS:** EPSG:4326
- **Ano-base:** 2019 (MapBiomas)
- **Formato:** COG, RV (Random Forest), `NVmasked` = máscara de vegetação nativa
- **Bandas (GEE):** 1 banda `b1` (sem descrição/unidade no metadata; faixa de valores min 10 · med ~49 · max 162 = plausível para AGB t/ha; unidade ainda por confirmar)

## Contexto científico

- Modelo AGWB (biomassa lenhosa) para o Cerrado com 1858 parcelas/LiDAR,
  RF (R²=53%, RMSE rel. 57%) — referência direta de biomassa para o bioma.
- Domínio limitado ao **Cerrado** (não cobre o Pantanal) — uso principal na
  futura expansão para o Cerrado e na validação de magnitude savânica.

## Uso planejado

- Comparação com a futura cadeia **Cerrado** (`cerrado/forest/v00`) e com o
  domínio savânico; por já estar em 30 m e mascarado para NV, é a referência de
  resolução compatível com nossos produtos.
- Unidade presumida: AGB (t/ha) — confirmar.

## A confirmar no GEE

- Confirmado em `diag_reference_assets.py`: IMAGE, banda única `b1`, EPSG:4326,
  ~30 m, bbox = Cerrado. **Pendente:** unidade exata (AGB t/ha presumida —
  checar fonte/origem do asset) e se há mascaramento à parte de nodata além do
  `NVmasked` (valid fraction ~28% do bbox).