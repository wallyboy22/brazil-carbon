# Pantanal Forest v08 — Fix do PALSAR-2 + pipeline

> **Problema resolvido**: excesso localizado de carbono em tiles de
> `agc_pred_v07_merged_2023` (e v04/v05/v06), com `agbd_std` alto — artefato
> associado ao PALSAR-2 amostrado **célula a célula** (`.first()`). A v08
> reconstrói o PALSAR como mosaico global determinístico e adiciona a máscara
> de nodata do SAR ao treino. v07 permanece concluída e inalterada.

## 1. Diagnóstico (documentado completo em `v07/../0_contract` + README da cadeia)

- Sintoma: tiles com carbono alto, região ao redor normal; `agbd_std` alto do
  mesmo lado (os 5 membros discordam → combinação de covariáveis fora do
  domínio de treino).
- Causa raiz (hipótese principal, confirmada na fase 0 via
  `0_diagnose_tiles.js`):

```js
// v01–v07 — escolhe UMA strip do SAR_EPOCH por AOI da célula:
ee.ImageCollection('JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH')
  .filterBounds(aoi)
  .filter(ee.Filter.calendarRange(year, year, 'year'))
  .first()
```

  O `SAR_EPOCH` é um mosaico de strips; `.first()` arbitrário por célula gera
  platôs de `HV_db`/`HH_db` alinhados à grade (não às strips), ampliados pelo
  `focal_mean(3)`. v04 congelou isso no cache `COVARIATES`; v05–v07
  recomputaram ao vivo com a mesma lógica.
- Fatores descartados: blocos 3 km (só gate offline), thinning 75 m (offline),
  grade de células (`CELL_SPLIT=4` igual na v03, que é suave) e máscara LULC
  (mesma em todas as versões).

## 2. Correção da v08 (em `0_covariate_source.js`)

1. `buildPalsarGlobal(year)` — mosaico único no bioma:

   - `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH` filtrado ao bioma e ao ano;
   - `DN <= 0` mascarado como **nodata** (`img.updateMask(img.gt(0))`);
   - combinação por **MEDIANA** das observações válidas (determinística);
   - mesma derivação dB de sempre (`pow(2)·log10·10−83`), `HV_HH_ratio`, `RVI`
     e `focal_mean(3, 'square','pixels')` (paridade de bandas com v03–v07).
2. `buildTypedCovariatesStack(aoi, year)` — remove as bandas PALSAR
   per-célula do stack herdado (não são computadas no grafo) e injeta as do
   mosaico global tipadas em `Float32`. O restante das covariáveis (HLS,
   HAND, ERA5/CWD, LULC) é idêntico.
3. `TRAINING_MASKS` + `palsar_nodata` — máscara extra de treino que exclui
   footprints onde o mosaico global de SAR é nodata (sem dado). A predição
   continua NÃO mascarada por LULC (`MASK_MODE='training_only'`).

## 3. Diferenças vs v07

| Aspecto | v07 (concluída) | v08 |
|---|---|---|
| PALSAR | `.first()` por célula (platôs) | mediana global no bioma |
| Máscara de treino | LULC 3,4,6,7,49 + extras | + `palsar_nodata` |
| Champion/ensemble | minLeaf 10 · 6 vars · linear · N=5 | idênticos à v07 (valores inlineados no contrato v08) |
| Predição | não mascarada | não mascarada |
| Stats comparativo | V03–V07 | V03–V08 (`0_contract_stats.js`) |
| QA visual | todas as versões (v07 fix) | V03–V08 com fallback COL |

## 4. Arquivos (passos GEE)

| Step | Arquivo | O que faz |
|---|---|---|
| 0 | `0_contract.js` · `0_covariate_source.js` | contrato + fix PALSAR global |
| 0 | `0_diagnose_tiles.js` | fase 0: confirma platôs, banda culpada, membros (usa assets v07) |
| 1 | `1_preflight.js` | máscara de treino + stack tipado |
| 2 | `2_0_check_footprint.js` | raw vs treino (mask C11 + palsar) |
| 2 | `2_1_toAsset_samples_treino.js` | amostras de treino → SAMPLES/ |
| 2 | `2_2_toDrive_matrix.js` | matriz por célula/ano → ASSET + Drive (CSV) |
| 2 | `2_3_gcn/*` | gate offline (Colab) — figuras, thinning, champion |
| 3 | `3_model_training.js` | ensemble RF global → MODELS/rf_agc_v08_m1..m5 |
| 4 | `4_spatial_prediction.js` | predição por célula/ano → PREDICTIONS/COL (mediana+std) |
| 5 | `5_merge.js` | mosaico anual → `agc_pred_v08_merged_<ano>` |
| 6 | `6_qualidade.js` | QA V03–V08 plotado simultaneamente |
| 7 | `7_statistics.js` | stats AGC×LULC C11 (usa stats_engine compartilhado) |

## 5. Ordem de execução

1. `0_diagnose_tiles.js` — confirmar hipótese; anotar `SMOKE_CELLS`.
2. `1_preflight.js` → `2_0_check_footprint.js` → `2_1_toAsset_samples_treino.js`
   → `2_2_toDrive_matrix.js` (tasks de matriz).
3. `2_3_gcn` (Colab) — se o campeão do gate divergir do herdado da v07,
   atualizar `0_contract.js` (seção CHAMPION/ENSEMBLE).
4. `3_model_training.js` → `4_spatial_prediction.js` (tasks) → `5_merge.js`.
5. `6_qualidade.js` (QA visual) → `7_statistics.js` (CSVs + comparativo).

## 6. Biblioteca de covariáveis (`covariate/`)

A refatoração de set/2026 extraiu todas as formulações de covariáveis em uma
biblioteca compartilhada em `pantanal/forest/covariate/`. Cada `0_covariate_source.js`
é agora um orquestrador autossuficiente que requer o próprio contrato + biblioteca
(mas **não outras versões**).

| Módulo | Responsabilidade | Proveniência (since) |
|---|---|---|
| `_hls.js` | HLS spectral: Fmask, NDVI/EVI/NDMI/BAI/SAVI/BSI, P10/P50/P90/AMP | since_v01 |
| `_palsar.js` | PALSAR-2: `.first()` per-cell (since_v01) + mediana global (v08) | since_v01/v08 |
| `_hand.js` | HAND contínuo + classes geomorfológicas 1-4 | since_v01 |
| `_era5.js` | ERA5 CWD (atual/climatológico/3yr), Tmean, Prec | since_v01 |
| `_lulc.js` | MapBiomas C11 (classification_\<ano\>) | since_v01 |
| `_infra.js` | ensureFolder, ensureImageCollection, getBiome, SAMPLE_PROPS | since_v01/v03/v06 |
| `_training.js` | getForestMask, getTrainingMask, applyTrainingMask | since_v06/v07 |
| `_ensemble.js` | hashString, getMemberBands (BAND_FRACTION) | since_v07 |
| `_metadata.js` | COVARIATES_REGISTRY (proveniência por tema, tag since_vNN) | set/2026 |
| `build_stack.js` | buildCovariatesStack, buildTypedCovariatesStack | since_v01/v03 |

**Política de proveniência**: cada tema em `_metadata.js` tem uma lista `versions`
com tags `since_vNN` (em vez de listar v03–v08). Mudanças entram como novos itens
na lista. A registry completa é impressa no modelo como `covariates_registry` e
`covariate_version` (asset properties) — ver `3_model_training.js`.

## 7. State

- v08 **em desenvolvimento**: código pronto para executar no GEE; nenhuma task
  de export rodada ainda.
- v07 **concluída e inalterada**; o QA (`v07/6_qualidade.js`) e o
  `statistics/stats_engine.js` foram corrigidos para as versões novas (fallback
  de mosaico e plots multi-versão) sem alterar o produto v07.