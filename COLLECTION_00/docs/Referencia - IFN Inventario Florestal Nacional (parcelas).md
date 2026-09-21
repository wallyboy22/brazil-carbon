# Referência — IFN (Inventário Florestal Nacional, parcelas de campo)

> Fonte de referência do toolkit `view/v00` (gaveta **IFN**, dentro de
> **Referência**). Rasterizada via `ee.Image().paint(fc, coluna)`.

## Asset

`projects/ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13` — **Table** (FeatureCollection),
**30.116** parcelas. (Existem também `IFN_2026_Field_Cerrado`, `IFN_2026_BR_Field_plots`,
`IFN_2026_SubField_Cerrado` — **não** usados aqui.)

## Colunas

`fid`, `Subunidade`, `AGB_Mg_ha`, `mun`, `C_Mg_ha`, `bioma`, `area_ha`, `UA`,
`CO2e_Mg_ha`, `AGB_Mg`, `orientacao`, `n_ind`, `G_m2_ha`, `G_m2`, `system:index`.

## Colunas de interesse (camadas do app)

| id | coluna | rótulo | unidade | vis (max) | min–max (BR) |
|---|---|---|---|---|---|
| `agb` | `AGB_Mg_ha` | AGB | Mg/ha | 300 | 0–3765 |
| `carbono` | `C_Mg_ha` | Carbono | Mg C/ha | 150 | 0–1770 |
| `co2e` | `CO2e_Mg_ha` | CO2e | Mg CO2e/ha | 550 | 0–6489 |
| `area_basal` | `G_m2_ha` | Área basal | m²/ha | 60 | 0–283 |
| `n_ind` | `n_ind` | Nº indivíduos | nº | 40 | 0–218 |
| `agb_total` | `AGB_Mg` | AGB total | Mg | 50 | 0–377 |

> Unidade: **megagrama (Mg) = tonelada**. `area_ha` é constante (0,1) → fora.

## Rasterização (`paint`)

```js
ee.Image().paint(ee.FeatureCollection(IFN_ASSET), 'AGB_Mg_ha')
```

- Resultado: **1 banda `constant`**, preserva **float** (verificado: `0.351779654867019`).
- A imagem pintada tem projeção EPSG:4326 de 1° (nominal ~111 km), mas pinta ~1
  pixel por parcela (~30 m) — fica **quase invisível em escala Brasil** (decisão:
  manter só o `paint`, sem `width`/`reproject`).

Implementação: `engine/module_layers.js` (`build` → branch `layer.paint`),
`contracts/00_catalog_references.js` (`IFN_ASSET`, `IFN_COLUNAS`, `FONTES.ifn`).
