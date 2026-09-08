# pantanal_forest/v02 — Matriz particionada e modelagem

> Evolução da v01 para evitar o timeout do export único da matriz de treino.
> A `v01` permanece congelada como referência.

## Mudança principal

Na v01, vários `sampleRegions()` eram calculados e reunidos em um único
`FeatureCollection` antes do `Export.table.toAsset()`. No Pantanal completo,
essa árvore de computação excede o tempo limite.

Na v02, cada lote é exportado como um asset independente:

```text
MATRIX/agc_matrix_v02_pantanal_batch001
MATRIX/agc_matrix_v02_pantanal_batch002
...
```

Cada lote contém até `ASSET_BATCH_SIZE` amostras. Não há `flatten()` global no
export.

## Ordem de execução

1. Execute `2_data_matrix`.
2. Inicie as tasks `agc_matrix_v02_pantanal_batchNNN`.
3. Confirme quais batches terminaram.
4. Em `3_modelling`, preencha `MATRIX_BATCH_IDS` com os números concluídos.
5. Execute `3_modelling` para treinar e exportar as predições.

O módulo de covariáveis é compartilhado com a v01, pois a alteração desta
versão é de particionamento/export, não de alvo ou stack:

```javascript
require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal_forest/v01/0_covariate_source')
```

## Assets

Base:
`projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/`

| Balde | Conteúdo |
|---|---|
| `SAMPLES/` | footprints GEDI filtrados |
| `MATRIX/` | batches da matriz `agc_matrix_v02_pantanal_batchNNN` |
| `PREDICTIONS/` | imagens anuais AGC da modelagem |

`ASSET_BATCH_SIZE` começa em `2000`. Se uma task ainda exceder o limite, reduza
para `1000` e execute novamente apenas os batches que falharam.
