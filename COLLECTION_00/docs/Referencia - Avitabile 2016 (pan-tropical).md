# Referência — Avitabile et al. 2016 (pan-tropical)

Mapa pan-tropical de biomassa que integra múltiplas referências (Avitabile et
al., 2016).

## Dados

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Avitabile_AGB_Map`
- **Paper:** Avitabile et al., 2016, *Global Change Biology* 22(4) 1406–1420. https://doi.org/10.1111/gcb.13139
- **Cobertura:** pan-tropical
- **Resolução:** ~0.5–1 km (a confirmar no asset)
- **Ano-base:** ~2010 (a confirmar)

## Contexto científico

- Mapa integrado que **funde Saatchi 2011 + Baccini 2012** com dados de parcela —
  ponto de convergência metodológica das referências anteriores.
- Unidade: AGB (Mg/ha) — confirmar.

## Uso planejado

- Comparação de **magnitude regional** (pan-tropical → recorte Pantanal) com
  nossos produtos; por ser uma fusão das outras duas referências, usar como
  **terceira visão de síntese**, atento à **circularidade** ao comparar com
  Saatchi/Baccini separadamente.
- Upgrade our 30 m → ~0.5–1 km para comparação (reamostragem por média).

## A confirmar no GEE

- `print('bands', img.bandNames()); print(img)` — resolução real, unidade, nodata
  e extensão no Pantanal.