# Referência — Avitabile et al. 2016 (pan-tropical e BR)

Família Avitabile disponível em `Biomass_ref_maps/` (4 assets): AGB pan-tropical,
série "modo" por bioma BR (collection) e duas conversões para carbono (Cerrado/Amazônia).

## Dados (medidos no GEE)

| Asset | Variável | Tipo | Escala | CRS | b1 med/max | valid |
|---|---|---|---|---|---|---|
| `.../Avitabile_AGB_Map` | AGB pan-tropical | IMAGE | ~928 m | EPSG:4326 | 279 / 378 | (bbox largo — não confiável) |
| `.../Avitabile_AGB_Map_Mode_K_2_2` | AGB mode K — série por bioma BR | IMAGE_COLLECTION | ~1 km | EPSG:4326 | 111 / 501 (`total_1985`) | 0.32 |
| `.../Avitabile_Carbon_AGB_Cerr` | AGB→C **Cerrado** | IMAGE | ~928 m | EPSG:4326 | 17 / 435 | 0.09 |
| `.../Avitabile_Carbon_AGB_amaz` | AGB→C **Amazônia** | IMAGE | ~928 m | EPSG:4326 | 231 / 505 | 0.21 |

- **Asset base:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/`
- **Paper:** Avitabile et al., 2016, *Global Change Biology* 22(4) 1406–1420. https://doi.org/10.1111/gcb.13139
- **Collection `Mode_K_2_2`:** **12 imagens** = 6 biomas BR (amazônia, caatinga,
  cerrado, mata atlântica, pampa, pantanal) × versão v1/v2; banda `total_YYYY`
  (série iniciando em 1985); sem `system:time_start` — "modo"/K da metodologia
  Avitabile aplicada a cada bioma.

## Contexto científico

- Mapa integrado que **funde Saatchi 2011 + Baccini 2012** com dados de parcela —
  ponto de convergência das referências anteriores.
- A família já entrega **AGB (t/ha)** e **carbono (t C/ha)** por recorte
  (Cerrado vs Amazônia), e uma **série temporal `total_YYYY`** por bioma.

## Uso planejado

- `AGB_Map` e as conversões `Carbon_*`: comparação de **magnitude regional**
  (~1 km) com `agc_pred_v07/v08` e stats (upgrade dos nossos 30 m por média).
- `Mode_K_2_2`: **série por bioma desde 1985** — potencial referência temporal
  para a retrospectiva (bookkeeping) e para validar tendência de estoque.
- Atenção à **circularidade**: `AGB_Map` é fusão de Saatchi+Baccini — não tratar
  os três como evidências independentes.

## A confirmar

- Unidades exatas (t/ha vs t C/ha) nos PDFs (Avitabile 2016 em `docs/Referências de
  mapeamento/`); bandas `b1` sem metadata; `Mode_K_2_2` usa `total_YYYY` — quais
  anos cobrem a série (1985–?).