# pantanal/forest/v04 — Cache de covariáveis e matriz barata

A v04 mantém a v03 como baseline e altera o custo da etapa cara. O stack bruto
de HLS/PALSAR/ERA5/HAND/LULC é calculado uma vez por célula e ano, persistido
como imagem tipada e reutilizado pela matriz e pela predição.

## Grafo

```text
V03/SAMPLES/footprint_pantanal_2023
                ↓
0_contract → 1_preflight_sources → 2_0_check_footprint
                                      ↓
                         2_1_export_covariate_tiles
                                      ↓
                         2_2_data_matrix_from_assets
                                      ↓
                              3_model_training
                                      ↓
                      4_spatial_prediction_from_assets
                                      ↓
                                  5_merge
                                      ↓
                                    6_qa
```

## Por que é mais barata

Na v03, cada batch da matriz referencia novamente o stack bruto. Na v04, o
stack é materializado uma vez em `COVARIATES/`; a matriz só lê imagens locais
já tipadas. O batch inicial da matriz sobe de 500 para 2.000 amostras.

## Tipos

| Grupo | Tipo |
|---|---|
| Índices, PALSAR, HAND e clima | `Float32` |
| Classes geomorfológicas e LULC | `Uint8` |
| Predições | `Float32` |

## Assets

Base:
`projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V04/`

| Balde | Conteúdo |
|---|---|
| `COVARIATES/` | `covariates_v04_tileNN_pNN_AAAA` |
| `MATRIX/` | `agc_matrix_v04_tileNN_pNN_AAAA_batchNNN` |
| `MODELS/` | `rf_agc_v04` |
| `PREDICTIONS/COL/` | ImageCollection de predições por célula/ano |
| `PREDICTIONS/` | merges anuais (`agc_pred_v04_merged_AAAA`), irmãos da `COL` |

As predições são exportadas **dentro da ImageCollection** `PREDICTIONS/COL`
(criada automaticamente pelo `ensureImageCollection`, via `ee.data.createAsset`),
cada uma com as propriedades `year`, `cell_id` e `system:time_start`. O
`5_merge` lê a `COL` filtrada por `year` e exporta o mosaico anual como irmão,
com nome simples. Se a `COL` existir como pasta, o script avisa para
excluir/recriar.

## Execução inicial

1. Execute `1_preflight_sources` para uma área de teste.
2. Execute `2_0_check_footprint`.
3. Execute `2_1_export_covariate_tiles`; por padrão ele seleciona tiles com
   área e footprints dentro do polígono real do Pantanal.
4. Confirme os assets em `COVARIATES/`.
5. Execute `2_2_data_matrix_from_assets`.
6. Execute `3_model_training` e rode a task `rf_agc_v04`.
7. Execute `4_spatial_prediction_from_assets`; a ImageCollection
   `PREDICTIONS/COL` é criada automaticamente e os exports entram nela.
8. Confirme uma predição concluída antes de expandir `YEARS` e tiles.
9. Execute `5_merge` e depois `6_qa`.

Após validar o smoke test, expanda `YEARS` no script 2.1 e depois execute a
predição para os assets COVARIATES produzidos.
