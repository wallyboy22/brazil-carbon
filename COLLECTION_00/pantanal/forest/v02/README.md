# pantanal/forest/v02 — Matriz particionada e modelagem

> Evolução completa da v01 para evitar o timeout do export único da matriz de treino.

## Etapas

| Etapa | Papel |
|---|---|
| `0_covariate_source.js` | Interface v02 da fonte de covariáveis compartilhada com a v01 |
| `1_check_covariates.js` | Diagnóstico do stack e teste de amostragem |
| `2_0_check_footprint.js` | Validação do footprint persistido, sem export |
| `2_data_matrix.js` | Subetapa 2.1: export da matriz em assets particionados |
| `3_modelling.js` | Treino e predição anual usando os assets concluídos |
| `4_merge.js` | Stub para consolidação futura |

**Ordem:** `0 → 1 → 2_0 → 2_data_matrix → 3 → 4`.

## Mudança principal

Na v01, vários `sampleRegions()` eram calculados e reunidos em um único
`FeatureCollection` antes do `Export.table.toAsset()`. No Pantanal completo,
essa árvore de computação excede o tempo limite.

Na v02, o footprint existente é dividido em tiles espaciais. Cada lote de cada
tile é exportado como um asset independente:

```text
MATRIX/agc_matrix_v02_pantanal_tile01_batch001
MATRIX/agc_matrix_v02_pantanal_tile01_batch002
MATRIX/agc_matrix_v02_pantanal_tile02_batch001
...
```

Cada lote contém até `ASSET_BATCH_SIZE` amostras, possui geometria de pixel e
usa somente o stack do seu tile. Não há `toList(total)` global nem `flatten()`
no export.

## Ordem de execução

1. Execute `2_0_check_footprint` e confirme os diagnósticos.
2. Execute `2_data_matrix` somente após a validação passar.
3. Inicie as tasks `agc_matrix_v02_pantanal_tileNN_batchNNN`.
4. Confirme quais assets terminaram (tiles sem amostra falham com "Table is
   empty" e **não geram asset** — esperado e sem impacto no treino).
5. Execute `3_modelling`. Por padrão ele **descobre automaticamente** todos os
   assets `agc_matrix_v02_pantanal_*` existentes em `MATRIX/`, sem lista
   manual. `MATRIX_ASSET_IDS` é override opcional (vazio = descobrir tudo).
6. Execute `3_modelling` para treinar e exportar as predições.

O `3_modelling` exporta a predição **por tile × parte × ano** (`agc_pred_v02_rf_tile01_p01_2019`, …) para evitar o `Computed value is too large` na predição sobre o bioma inteiro. Por padrão ele prediz apenas os tiles que possuem ao menos um asset de matriz válido (`ACTIVE_TILE_IDS` é override opcional); `PRED_PART_SPLIT` (default `2`) subdivide cada tile em N×N partes. Opcionalmente, ligue `ADD_LAYER=true` para adicionar as predições ao mapa (diagnóstico); `false` (padrão) não adiciona nada.

O módulo de covariáveis usa a implementação da v01 por enquanto, pois a
alteração desta versão é de particionamento/export, não de alvo ou stack. A
interface, entretanto, está dentro da própria v02:

```javascript
require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v02/0_covariate_source.js')
```

O asset `SAMPLES/footprint_pantanal_2023` é uma entrada persistida. A v02 não
redescobre granules nem reexporta footprints; a subetapa `2_0_check_footprint`
apenas verifica se a entrada está disponível e possui geometria antes da
amostragem.

## Assets

Base:
`projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/`

| Balde | Conteúdo |
|---|---|
| `SAMPLES/` | footprints GEDI filtrados |
| `MATRIX/` | batches por tile `agc_matrix_v02_pantanal_tileNN_batchNNN` |
| `PREDICTIONS/` | predições por tile×parte×ano `agc_pred_v02_rf_tileNN_pNN_AAAA` |

`ASSET_BATCH_SIZE` começa em `500` e `TILE_SCALE` em `16`. Se uma task ainda
exceder o limite, reduza o batch para `250` e repita somente o tile afetado.
