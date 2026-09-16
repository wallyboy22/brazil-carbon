# Referência — Baccini et al. 2012 (tropical, ~30 m)

Mapa de densidade de carbono/biomassa dos trópicos (Baccini et al., 2012) —
versão em ~30 m.

## Dados (medidos no GEE)

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Z_baccini_30_agb`
- **Paper:** Baccini et al., 2012, *Science* 338(6110) 84–87. https://doi.org/10.1126/science.1227962
- **Cobertura:** Amazônia (bbox ~[-70.0, -30.0, -40.0, 0.0])
- **Resolução:** ~27.8 m · **CRS:** EPSG:4326
- **Stats:** b1 min 1 · med ~76 · **máx exatamente 255** → armazenado em byte
  (teto de 8 bits) · valid ~66%

## Contexto científico

- Paper de referência para **emissões por desmatamento** com mapas de densidade
  de carbono; uma das duas bases do Avitabile 2016.
- O asset se chama `..._agb`; o paper reporta **carbono** — **confirmar** se o
  asset é AGB em t/ha ou já carbono (t C/ha).

## Uso planejado

- Única referência **~30 m** para florestas (junto com Zimbres no Cerrado) —
  caminho direto para comparação fina com `agc_pred_v07/v08` (máscara C11).
- Conversão AGB↔C (×0.47) a definir conforme unidade confirmada; cuidado com o
  teto de 255 (saturação não representa o limite físico).

## A confirmar

- Unidade exata (t/ha vs t C/ha) e se o teto 255 indica saturação ou escala —
  confirmar em Baccini 2012/2017 (`baccini2017.pdf` em `docs/Referências de
  mapeamento/`).