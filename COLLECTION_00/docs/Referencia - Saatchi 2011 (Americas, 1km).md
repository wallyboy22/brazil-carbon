# Referência — Saatchi et al. 2011 (Américas, ~1 km)

Família completa do benchmark Saatchi 2011 para as Américas (4 assets, ~1 km):
AGB, BGB, carbono (AGC) e erro do carbono.

## Dados (medidos no GEE)

| Asset | Variável | Escala | CRS | b1 med/max | valid |
|---|---|---|---|---|---|
| `.../Saatchi_2011_america_agb_1km` | AGB | ~928 m | EPSG:4326 | 43 / 443 | 0.24 |
| `.../Saatchi_2011_america_bgb_1km` | BGB | ~928 m | EPSG:4326 | 14 / 111 | 0.24 |
| `.../Saatchi_2011_america_carbon_1km` | Carbono (AGC) | ~928 m | EPSG:4326 | 29 / 277 | 0.24 |
| `.../Saatchi_2011_america_carbon_error_1km` | Erro do carbono | ~928 m | EPSG:4326 | 20 / 57 | 0.90 |

- **Asset base:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/`
- **Paper:** Saatchi et al., 2011, *PNAS* 108(24) 9899–9904. https://doi.org/10.1073/pnas.1019576108
- **Cobertura:** Américas (subconjunto do mapa tropical de 3 continentes)
- **Extensão (bbox):** ~[-112.9, -56.6, -33.7, 31.4] (Américas; valid ~24% = áreas florestais)
- **Ano-base:** ~2007–2008 (do paper — assets sem `system:time_start`)

## Contexto científico

- Primeiro mapa *benchmark* de estoques de carbono florestal dos trópicos,
  combinando GLAS (ICESat) + dados de campo; a família AGB/BGB/C oferece
  **AGB↔C já separados** e uma camada de **erro**.
- Relação AGB vs C nos assets é consistente com ~0.5 (med 43 AGB → 29 C ≈ 0.67;
  faixa alta ~0.66) — valores coerentes com conversão de biomassa→carbono.

## Uso planejado

- Comparação em **escala regional (~1 km)** com `agc_pred_v07/v08` e stats:
  usar `agb`/`carbon` para magnitude, `bgb` para contexto subsolo e `error`
  como incerteza da referência na análise.
- Reamostragem dos nossos 30 m → ~1 km (mean) para comparação; não usar
  pixel-a-pixel.

## A confirmar

- Unidade exata (`t/ha` para AGB/BGB e `t C/ha` para carbono) — confirmar no
  paper (PDF em `docs/Referências de mapeamento/`); bandas `b1` sem metadata.