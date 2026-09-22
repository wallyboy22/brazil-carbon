# RUN — Pantanal Forest v08 (fluxos GEDI e IFN)

Guia operacional do pipeline v08. **Fonte única de verdade** = `0_contract.js`
(bandas, grade, domínio, fonte de amostra, champion). Este documento só descreve
a **ordem** e as **diferenças por fonte**.

## 0. Fonte de amostra (`SOURCE`)
Em `0_contract.js`, `exports.SOURCE`:
- **`null` (ambíguo)** → os passos `1_check`/`3_0`/`3_1`/`4_0` disparam as **DUAS**
  fontes em sequência (gedi e ifn);
- `'gedi'` → só `.../PANTANAL_FOREST/V08_GEDI` · footprints GEDI L4A da BAP;
- `'ifn'`  → só `.../PANTANAL_FOREST/V08_IFN`  · parcelas IFN (`IFN_2026_BR_PLOTS-v13`).

Covariáveis, grade, filtro e hiperparâmetros são **idênticos** entre as fontes —
só muda a amostra e a raiz de assets. Os `2_0`/`2_1`/`2_2` são **1 script por fonte**
(rode os dois ou só o desejado).

## 1. Pré-requisito (uma vez, por fonte)
- **GEDI**: `2_0_gedi_export_footprint.js` → `V08_GEDI/SAMPLES/gedi_footprint_bap_2019..2024`
  (dispara todos os anos em paralelo; **aguarde as tasks** antes do `2_1`).
- **IFN**: `2_0_ifn_export_footprint.js` → `V08_IFN/SAMPLES/ifn_footprint_2023`
  (normaliza as parcelas — centroide + `agbd = AGB_Mg_ha`; **aguarde a task**
  antes do `2_1`).

## 2. Fluxo GEDI
```
0_contract.js  (SOURCE='gedi')
  1_check.js
  2_0_gedi_export_footprint.js        # pré-requisito (1×)
  2_1_gedi_toAsset_samples_treino.js  # forest_footprint_gedi_2023_<cell>
  2_2_gedi_toDrive_matrix.js          # agb_matrix_gedi_v08_<cell>_2023
  2_3_gcn/*                           # gate offline (validação; champion)
  3_0_model_training.js               # MODELS/rf_agb_v08_m1..m5
  3_1_model_metadata.js               # proveniência (após as tasks do 3)
  4_0_spatial_prediction.js           # PREDICTIONS/COL (GLOBAL, grade comum)
  5_0_quality.js                      # QA visual
```

## 3. Fluxo IFN (sem footprint GEDI — usa o export próprio do IFN)
```
0_contract.js  (SOURCE='ifn')
  1_check.js
  2_0_ifn_export_footprint.js         # V08_IFN/SAMPLES/ifn_footprint_2023
  2_1_ifn_toAsset_samples_treino.js   # forest_footprint_ifn_2023_<cell>
  2_2_ifn_toDrive_matrix.js           # agb_matrix_ifn_v08_<cell>_2023
  2_3_gcn/*                           # gate offline (validação; champion)
  3_0_model_training.js               # MODELS/rf_agb_v08_m1..m5
  3_1_model_metadata.js               # proveniência (após as tasks do 3)
  4_0_spatial_prediction.js           # PREDICTIONS/COL (GLOBAL, grade comum)
  5_0_quality.js                      # QA visual
```
> O IFN usa o mesmo fluxo, com o `2_0_ifn_export_footprint` no lugar do `2_0`
> do GEDI. A matriz IFN tem poucas centenas de parcelas (na BAP: ~759 válidas).

## 4. Gate offline (`2_3_gcn`, Colab)
Células `00`→`06` (ver `2_3_gcn/README.md`). Com `SOURCE=None` o gate roda
**todas as fontes disponíveis** (gedi/ifn), em sequência; fixe `SOURCE` para uma.
O gate é **validação** (o thinning é offline e não alimenta o treino). O champion
por fonte (minLeaf) fica em `SOURCES.<fonte>.minLeafPop` **e** no bloco `CHAMPION`
do `3_0_model_training.js`.

## 5. Limpeza de assets
- Pasta **`V08/`** (matrizes `agc_matrix_v08_*` + `forest_footprint_v08_2023`): **removida** (órfãos).
- Footprints GEDI da BAP agora em **`V08_GEDI/SAMPLES/gedi_footprint_bap_<ano>`** (escopados à
  variante) — recriados ao rodar `2_0_gedi_export_footprint.js`.
- A antiga pasta compartilhada `SAMPLES/` (e o `footprint_pantanal_2023` de v03–v07)
  **não existe mais**; re-rodar v03–v07 exigiria regerar esse footprint (v00/v01).

## 6. Ordem resumida
`1_check` → `2_0` (GEDI: `2_0_gedi_export_footprint` · IFN: `2_0_ifn_export_footprint`)
→ `2_1` (`2_1_gedi_*` / `2_1_ifn_*`) → `2_2` (`2_2_gedi_*` / `2_2_ifn_*`)
→ `2_3_gcn` → `3_0` → (`3_1`, após as tasks do `3_0`) → `4_0` → `5_0`.
Estatísticas fora do GEE: `toolkits/statistics/v00` (`run/run_pantanal.js`).

> **Sem merge**: a predição D3 (`4_0`) já é global e fatiada na grade comum, então
> a `PREDICTIONS/COL` já é um mosaico sem costura (o `5_0_quality` lê a COL).

> **2_1/2_2 são 1 script por fonte** (prefixo `gedi`/`ifn`): rode os dois (padrão)
> ou só o da fonte desejada para isolar. Cada um lê/escreve na raiz da sua fonte
> (`V08_GEDI` / `V08_IFN`) — **não** dependem de `c.SOURCE`.

> `3_1_model_metadata.js` grava a proveniência num **asset companheiro** por fonte
> — `MODELS/metadata_v08_<source>` (o asset CLASSIFIER do modelo não aceita
> propriedades). Deve rodar **depois** das tasks de `3_0_model_training`.
