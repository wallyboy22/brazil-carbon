"""Cell 03 — Ajuste do modelo de biomassa com os dados de campo.

Modelo portável para o GEE (mesma forma da v01, reestimada no Pantanal):

    ln(biomassa_kg_ha) = intercept + b·red + c·swir1 + d·swir2

Métricas no espaço log: R², RMSE(log) e biólogo-equivalente (RMSE% ≈ 100·σln).
Critério de aceite (reflexao_v02.md, F20):
  · |%Biase|< 15% e RMSE% < 65% → bom para v02;
  · senão: manter Pampa (source='pampa_provisorio') e aguardar mais parcela.

A ponta em vegetação de faixa estreita costuma dar swir2 anti-correlacionado;
if o fit piora vs Pampa, fica documentado aqui e não substitui o contrato.
"""
import os

import numpy as np
import pandas as pd

from cell00_util import GATE, save_model

CSV = os.path.join(GATE, "matriz_campo.csv")
B = "biomass_kg_ha"
X = ["red_mean", "swir1_mean", "swir2_mean"]

if not os.path.exists(CSV):
    print("CSV da matriz não encontrado:", CSV)
    raise SystemExit(1)

df = pd.read_csv(CSV)
df = df[df[B] > 0].dropna(subset=[B] + X).reset_index(drop=True)
if len(df) < 20:
    print(f"Apenas {len(df)} parcelas — calibração provisória; "
          "mantenha os coeficientes do Pampa no contrato até ≥ 30.")
    raise SystemExit(0)

y = np.log(df[B].values)
A = np.column_stack([np.ones(len(df)), df[X].values])
coef, *_ = np.linalg.lstsq(A, y, rcond=None)
names = ["intercept", "red", "swir1", "swir2"]
coef = dict(zip(names, coef))

yhat = A @ [coef[n] for n in names]
resid = y - yhat
ss_tot = ((y - y.mean()) ** 2).sum()
r2_log = 1 - (resid ** 2).sum() / ss_tot
rmse_log = float(np.sqrt((resid ** 2).mean()))
print(f"N parcelas: {len(df)}")
print("Coeficientes:", {k: round(v, 5) for k, v in coef.items()})
print(f"R²(log): {r2_log:.3f} | RMSE(log): {rmse_log:.3f} | RMSE% ≈ {100*rmse_log:.1f}%")

# Validação OLS residual: apontar viés por estrato úmido.
wet = df["ndwi_mean"] > 0
print("Viés médio (log) em parcelas úmidas:", round(float(resid[wet.values].mean()), 4),
      "| secas:", round(float(resid[~wet.values].mean()), 4))

metrics = {"r2_log": r2_log, "rmse_log": rmse_log,
           "rmse_pct": 100 * rmse_log,
           "bias_wet_log": float(resid[wet.values].mean()),
           "bias_dry_log": float(resid[~wet.values].mean())}
if abs(100 * np.exp(rmse_log) - 100) > 65:
    print("RMSE% acima do aceite (65%). Sugestão: NÃO trocar o contrato ainda;")
    print("colher parcelas adicionais e refazer o fit.")
    raise SystemExit(0)

save_model(coef, metrics, n=len(df))
print("\nAgora: copie coefficients/source do biomass_model.json para "
      "grassland/v02/0_contract.js (BIOMASS_MODEL).")