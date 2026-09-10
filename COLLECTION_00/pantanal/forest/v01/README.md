# pantanal/forest/v01 — Pipeline modular AGC

> Primeira versão modular do MAPBIOMAS-CARBONO, seguindo o padrão do
> MapBiomas Solo (`collection3/carbon`): etapas numeradas + módulo de
> covariáveis compartilhado via `require()`. O Cerrado permanece só com v00.

## Etapas

| Etapa | Papel | Saídas |
|---|---|---|
| `0_covariate_source` | Módulo `require()`: filtros GEDI, `discoverGranules`, `buildCovariatesStack` (HLS/PALSAR-2/HAND/ERA5-CWD/LULC C11, 36 bandas), `ensureFolder()`, config compartilhada | — |
| `1_check_covariates` | Diagnóstico: bandas do stack, camadas viz, teste `sampleRegions(3)` | — |
| `2_data_matrix` | Matriz de treino (GEDI filtrado + covariáveis) | Asset `SAMPLES/` + `MATRIX/` · Drive CSV (universo p/ análise) quando `EXPORT_TO_DRIVE=true` |
| **`2_2_data_matriz_analisys/`** *(offline, fora do GEE)* | Análise offline (local/Colab): EDA, redundância (correlação/thinning/IsolationForest), CV espacial K-fold, RF/GBM/SVR → gate | `outputs/analysis_report.md` · `EXPERIMENTS.md` |
| `3_modelling` | Modelo selecionável (`MODEL_TYPE` rf/gbm/svm) + predição anual multibanda | Asset `PREDICTIONS/` · Drive GeoTIFF quando `EXPORT_TO_DRIVE=true` |
| `4_merge` | Stub documentado — consolidação futura a definir pela equipe | — |

**Ordem de execução:** 0 → 1 → 2 → **(análise offline)** → 3 (→ 4 quando definido).
A análise decide o champion; **só ele dispara o `3_modelling`** (predição massiva, cara).

## Baldes de assets GEE

Base: `projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/`

| Balde | Status | Conteúdo |
|---|---|---|
| `SAMPLES/` | ✅ existente | footprints GEDI filtrados |
| `MATRIX/` | 🆕 v01 | matrizes de treino consolidadas |
| `PREDICTIONS/` | 🆕 v01 | imagens anuais AGC preditas (multibanda) |
| `MODELS/` | 🆕 v01 (toggle **off**) | modelos RF |

O helper `ensureFolder()` (em `0_covariate_source`) cria qualquer pasta que
faltar, nível a nível, antes dos exports — não precisa criar manualmente.

> 🔒 **Política de versionamento:** no repo GEE online entram **apenas `.js`,
> `README.md` e os módulos `require()`** (os arquivos sem extensão desta pasta).
> A subpasta `2_2_data_matriz_analisys/` é **ignorada** no online e tem **próprio
> `.git` local** — o histórico dela (scripts, dados, relatórios) fica versionado
> localmente e **nunca vai para o earthengine.googlesource.com**.

## Convenções

- **Fluxo de predição = exports para Assets GEE**: `EXPORT_TO_ASSET=true` em
  `2_data_matrix`/`3_modelling`. `MATRIX/agc_matrix_v01` alimenta `3_modelling`;
  `PREDICTIONS/agc_pred_{version}{subversion}` guarda a série predita.
  Drive (`EXPORT_TO_DRIVE`) desligado por padrão — ligado para exportar o
  **universo** da análise offline (`2_2_data_matriz_analisys/`).
- **Modelo selecionável**: `MODEL_TYPE` (`rf` | `gbm` | `svm`, espelhando o GEE)
  + hiperparâmetros em `MODEL_PARAMS`. A escolha vem do champion da análise
  offline. `SUBVERSION` rotula o experimento (`agc_pred_v01_rf`, …).
- **Flags pessoais** nas descriptions: `WS_CARBONO_toDrive-…` / `WS_CARBONO_toAsset-…`
- **Estratégia `evaluate()`** (sem `getInfo`); janela `[inicio, fim)` exclusiva;
  fallback para `YEAR-1` sem granules; LULC Coleção 11; semente fixa.
- Arquivos **sem extensão** (padrão Solo c3) — o `require()` usa:
  ```javascript
  require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v01/0_covariate_source')
  ```

## Decisões registradas

1. **Fluxo de predição = exports via asset no GEE.** Após validar o fluxo no Drive
   (fase de teste), a v01 passa a exportar para os baldes de asset: `MATRIX/`
   alimenta `3_modelling` e `PREDICTIONS/` guarda a série predita. O `ensureFolder()`
   cria os baldes automaticamente. Drive fica disponível via `EXPORT_TO_DRIVE`
   para exportar o **universo** da análise offline quando necessário.
2. **Gate offline antes da predição massiva.** O `ANALYSIS/` (Colab) decide as
   subversões/versão com métricas baratas (EDA, redundância, IsolationForest,
   split espacial, RF/GBM/SVR). **Só o champion dispara o `3_modelling`** —
   predição massiva é cara (EECU alto).
3. **`MODELS` nasce desligado.** O GEE tem API consolidada
   (`Export.classifier.toAsset()` + `ee.Classifier.load()`), mas o time não usa
   essa prática internamente (o Solo retreina a cada execução). Toggle
   `SAVE_MODEL_TO_ASSET = false` em `3_modelling` — ligar é uma linha.
4. **Janela da predição: 2019–2023.** Respeita HLS (2013+), PALSAR SAR_EPOCH e
   a era GEDI (2019+). Estender `YEARS` exige conferir disponibilidade das fontes.
5. **Covariáveis automáticas no modelo.** `3_modelling` usa todas as propriedades
   da matriz menos uma lista de exclusão (metadados GEDI/alvo) — bandas novas do
   stack entram na próxima versão sem editar lista branca.
6. **Subversão × versão.** Subconjunto de covariáveis, ano/janela, hiperparâmetros,
   semente, filtros ou **modelo diferente com as mesmas covariáveis** (RF↔GBM↔SVM)
   → **subversão** (`v01_<tag>`). Novo alvo/stack/universo/extensão → **v02**.
7. **Pasta espelha balde.** `pantanal/forest/` ↔ `PANTANAL_FOREST/` (idem cerrado),
   abrindo espaço para novas coberturas/projetos (`<cobertura>_forest/v<NN>/`).
8. **v00 congelada como referência** — divergências futuras nascem em v02+.
