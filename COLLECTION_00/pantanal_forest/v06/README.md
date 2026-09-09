# pantanal_forest/v06 — Universo florestal filtrado

A v06 restringe explicitamente o universo de treino e o produto final às
formações florestais da Coleção 11.

## Máscara florestal

```text
classification_YYYY ∈ {3, 4, 6, 7, 49}
```

Classes usadas:

- `3` Formação Florestal;
- `4` Savana-Estépica Florestada;
- `6` Floresta Aluvial;
- `7` Savana Alagada;
- `49` Restinga Arbórea.

## Grafo

```text
1_preflight
    ↓
2_0_check_footprint
    ↓
2_1_filter_footprint
    ↓
2_2_data_matrix
    ↓
3_model_training
    ↓
4_spatial_prediction
    ↓
5_merge
    ↓
6_qa
```

O `2_1_filter_footprint` cria o universo persistido:

```text
V06/SAMPLES/forest_footprint_v06_2023
```

A matriz é regenerada a partir desse universo. A v06 não reutiliza diretamente
a matriz v05, pois o filtro de entrada mudou.

## Máscara temporal

`MASK_MODE = prediction_year`: cada predição usa a classificação florestal do
próprio ano. A matriz inicial usa `classification_2023`.

## Estrutura de predições

As predições por célula são exportadas **dentro da ImageCollection**
`PREDICTIONS/COL` (não em uma pasta). O mosaico anual consolidado sai como
**irmão da COL**, com nome simples, no mesmo `PREDICTIONS/`:

```text
V06/PREDICTIONS/                       ← pasta (ensureFolder)
├── COL/                               ← ImageCollection (criar manualmente)
│   ├── agc_pred_v06_<célula>_<ano>
│   └── ...
└── agc_pred_v06_merged_<ano>          ← merge, irmão da COL, nome simples
```

Cada imagem da COL carrega as propriedades `year`, `cell_id` e
`system:time_start` (1º de janeiro do ano), usadas pelo `5_merge`.

A ImageCollection `PREDICTIONS/COL` é criada **automaticamente** pelo helper
`ensureImageCollection` (mecanismo `ee.data.createAsset`), chamado no
`4_spatial_prediction` — não é necessário criar manualmente via Assets. Se um
asset com o mesmo nome já existir como pasta, o script emite aviso para
excluir/recriar.

## Execução

1. Execute `1_preflight`.
2. Execute `2_0_check_footprint`.
3. Execute `2_1_filter_footprint` e rode a task do novo footprint.
4. Execute `2_2_data_matrix`.
5. Execute `3_model_training` e rode a task do modelo.
6. Execute `4_spatial_prediction` — a ImageCollection `PREDICTIONS/COL` é criada
   automaticamente e os exports entram nela.
7. Use `ADD_LAYER=true` para visualizar somente a área florestal.
8. Execute `5_merge` (mosaico por ano, irmão da COL) e `6_qa`.
