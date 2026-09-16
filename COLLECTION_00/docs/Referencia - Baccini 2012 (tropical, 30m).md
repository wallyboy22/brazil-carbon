# Referência — Baccini et al. 2012 (tropical, 30 m)

Mapa de densidade de carbono/biomassa dos trópicos (Baccini et al., 2012) —
versão em ~30 m.

## Dados

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Z_baccini_30_agb`
- **Paper:** Baccini et al., 2012, *Science* 338(6110) 84–87. https://doi.org/10.1126/science.1227962
- **Cobertura:** trópicos
- **Resolução:** ~30 m (nome do asset; original publicado era mais grosseiro)
- **Ano-base:** ~2000–2010 (a confirmar)

## Contexto científico

- Paper de referência para **emissões por desmatamento** com mapas de densidade
  de carbono; base de fusão do Avitabile 2016.
- O asset se chama `..._agb`; o paper reporta **carbono** (Mg C/ha) — **confirmar**
  se o asset é AGB em Mg/ha ou já carbono.

## Uso planejado

- Comparação em **escala fina (30 m)** com `agc_pred_v07/v08` no domínio
  florestal (máscara C11) — caminho mais direto para bias/MAPE pixel a pixel.
- Conversão AGB↔AGC (×0.47) a definir conforme unidade confirmada.

## A confirmar no GEE

- `print('bands', img.bandNames()); print(img)` — unidade (AGB vs AGC), nodata,
  extensão efetiva no Pantanal e ano-base.