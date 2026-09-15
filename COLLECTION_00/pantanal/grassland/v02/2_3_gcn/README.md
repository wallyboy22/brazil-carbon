# 2_3_gcn · Calibração da biomassa grassland v02

Gate offline que **treina o modelo de biomassa com as parcelas de campo** do
Pantanal e devolve o `biomass_model.json` para o contrato da v02.

## Fluxo

```text
2_1_amostras_campo_toAsset.js   → matriz de calibração (asset + CSV Drive)
        │
        ▼
[Drive] MAPBIOMAS_CARBONO_CAMPO/matriz_campo_2023.csv  → baixar para esta pasta
        │
        ▼
cell02_diagnostico_matriz.py  → distribuições, N, estrato úmido × seco
cell03_fit_model.py           → fit OLS ln(B) ~ red+swir1+swir2 → biomass_model.json
        │
        ▼
Copiar coefficients/source de biomass_model.json para v02/0_contract.js
        │
        ▼
3_biomass.js  → predição em todo o bioma com o modelo CALIBRADO
```

## Pré-requisitos

- `matriz_campo.csv` baixado do Drive para esta pasta
  (nome ajustável no `cell02`/`cell03`).
- Python ≥ 3.9 com `numpy`, `pandas`, `matplotlib`.

## Critérios de aceite (reflexao_v02.md · F20)

| Métrica | Aceite v02 |
|---|---|
| N parcelas | ≥ 30 (20–30 só provisório) |
| RMSE% | < 65% |
| \|viés\| | < 15% |
| Faixa | biomassa plausível e > 20% de espectro |

Se o fit **não** passar, o contrato permanece em `source: 'pampa_provisorio'`
(clamp `[0.3, 12]` Mg/ha protege a produção); nada é trocado às cegas.

## Observações

- O modelo é **portável para o GEE** (forma log-linear idêntica à v01) —
  reestimado nos dados do Pantanal, não mais herdado do Pampa.
- RF/ML fora do GEE não é embutível na expressão server-side; fica como opção
  `ee.Classifier.smileRandomForest` (GEE nativo) se as parcelas justificarem.
- `cell01_auth.py` é opcional (re-sincronizar a matriz via EE).