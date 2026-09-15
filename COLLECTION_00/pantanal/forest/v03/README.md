# pantanal/forest/v03 — Pipeline tipada e espacial

A v03 substitui a estratégia experimental da v02 por uma pipeline com contrato
explícito de bandas, preflight e exports espaciais pequenos.

## Grafo

```text
0_contract → 1_preflight → 2_0_check_footprint → 2_1_data_matrix
                                      ↓
                              2_2_offline_gate
                                      ↓
                              3_model_training
                                      ↓
                           4_spatial_prediction
                                      ↓
                                  5_merge
                                      ↓
                                    6_qa
```

## Contrato de tipos

| Grupo | Tipo raster |
|---|---|
| Índices HLS | `Float32` |
| PALSAR HH/HV/razão/RVI | `Float32` |
| HAND | `Float32` |
| Classes geomorfológicas | `Uint8` |
| CWD, temperatura e precipitação | `Float32` |
| MapBiomas LULC | `Uint8` |
| Predição AGC | `Float32` |

`0_contract` é o schema único. O `0_covariate_source` converte as bandas antes
de amostrar ou predizer. `1_preflight` imprime `bandNames()` e `bandTypes()`;
nenhuma lista de propriedades é usada como schema automático.

## Assets v03

Base:
`projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V03/`

| Balde | Conteúdo |
|---|---|
| `MATRIX/` | `agc_matrix_v03_pantanal_tileNN_batchNNN` |
| `MODELS/` | `rf_agc_v03` |
| `PREDICTIONS/COL/` | ImageCollection de predições por célula/ano |
| `PREDICTIONS/` | merges anuais (`agc_pred_v03_merged_AAAA`), irmãos da `COL` |

As predições por célula são exportadas **dentro da ImageCollection**
`PREDICTIONS/COL` (criada automaticamente pelo `ensureImageCollection`, via
`ee.data.createAsset`), cada uma com as propriedades `year`, `cell_id` e
`system:time_start`. O `5_merge` lê a `COL` filtrada por `year` e exporta o
mosaico anual como irmão, com nome simples. Se a `COL` existir como pasta, o
script avisa para excluir/recriar.

Entrada persistida da matriz:
`.../PANTANAL_FOREST/SAMPLES/footprint_pantanal_2023`.

## Execução

1. Execute `1_preflight` e confirme 36 bandas, tipos e amostras válidas.
2. Execute `2_0_check_footprint`.
3. Execute `2_1_data_matrix`; lotes vazios são pulados antes do export.
4. Rode a análise do `2_2_offline_gate`.
5. Execute `3_model_training` e rode a task do modelo `rf_agc_v03`.
6. Execute `4_spatial_prediction`; as células válidas são descobertas
   server-side pelo polígono e pelos footprints. A ImageCollection
   `PREDICTIONS/COL` é criada automaticamente e os exports entram nela.
7. Ligue `ADD_LAYER=true` quando quiser visualizar as predições no mapa.
8. Execute `5_merge` somente após as predições necessárias concluírem.
9. Execute `6_qa` para conferir cobertura e assets.

`4_spatial_prediction` usa `PRED_PART_SPLIT=4` e exporta uma task por parte e
ano. A predição preserva `Float32`; não há arredondamento automático para
`Int16`.

## Política de dados ausentes

Geometria vazia, fonte anual ausente ou lote sem amostras válidas são pulados
com mensagem. Não são preenchidos com zero silenciosamente. Se uma fonte faltar
em uma região válida, a decisão deve ser registrada no gate offline antes de
alterar o contrato.
