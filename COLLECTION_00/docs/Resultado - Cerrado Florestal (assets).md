# Resultado — Cerrado Florestal (assets)

> Exploração **temporária** dos assets do Cerrado para o toolkit `view/v00`
> (executada uma vez via Earth Engine Python API, `ee.Initialize(project='mapbiomas-brazil')`).
> Diferente do Pantanal: **não** segue `VXX/PREDICTIONS/COL` com banda
> `prediction_2023`.

## Raiz

`projects/mapbiomas-brazil/assets/CARBON/MAPPING/Cerrado`

## Árvore

```
Cerrado/
  mapa_biomassa_vbeta1/
    mosaico_final_agb_2020_vbeta1_1        [IMAGE]            b1, b2
    mosaico_final_agb_2020_mask_vbeta1_1   [IMAGE]            b1
  v0/
    preditores_30m_v0                      [IMAGE_COLLECTION] VAZIA (size 0)
```

## Resultados utilizáveis (AGB 2020)

| Asset | Tipo | Bandas | Observações |
|---|---|---|---|
| `mapa_biomassa_vbeta1/mosaico_final_agb_2020_vbeta1_1` | Image | `b1`, `b2` | **b1 = AGB (t/ha)** — min 7,8 · max 133,1 · média 35,5. `b2` = **constante 29,31** (ignorar). |
| `mapa_biomassa_vbeta1/mosaico_final_agb_2020_mask_vbeta1_1` | Image | `b1` | **b1 = AGB mascarada** às classes **nativas** do Cerrado — min 0 · max 132,3 · média 21,7. |

Propriedades da versão mascarada:
`clip_bioma = Cerrado` · `clip_cd_bioma = 3` · `mask_collection = 11` ·
`mask_year = 2020` · `non_native_value = 0` · `source_asset = .../mosaico_final_agb_vbeta1_1`.

- CRS: **EPSG:5880** · escala nativa **100 m**.
- Ano: **2020**.

## Conclusão

- Camadas do Cerrado no toolkit = **b1** das duas imagens acima:
  - **Cerrado Florestal (AGB)** → `.../mosaico_final_agb_2020_vbeta1_1` (banda `b1`).
  - **Cerrado Florestal (AGB · nativo)** → `.../mosaico_final_agb_2020_mask_vbeta1_1` (banda `b1`).
- `v0/preditores_30m_v0` está **vazia** → fora do catálogo.
- `COLLECTION_00/CERRADO_FOREST/` só tem `SAMPLES` (sem predições ainda).
