# pantanal_forest/v02 — Matriz particionada e modelagem

> Evolução completa da v01 para evitar o timeout do export único da matriz de treino.
> A `v01` permanece congelada como referência.

## Etapas

| Etapa | Papel |
|---|---|
| `0_covariate_source` | Interface v02 da fonte de covariáveis compartilhada com a v01 |
| `1_check_covariates` | Diagnóstico do stack e teste de amostragem |
| `2_data_matrix` | Export da matriz em assets particionados |
| `3_modelling` | Treino e predição anual usando os assets concluídos |
| `4_merge` | Stub para consolidação futura |

**Ordem:** `0 → 1 → 2 → 3 → 4`.

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

1. Confirme que existe o asset `SAMPLES/footprint_pantanal_2023`.
2. Execute `2_data_matrix`.
3. Inicie as tasks `agc_matrix_v02_pantanal_tileNN_batchNNN`.
4. Confirme quais assets terminaram.
5. Em `3_modelling`, preencha `MATRIX_ASSET_IDS` com os assets concluídos.
6. Execute `3_modelling` para treinar e exportar as predições.

O módulo de covariáveis usa a implementação da v01 por enquanto, pois a
alteração desta versão é de particionamento/export, não de alvo ou stack. A
interface, entretanto, está dentro da própria v02:

```javascript
require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v02/0_covariate_source')
```

## Assets

Base:
`projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/`

| Balde | Conteúdo |
|---|---|
| `SAMPLES/` | footprints GEDI filtrados |
| `MATRIX/` | batches por tile `agc_matrix_v02_pantanal_tileNN_batchNNN` |
| `PREDICTIONS/` | imagens anuais AGC da modelagem |

`ASSET_BATCH_SIZE` começa em `500` e `TILE_SCALE` em `32`. Se uma task ainda
exceder o limite, reduza o batch para `250` e repita somente o tile afetado.
