# Pantanal Forest v08 — Fix do PALSAR-2 + domínio BAP + multi-fonte

> **Problema resolvido**: excesso localizado de carbono em tiles de
> `agc_pred_v07_merged_2023` (e v04/v05/v06), com `agbd_std` alto — artefato
> associado ao PALSAR-2 amostrado **célula a célula** (`.first()`). A v08
> reconstrói o PALSAR como mosaico global determinístico e adiciona a máscara
> de nodata do SAR ao treino.
>
> **Domínio e fontes (v08/BAP)**: o domínio passou do bioma Pantanal (IBGE)
> para a **Bacia do Alto Paraguai** (`projects/ee-arcplan/assets/bap_pantanal_planalto`,
> Pantanal + Planalto). O pipeline é único e parametrizado por `SOURCE`
> (`gedi` | `ifn`), gerando as sub-versões `V08_GEDI` e `V08_IFN` com as mesmas
> covariáveis e hiperparâmetros.

## 1. Diagnóstico

- Sintoma: tiles com carbono alto, região ao redor normal; `agbd_std` alto do
  mesmo lado (os 5 membros discordam → combinação de covariáveis fora do
  domínio de treino).
- Causa raiz (hipótese principal, confirmada no diagnóstico `1_check.js` e nos
  assets v07):

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
3. Filtro de TREINO no `2_2` (por célula): `mapbiomas_lulc ∈ {3,4,6,7,49}` +
   `notNull(FEATURE_BANDS)`. A antiga máscara de imagem `palsar_nodata` foi
   **removida** (era redundante com o `notNull` e cara — forçava o compósito
   PALSAR no `2_1`). A predição NÃO é mascarada por LULC.

## 3. Diferenças vs v07

| Aspecto | v07 (concluída) | v08 |
|---|---|---|
| Domínio | bioma Pantanal (IBGE) | Bacia do Alto Paraguai (BAP) |
| Fonte de amostra | GEDI L4A (footprint Pantanal) | `SOURCE`: GEDI (footprint BAP) ou IFN (`PLOTS-v13`) |
| PALSAR | `.first()` por célula (platôs) | mediana global no bioma |
| Filtro de treino | máscara LULC (imagem) | `mapbiomas_lulc ∈ FOREST_CLASSES` + `notNull` no `2_2` |
| Champion/ensemble | minLeaf **por fonte** (GEDI 5 · IFN 10) · 6 vars · `maxNodes 40` · linear · N=5 | gate v08 (`2_3_gcn`) |
| Predição | não mascarada | não mascarada |
| Stats comparativo | V03–V07 | V03–V08 (`0_contract_stats.js`) |
| QA visual | todas as versões (v07 fix) | V03–V08 com fallback COL |

## 4. Arquivos (passos GEE)

| Step | Arquivo | O que faz |
|---|---|---|
| 0 | `0_contract.js` · `0_covariate_source.js` | contrato (domínio BAP, fonte, champion) + PALSAR global |
| 1 | `1_check.js` | diagnóstico único: fonte/domínio, footprints, floresta+stack (célula-amostra) |
| 2 | `2_0_gedi_export_footprint.js` | (só `gedi`) footprints GEDI L4A sobre a BAP → V08_GEDI/SAMPLES/gedi_footprint_bap_<ANO> |
| 2 | `2_0_ifn_export_footprint.js` | (só `ifn`) parcelas IFN normalizadas (centroide + `agbd`) → V08_IFN/SAMPLES/ifn_footprint_<ANO> |
| 2 | `2_1_gedi_toAsset_samples_treino.js` · `2_1_ifn_toAsset_samples_treino.js` | amostras normalizadas por fonte (1 task por recorte) → SAMPLES/ |
| 2 | `2_2_gedi_toDrive_matrix.js` · `2_2_ifn_toDrive_matrix.js` | matriz por fonte/célula/ano (filtro floresta + notNull) → ASSET + Drive (CSV) |
| 2 | `2_3_gcn/*` | gate offline (Colab) — figuras, thinning (validação), champion |
| 3 | `3_0_model_training.js` | ensemble RF global (champion por fonte: minLeaf GEDI 5 · IFN 10) → MODELS/rf_agb_v08_m1..m5 |
| 4 | `4_0_spatial_prediction.js` | ensemble (1 predição/fonte, grade comum; restrição por **máscara**, sem clip) → PREDICTIONS/COL (mediana+std) |
| 5 | `5_0_quality.js` | QA visual V03–V08 |

## 5. Ordem de execução

0. Definir `SOURCE` em `0_contract.js`: **`null` (ambíguo) = as duas fontes** nos
   passos `1_check`/`3_0`/`3_1`/`4_0`; ou `'gedi'` | `'ifn'` para uma só.
1. `1_check.js` — diagnóstico (fonte, contagem de footprints, floresta+stack).
2. `2_0` — footprint/parcelas da fonte: (GEDI) `2_0_gedi_export_footprint.js`
   (footprints GEDI L4A sobre a BAP) ou (IFN) `2_0_ifn_export_footprint.js`
   (parcelas IFN normalizadas: centroide + `agbd`).
3. `2_1_<fonte>_toAsset_samples_treino.js` → `2_2_<fonte>_toDrive_matrix.js`
   (tasks de matriz) — **1 script por fonte** (`gedi`/`ifn`): rode os dois (padrão)
   ou só o da fonte desejada.
4. `2_3_gcn` (Colab) — gate offline de **validação** (o thinning é offline e NÃO
   alimenta o treino). Com `SOURCE=None` roda gedi/ifn em sequência. O champion
   por fonte fica em `SOURCES.<fonte>.minLeafPop` e no bloco `CHAMPION` do `3_0`
   (`maxNodes` default 40 mantém o modelo pequeno — ver `docs/RUN.md` §4).
5. `3_0_model_training.js` → `4_0_spatial_prediction.js` (tasks). Sem merge: a
   `PREDICTIONS/COL` do `4_0` (D3 global, grade comum) já é mosaico sem costura.
5. `5_0_quality.js` (QA visual). As estatísticas saem do toolkit
   `toolkits/statistics/v00` (`run/run_pantanal.js`).

## 6. Biblioteca de covariáveis (`covariate/`)

Todas as formulações de covariáveis estão em uma biblioteca compartilhada em
`pantanal/forest/covariate/`. Cada `0_covariate_source.js`
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

> **Regra de ouro (`AGENTS.md`)**: **nunca `.clip`** — restrição espacial por
> **máscara** (`updateMask(ee.Image().paint(aoi).eq(0))`; dentro=1, fora=masked) e,
> quando precisar de geometria (export/`reduce`), `aoi.geometry().bounds()`.
> Aplicada em `build_stack.js`, `_palsar.js`, `0_covariate_source.js` e `4_0`.

**Política de proveniência**: cada tema em `_metadata.js` tem uma lista `versions`
com tags `since_vNN` (em vez de listar v03–v08). Mudanças entram como novos itens
na lista. A registry completa (`covariates_registry`, `covariate_version`) é
gravada no **asset companheiro** `MODELS/metadata_v08_<source>` pelo
`3_1_model_metadata.js` (o asset CLASSIFIER do modelo não aceita propriedades).

## 7. State

- v08 **em desenvolvimento**: código pronto para executar no GEE; os assets
  órfãos da pasta `V08/` foram removidos (rename `agc`→`agb` + multi-fonte).
- v07 **concluída e inalterada**; o QA (`v07/6_qualidade.js`) e o
  `statistics/stats_engine.js` foram corrigidos para as versões novas (fallback
  de mosaico e plots multi-versão) sem alterar o produto v07.

## 8. Documentação (`docs/`)

| Arquivo | Conteúdo |
|---|---|
| `docs/RUN.md` | guia operacional: fluxos **GEDI** e **IFN**, ordem e toggles |
| `docs/ATBD_v08.md` | ATBD — base teórica, dados, algoritmo, incerteza, limitações |
| `docs/proposta_predicao_sem_costura.md` | proposta de costura de borda (D1/D2/D3) |

> Este `README.md` é o índice da versão; `2_3_gcn/README.md` descreve o gate offline.