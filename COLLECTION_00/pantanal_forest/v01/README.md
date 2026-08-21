# pantanal_forest/v01 — Pipeline modular AGC

> Primeira versão modular do MAPBIOMAS-CARBONO, seguindo o padrão do
> MapBiomas Solo (`collection3/carbon`): etapas numeradas + módulo de
> covariáveis compartilhado via `require()`. O Cerrado permanece só com v00.

## Etapas

| Etapa | Papel | Saídas |
|---|---|---|
| `0_covariate_source` | Módulo `require()`: filtros GEDI, `discoverGranules`, `buildCovariatesStack` (HLS/PALSAR-2/HAND/ERA5-CWD/LULC C11, 36 bandas), `ensureFolder()`, config compartilhada | — |
| `1_check_covariates` | Diagnóstico: bandas do stack, camadas viz, teste `sampleRegions(3)` | — |
| `2_data_matrix` | Matriz de treino (GEDI filtrado + covariáveis) | `SAMPLES/footprint_*` · `MATRIX/agc_matrix_v01` · Drive CSV (batches 1000) |
| `3_modelling` | RF regressão no `agbd` + predição anual multibanda | `PREDICTIONS/agc_pred_v01` · Drive GeoTIFF · modelo opcional |
| `4_merge` | Stub documentado — consolidação futura a definir pela equipe | — |

**Ordem de execução:** 0 → 1 → 2 → 3 (→ 4 quando definido).

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

## Convenções

- **Flags pessoais** nas descriptions: `WS_CARBONO_toDrive-…` / `WS_CARBONO_toAsset-…`
- **Export duplicado**: Drive (CSV p/ tabelas, GeoTIFF p/ imagens) + Asset GEE
- **Estratégia `evaluate()`** (sem `getInfo`); janela `[inicio, fim)` exclusiva;
  fallback para `YEAR-1` sem granules; LULC Coleção 11; semente fixa no RF.
- Arquivos **sem extensão** (padrão Solo c3) — o `require()` usa:
  ```javascript
  require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v01/0_covariate_source')
  ```

## Decisões registradas

1. **`MODELS` nasce desligado.** O GEE tem API consolidada
   (`Export.classifier.toAsset()` + `ee.Classifier.load()`), mas o time não usa
   essa prática internamente (o Solo retreina a cada execução). Toggle
   `SAVE_MODEL_TO_ASSET = false` em `3_modelling` — ligar é uma linha.
2. **Janela da predição: 2019–2023.** Respeita HLS (2013+), PALSAR SAR_EPOCH e
   a era GEDI (2019+). Estender `YEARS` exige conferir disponibilidade das fontes.
3. **Covariáveis automáticas no modelo.** `3_modelling` usa todas as propriedades
   da matriz menos uma lista de exclusão (metadados GEDI/alvo) — bandas novas do
   stack entram na próxima versão sem editar lista branca.
4. **Pasta espelha balde.** `pantanal_forest/` ↔ `PANTANAL_FOREST/` (idem cerrado),
   abrindo espaço para novas coberturas/projetos (`<cobertura>_forest/v<NN>/`).
5. **v00 congelada como referência** — divergências futuras nascem em v02+.
