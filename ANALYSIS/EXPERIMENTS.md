# EXPERIMENTS — Registro de experimentos (análise offline)

> Uma linha por experimento avaliado no `offline_agc_analysis.py` (Colab).
> Cada execução cola o `analysis_summary.json` gerado. **Só quem passa no gate
> (champion) dispara o `3_modelling`** — predição massiva é cara.

## Tabela-resumo

| Tag | Data | Commit | Eixos (modelo/cov/ano/amostras) | Inputs (Drive/MATRIX) | RMSE | R² | bias | Status |
|-----|------|--------|--------------------------------|-----------------------|------|----|------|--------|
| `v01_rf` | — | — | RF · full · 2023 · baseline | `GEE_Exports_AGC-v01` · `MATRIX/agc_matrix_v01` | — | — | — | pendente |
| `v01_gbm` | — | — | GBM · full · 2023 | idem | — | — | — | pendente |
| `v01_svm` | — | — | SVM · full · 2023 | idem | — | — | — | pendente |
| `v01_thin1px` | — | — | RF · full · 1 amostra/pixel | idem | — | — | — | pendente |
| `v01_drop_iso` | — | — | RF · full · sem anômalos IF | idem | — | — | — | pendente |
| `v01_no_palsar` | — | — | RF · sem PALSAR · 2023 | idem | — | — | — | pendente |
| `v01_no_clima` | — | — | RF · sem clima · 2023 | idem | — | — | — | pendente |

> Champion = menor RMSE no split espacial. Ao decidir, marque `champion` e use
> o `MODEL_TYPE`/`SUBVERSION` correspondente no `3_modelling`.

## Bloco de decisão (colar de cada run)

```json
{
  "versao": "v01",
  "ano": 2023,
  "grid": "pantanal",
  "n_amostras": null,
  "n_covariaveis": 36,
  "resultados": { "rf": {}, "gbm": {}, "svm": {} },
  "subversoes_candidatas": {},
  "melhor": "",
  "recomendacao": ""
}
```

## Governança

- **Subversão** (`v01_<tag>`): subconjunto de covariáveis, ano/janela,
  hiperparâmetros, semente, filtros de qualidade, **ou modelo de ML diferente
  com as mesmas covariáveis** (RF↔GBM↔SVM).
- **Nova versão** (`v02`): novo alvo, novo stack (bandas/famílias → regenera
  matriz), novo universo de amostras (região/bioma/anos mesclados), nova
  extensão espacial.
- **Promoção**: champion validado também no GEE → baseline congelado da
  próxima versão.
