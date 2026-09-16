# Referência — Saatchi et al. 2011 (Américas, AGB 1 km)

Mapa benchmark de carbono/biomassa florestal tropical (Saatchi et al., 2011) —
versão para as Américas em ~1 km.

## Dados

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Saatchi_2011_america_agb_1km`
- **Paper:** Saatchi et al., 2011, *PNAS* 108(24) 9899–9904. https://doi.org/10.1073/pnas.1019576108
- **Cobertura:** Américas (subconjunto do mapa tropical de 3 continentes)
- **Resolução:** ~1 km
- **Ano-base:** ~2007–2008 (a confirmar no asset)

## Contexto científico

- Primeiro mapa *benchmark* de estoques de carbono florestal para os trópicos,
  combinando GLAS (ICESat) com dados de campo — referência da linhagem
  Saatchi/Xu.
- Unidade original do produto: AGB (Mg/ha) — **confirmar** se o asset armazena
  AGB ou carbono.

## Uso planejado

- Comparação em **escala regional/pan-tropical** com `agc_pred_v07/v08` e stats
  (resolução de 1 km não captura detalhe de 30 m — uso como referência de
  magnitude, não pixel a pixel).
- Métricas a definir na fase de análise: bias, RMSE reamostrado
  (upscale do nosso pra 1 km), correlação e diferença por classe C11.

## A confirmar no GEE

- `print('bands', img.bandNames()); print(img)` — bandas, unidade (AGB vs AGC),
  nodata, extensão real e ano-base.