# Pantanal Forest v07 · Pipeline de Carbono

**v07 = regularização + incerteza do rótulo + ensemble determinístico.**
Traduz as decisões de `mapbiomas-carbono-v07-consulta-estrategica.md`:
treino sem pesos (GEE não suporta `weightProperty`; a coluna `w=1/agbd_se²`
segue na matriz para uso futuro), `minLeafPopulation` (champion offline),
ensemble RF N=5 (mediana + stdDev) e máscara LULC **apenas no treino** (a
predição não é mascarada). O portão/validação roda no Google Colab
(`2_3_gcn`).

## Arquivos (GEE = Earth Engine, .js)

| Fluxo | Arquivo | O que faz |
|------|---------|-----------|
| 0 | `0_contract.js` | contrato + champion (preencher de `champion.json`) |
| 0 | `0_covariate_source.js` | máscara de treino (LULC 3,4,6,7,49 + `TRAINING_MASKS`), pilha tipada, bandas por membro do ensemble |
| 1 | `1_preflight.js` | mostra máscara de treino + pilha de covariáveis |
| 2 | `2_0_check_footprint.js` | raw vs amostras de treino (contagem/PFT) |
| 2 | `2_1_toAsset_samples_treino.js` | exporta footprints TREINO → Asset `SAMPLES/forest_footprint_v07_<ANO>` |
| 2 | `2_2_toDrive_matrix.js` | matriz por célula×ano → Drive CSV + Asset (`lon,lat,w=1/se²`) |
| 2 | `2_3_gcn/` (Colab) | diagnóstico, CV espacial, thinning, champion → `figures/` + `champion.json` |
| 3 | `3_model_training.js` | N=5 RF (sem pesos, minLeaf, bag 0.8, bandas 0.8) → `MODELS/rf_agc_v07_m1..mN` |
| 4 | `4_spatial_prediction.js` | ensemble → mediana + stdDev, sem máscara LULC → `PREDICTIONS/COL` |
| 5 | `5_merge.js` | mosaico anual `PREDICTIONS/agc_pred_v07_merged_<ano>` |
| 6 | `6_qualidade.js` | QA: v07 vs V03–V06 (coleções anteriores), stdDev de incerteza |

> GEE: rodar arquivos na ordem 0→6. `2_3_gcn` roda fora do GEE (veja `2_3_gcn/README.md`).

## Fluxo do gate offline (decisões-chave)

1. **Diagnóstico (cell01)**: distribuição do alvo, correlação das bandas,
   resíduo baseline × `agbd_se`, Moran's I + variograma. Figuras `f1..f4`.
2. **CV espacial (cell02)**: sempre em **blocos espaciais** (nunca aleatória);
   RF×GBM×SVR, curva de aprendizado, varredura `minLeafPopulation`
   (5/10/20/30), avaliação log(1+agbd) com fator de Duan. `f5..f8`.
3. **Thinning (cell03)**: OFF-LINE em grade **60–90 m** mantendo o footprint de
   **menor `agbd_se`** por célula; matriz thinned → `samples_thinned_v07.csv`.
   `f9/f10`.
4. **Champion (cell04)**: decide `log_target`, `minLeaf` e escreve
   **`champion.json`** (importância de permutação `f11`). **Copie os valores
   para `0_contract.js`** e rode o 3/4.

As figuras são salvas na **mesma pasta de output** no Drive e depois baixadas
para `2_3_gcn/figures/`.

## Champion → contrato

Os campos `MIN_LEAF_POP`, `VARIABLES_PER_SPLIT`, `LOG_TARGET`, `LOG_OFFSET`,
`SMEAR_FACTOR` e `ENSEMBLE` já estão preenchidos com o champion do gate
(10/09/2026). Ao re-rodar o `2_3_gcn/`, atualize a partir de
`2_3_gcn/figures/champion.json`; o contrato anterior fica arquivado em
`archive_contracts/0_contract_v07_pre-champion.js`.

## Smoke test / auditoria

Defina `SMOKE_CELLS` (ids reais da grade impressos no passo 4) para preservar,
nessas células, as bandas membro `m1..mN` do ensemble no export — auditoria da
variabilidade entre membros (F25).

## Próximos passos (fora do escopo desta rodada)

- **2019–2022**: pipeline que extrai footprints GEDI por ano (novo) antes de
  ampliar `TRAIN_YEARS`.
- **Toneladas por classe de cobertura**: estatística de somas de `agbd`
  (com incerteza propagada do ensemble) por classe C11, usando a mesma estratégia
  matriz→colab do gate.
- Modelo "especialista" GEDI para `log(agbd)` regional (alternativa de longo prazo).