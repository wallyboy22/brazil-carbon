# pantanal_forest/v05 — Stack em memória por célula

A v05 substitui a proposta de exportar rasters intermediários da v04. O stack
de covariáveis permanece em memória e é calculado uma vez por célula de
amostragem ou predição.

## Grafo

```text
0_contract → 1_preflight → 2_0_check_footprint → 2_1_data_matrix
                                                        ↓
                                               3_model_training
                                                        ↓
                                               4_spatial_prediction
                                                        ↓
                                                     5_merge
                                                        ↓
                                                       6_qa
```

## Estratégia

Cada célula executa um único `sampleRegions` para a matriz. Não há batches
internos de 500 amostras nem assets `COVARIATES/`. O `evaluate()` é usado no
máximo uma vez por célula para evitar exports vazios.

Tipos do stack:

| Grupo | Tipo |
|---|---|
| Contínuas | `Float32` |
| Classes geomorfológicas e LULC | `Uint8` |
| Predição AGC | `Float32` |

## Assets

Base:
`projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V05/`

| Balde | Conteúdo |
|---|---|
| `MATRIX/` | uma matriz por célula válida |
| `MODELS/` | `rf_agc_v05` |
| `PREDICTIONS/` | predições por célula/ano e merges |

O footprint de entrada é filtrado pelo polígono oficial do Pantanal.

## Execução

1. Execute `1_preflight`.
2. Execute `2_0_check_footprint`.
3. Execute `2_1_data_matrix`.
4. Execute `3_model_training` e rode a task do modelo.
5. Execute `4_spatial_prediction`.
6. Para visualizar as predições no mapa, altere `ADD_LAYER` para `true`.
7. Execute `5_merge` após as predições concluírem.
8. Execute `6_qa`.

`CELL_SPLIT=4` cria 16 células por tile. Se uma célula exceder o limite de
computação, aumente para `6` ou `8` nos scripts 2.1 e 4.
