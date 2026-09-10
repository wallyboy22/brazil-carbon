# pantanal/forest/v05 — Stack em memória por célula

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
internos de 500 amostras nem assets `COVARIATES/`. O `evaluate()` descobre a
lista server-side de células válidas uma única vez.

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
| `PREDICTIONS/COL/` | ImageCollection de predições por célula/ano |
| `PREDICTIONS/` | merges anuais (`agc_pred_v05_merged_AAAA`), irmãos da `COL` |

As predições por célula são exportadas **dentro da ImageCollection**
`PREDICTIONS/COL` (criada automaticamente pelo `ensureImageCollection`, via
`ee.data.createAsset`), cada uma com as propriedades `year`, `cell_id` e
`system:time_start`. O `5_merge` lê a `COL` filtrada por `year` e exporta o
mosaico anual como irmão, com nome simples. Se a `COL` existir como pasta, o
script avisa para excluir/recriar. Predições v05 antigas exportadas na pasta
(fora da `COL`) não são consideradas pelo merge.

O footprint de entrada é filtrado pelo polígono oficial do Pantanal.

## Execução

1. Execute `1_preflight`.
2. Execute `2_0_check_footprint`.
3. Execute `2_1_data_matrix`.
4. Execute `3_model_training` e rode a task do modelo.
5. Execute `4_spatial_prediction`; a ImageCollection `PREDICTIONS/COL` é criada
   automaticamente e os exports entram nela.
6. Para visualizar as predições no mapa, altere `ADD_LAYER` para `true`.
7. Execute `5_merge` após as predições concluírem.
8. Execute `6_qa`.

`CELL_SPLIT=4` cria 16 células por tile. Se uma célula exceder o limite de
computação, aumente para `6` ou `8` nos scripts 2.1 e 4.
