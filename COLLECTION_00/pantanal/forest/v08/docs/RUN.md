# RUN — Pantanal Forest v08 (fluxos GEDI e IFN)

Guia operacional do pipeline v08. **Fonte única de verdade** = `0_contract.js`
(bandas, grade, domínio, fonte de amostra, champion). Este documento só descreve
a **ordem** e as **diferenças por fonte**.

## 0. Fonte de amostra (`SOURCE`)
Em `0_contract.js`, `exports.SOURCE`:
- `'gedi'` → raiz `.../PANTANAL_FOREST/V08_GEDI` · footprints GEDI L4A da BAP;
- `'ifn'`  → raiz `.../PANTANAL_FOREST/V08_IFN`  · parcelas IFN (`IFN_2026_BR_PLOTS-v13`).

Covariáveis, grade, filtro e hiperparâmetros são **idênticos** entre as fontes —
só muda a amostra e a raiz de assets. Troque `SOURCE` e re-rode.

## 1. Pré-requisito (só GEDI, uma vez)
`2_0_gedi_export_footprint.js` → gera `V08_GEDI/SAMPLES/gedi_footprint_bap_2019..2024`
(dispara todos os anos em paralelo; **aguarde as tasks** antes do `2_1`).
No IFN **não existe** este passo.

## 2. Fluxo GEDI
```
0_contract.js  (SOURCE='gedi')
  1_check.js
  2_0_gedi_export_footprint.js      # pré-requisito (1×)
  2_1_toAsset_samples_treino.js     # forest_footprint_gedi_2023_<cell>
  2_2_toDrive_matrix.js             # agb_matrix_gedi_v08_<cell>_2023
  2_3_gcn/*                         # gate offline (validação; champion)
  3_model_training.js               # MODELS/rf_agb_v08_m1..m5
  3_1_model_metadata.js             # proveniência (após as tasks do 3)
  4_spatial_prediction.js           # PREDICTIONS/COL (GLOBAL, grade comum)
  5_merge.js                        # agb_pred_v08_merged_2023
  6_qualidade.js                    # QA visual
```

## 3. Fluxo IFN (mais simples — sem footprint)
```
0_contract.js  (SOURCE='ifn')
  1_check.js
  2_1_toAsset_samples_treino.js     # forest_footprint_ifn_2023_<cell>
  2_2_toDrive_matrix.js             # agb_matrix_ifn_v08_<cell>_2023
  2_3_gcn/*                         # gate offline (validação; champion)
  3_model_training.js               # MODELS/rf_agb_v08_m1..m5
  3_1_model_metadata.js             # proveniência (após as tasks do 3)
  4_spatial_prediction.js           # PREDICTIONS/COL (GLOBAL, grade comum)
  5_merge.js                        # agb_pred_v08_merged_2023
  6_qualidade.js                    # QA visual
```
> O IFN é a **mesma** cadeia, apenas sem o passo de footprint. A matriz IFN tem
> poucas centenas de parcelas (na BAP: ~759 válidas, ~560 florestais).

## 4. Gate offline (`2_3_gcn`, Colab)
Células `00`→`06` (ver `2_3_gcn/README.md`). O `SOURCE` é **derivado dos CSVs**
(`agb_matrix_<SOURCE>_v08_*.csv`) — não precisa configurar. O gate é **validação**
(o thinning é offline e não alimenta o treino). Se o champion divergir do
herdado da v07, atualize `0_contract.js` (Bloco 7/8).

## 5. Limpeza de assets
- Pasta **`V08/`** (matrizes `agc_matrix_v08_*` + `forest_footprint_v08_2023`): **removida** (órfãos).
- Footprints GEDI da BAP agora em **`V08_GEDI/SAMPLES/gedi_footprint_bap_<ano>`** (escopados à
  variante) — recriados ao rodar `2_0_gedi_export_footprint.js`.
- A antiga pasta compartilhada `SAMPLES/` (e o `footprint_pantanal_2023` de v03–v07)
  **não existe mais**; re-rodar v03–v07 exigiria regerar esse footprint (v00/v01).

## 6. Ordem resumida
`1_check` → (GEDI: `2_0_gedi_export_footprint`) → `2_1` → `2_2` → `2_3_gcn`
→ `3` → (`3_1`, após as tasks do `3`) → `4` → `5` → `6`. Estatísticas fora do
GEE: `toolkits/statistics/v00` (`run/run_pantanal.js`).

> `3_1_model_metadata.js` grava a proveniência das covariáveis nos assets
> `MODELS/rf_agb_v08_m<i>` (o `ee.Classifier` não é `ee.Element` e não aceita
> `.set()`); deve rodar **depois** que as tasks de `3_model_training` concluírem.
