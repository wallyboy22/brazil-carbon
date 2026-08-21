# ANALYSIS — Análise offline AGC (fora do GEE)

> Estágio **intermediário** entre a matriz (`2_data_matrix`) e a predição
> massiva (`3_modelling`). Roda fora do GEE (Colab/CPU local) sobre o
> **universo de amostras exportado para o Google Drive**, para decidir — com
> métricas e custo baixo — **quais subversões/versão** valem a predição do
> território inteiro.
>
> **Regra de custo:** aqui é barato; predição massiva a 30 m é cara (EECU alto).
> Só quem passa no gate (champion) dispara o `3_modelling`.

## Fluxo

```
2_data_matrix (EXPORT_TO_DRIVE=true) → Drive: GEE_Exports_AGC-v01/*.csv
        │
        ▼
offline_agc_analysis.py (Colab)
   EDA → redundância (variáveis+amostras+Isolation Forest)
       → split espacial → RF/GBM/SVM → CV → decisão
        │
        ▼ GATE
   "v01_<tag>" champion → 3_modelling (predição massiva)
```

## Como usar

1. **Exportar o universo** para o Drive: no `2_data_matrix`, ligue
   `EXPORT_TO_DRIVE = true` (batches de 10.000) e rode. Saídas em
   `GEE_Exports_AGC-v01/`: `GEDI_L4A_AGB_2023_pantanal_filtered.csv` +
   `AGC_samples_pantanal_2023_batch001.csv…`.
2. **Rodar a análise**: abra `offline_agc_analysis.py` no Colab (ou qualquer
   Python ≥3.10), ajuste `DRIVE_FOLDER`/ano e execute célula a célula
   (separadores `# %%`).
3. **Registrar o experimento**: cole o resumo gerado no `EXPERIMENTS.md`
   (tabela) com tag, params, inputs, métricas e status.
4. **Decidir**: o champion (melhor RMSE/R²/bias no split espacial) vira
   `MODEL_TYPE` + `SUBVERSION` no `3_modelling` e dispara a predição.

## O que o script entrega

| Bloco | Saída |
|---|---|
| EDA | distribuição do `agbd`, outliers, NaN, resumo por estrato |
| Redundância (variáveis) | matriz de correlação, clusters de bandas, VIF → sugestões de drop |
| Redundância (amostras) | duplicatas de pixel, spatial thinning, balanço por estrato |
| Isolation Forest | relatório de anômalos (+ por estrato), impacto medido |
| Split espacial | treino/teste anti-vazamento (blocos espaciais) |
| Modelos | RF / GBM / SVR espelhando o GEE, comparativo de métricas |
| Decisão | `analysis_summary.md` com recomendação (modelo, params, tag) |

## Mapeamento GEE ↔ sklearn

| GEE (3_modelling) | Python (offline) |
|---|---|
| `smileRandomForest` (numberOfTrees, bagFraction) | `RandomForestRegressor(n_estimators, max_samples=bagFraction, random_state=seed)` |
| `smileGradientTreeBoost` (numberOfTrees, shrinkage, samplingRate) | `GradientBoostingRegressor(n_estimators, learning_rate=shrinkage, subsample=samplingRate)` |
| `libsvm` (EPSILON_SVR, RBF, gamma, cost, epsilon) | `SVR(kernel='rbf', gamma, C=cost, epsilon)` — ⚠️ lento em dataset grande → subsample |

## Convenções

- Scripts **versionados** (`.py` Colab-ready); notebooks `.ipynb` ficam locais
  (ver `.gitignore` do repo).
- Tags de subversão seguem o padrão `v01_<tag>` (ver governança no README da v01).
- Toda execução gera/atualiza uma linha no `EXPERIMENTS.md`.
