"""
MAPBIOMAS-CARBONO · Pantanal Forest v08 — 2_3_3_GCN_CELL03_CV_REGULARIZACAO.py
==============================================================================
Célula 03 · Validação espacial e regularização (Fases 0/2 da consulta v08).
Rodar em Colab após as células 00 (util), 01 (auth) e 02 (diagnóstico).
Cole o conteúdo, usando CONF/funções já carregadas no namespace pela célula 00.

Decisões (resposta da consulta):
  - CV SEMPRE espacial em blocos ~BLOCK_M (nunca amostragem aleatória)
  - varredura de minLeafPopulation (5/10/20/30) → regularização direta (C11)
  - compara RF × GBM × SVM (C13) + curva de aprendizado (A2)
  - avaliação log(1+agbd) com fator de Duan (B7)

Gera figuras (na mesma pasta de output) + escreve gate_state.json, consumido
pela célula 2_3_5 (champion).
"""
from __future__ import annotations

import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import GroupKFold
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.base import clone
from pathlib import Path

print("=" * 68)
print("v08 · cell03 · CV espacial + regularização")
print("=" * 68)

df = load_matrix()
df, dropped = clean_features(df)
df["_block"] = spatial_blocks(df)
FEATS = [c for c in df.columns if c not in
         (CONF["TARGET"], CONF["WEIGHT_COL"], CONF["LON"], CONF["LAT"],
          CONF["AGBD_SE"], "_block", "geometry", "cell_id", "year")]
X = df[FEATS].fillna(df[FEATS].median())
y = df[CONF["TARGET"]].values
cv = GroupKFold(n_splits=CONF["CV_FOLDS"])
n = len(y)
print(f"[DADOS] n={n} · feats={X.shape[1]} · blocos={df['_block'].nunique()}")


def blocked_cv(estimator, X_, y_, blocks, scale=False):
    """CV espacial em blocos; retorna (rmse, pbias)."""
    fold = []
    for tr, va in cv.split(X_, y_, blocks):
        m = clone(estimator)
        Xtr, Xva = X_.iloc[tr], X_.iloc[va]
        if scale:
            m = make_pipeline(StandardScaler(), m)
        m.fit(Xtr, y_[tr])
        r = y_[va] - m.predict(Xva)
        fold.append((r, y_[va]))
    rr = np.concatenate([f[0] for f in fold])
    yy = np.concatenate([f[1] for f in fold])
    rmse = float(np.sqrt(np.mean(rr ** 2)))
    pbias = float(np.mean(rr) / np.mean(yy) * 100)
    return rmse, pbias


# --- CV espacial com log + Duan (implementação dedicada) ---------------------
def smeared_blocked_cv(log_on=True, offset=None):
    offset = CONF["LOG_OFFSET"] if offset is None else offset
    folds = []
    for tr, va in cv.split(X, y, df["_block"]):
        m = RandomForestRegressor(
            n_estimators=CONF["N_ESTIMATORS"], max_features="sqrt",
            min_samples_leaf=5, random_state=CONF["RANDOM_STATE"])
        ytr = (np.log1p(y[tr]) if offset == 1 else np.log(y[tr])) if log_on else y[tr]
        m.fit(X.iloc[tr], ytr)
        pred = m.predict(X.iloc[va])
        if log_on:
            res_fold = ytr - m.predict(X.iloc[tr])
            smear = float(np.mean(np.exp(res_fold)))
            pred = np.exp(pred) * smear - (offset if offset == 1 else 0.0)
        folds.append((y[va] - pred, y[va]))
    rr = np.concatenate([f[0] for f in folds]); yy = np.concatenate([f[1] for f in folds])
    return float(np.sqrt(np.mean(rr ** 2))), float(np.mean(rr) / np.mean(yy) * 100)


# --- f5: RF × GBM × SVR -----------------------------------------------------
algs = {
    "RF (sqrt, leaf=5)": RandomForestRegressor(
        n_estimators=CONF["N_ESTIMATORS"], max_features="sqrt",
        min_samples_leaf=5, random_state=CONF["RANDOM_STATE"]),
    "GBM (lr=0.05, depth=4, n=120)": GradientBoostingRegressor(
        n_estimators=120, learning_rate=0.05, max_depth=4,
        random_state=CONF["RANDOM_STATE"]),
    "SVR (RBF)": SVR(C=10, epsilon=1.0),
}
res_algs = {}
for name, est in algs.items():
    rmse, pbias = blocked_cv(est, X, y, df["_block"],
                             scale=(name.startswith("SVR")))
    res_algs[name] = {"rmse": rmse, "pbias": pbias}
    print(f"[ALG] {name:38s} RMSE={rmse:6.2f} · bias={pbias:6.2f}%")

fig, ax = plt.subplots(figsize=(6.5, 4))
names = list(res_algs); vals = [res_algs[k]["rmse"] for k in names]
ax.bar(names, vals, color="#2b83ba")
ax.set(ylabel="RMSE espacial (Mg/ha)", title="f5 · RF × GBM × SVR (CV em blocos)")
ax.set_xticks(range(len(names)))
ax.set_xticklabels(names, rotation=22, ha="right")
save_fig(fig, "f5_cv_algoritmos.png")

# --- f6: curva de aprendizado (A2) ------------------------------------------
fractions = [0.2, 0.4, 0.6, 0.8, 1.0]
lc = {}
for frac in fractions:
    rmses = []
    for seed in range(2):
        rng = np.random.default_rng(seed)
        idx = rng.choice(n, int(n * frac), replace=False)
        Xs, ys = X.iloc[idx], y[idx]
        flds = []
        for tr, va in cv.split(Xs, ys, df["_block"].iloc[idx].to_numpy()):
            m = RandomForestRegressor(n_estimators=200, max_features="sqrt",
                                      min_samples_leaf=5, random_state=seed)
            m.fit(Xs.iloc[tr], ys[tr])
            flds.append(ys[va] - m.predict(Xs.iloc[va]))
        rmses.append(np.sqrt(np.mean(np.concatenate(flds) ** 2)))
    lc[frac] = float(np.mean(rmses))
    print(f"[CURVA] frac={frac:.0%} → RMSE={lc[frac]:.2f} Mg/ha")
fig, ax = plt.subplots(figsize=(6.5, 4))
ax.plot(list(lc), list(lc.values()), "-o", color="#1a9850")
ax.set(xlabel="fração do treino", ylabel="RMSE espacial (Mg/ha)",
       title="f6 · curva de aprendizado")
save_fig(fig, "f6_curva_aprendizado.png")

# --- f7: varredura minLeafPopulation -----------------------------------------
sweep = {}
for mlf in CONF["MIN_LEAF_CANDIDATES"]:
    est = RandomForestRegressor(n_estimators=CONF["N_ESTIMATORS"],
                                max_features="sqrt", min_samples_leaf=mlf,
                                random_state=CONF["RANDOM_STATE"])
    rmse, pbias = blocked_cv(est, X, y, df["_block"])
    sweep[mlf] = {"rmse": rmse, "pbias": pbias}
    print(f"[MINLEAF] {mlf:3d} → RMSE={rmse:6.2f} · bias={pbias:6.2f}%")
best_mlf = min(sweep, key=lambda k: sweep[k]["rmse"])
fig, ax = plt.subplots(figsize=(6.5, 4))
ax.plot(list(sweep), [sweep[k]["rmse"] for k in sweep], "-o", color="#d73027")
for k, v in sweep.items():
    ax.annotate(f"{v['rmse']:.2f}", (k, v["rmse"]), textcoords="offset points",
                xytext=(0, 6), ha="center", fontsize=8)
ax.set(xlabel="minLeafPopulation", ylabel="RMSE espacial (Mg/ha)",
       title=f"f7 · varredura minLeaf (melhor={best_mlf})")
save_fig(fig, "f7_sweep_minleaf.png")

# --- f8: log(1+agbd) × linear + fator de Duan (B7) ---------------------------
rmse_lin, bias_lin = smeared_blocked_cv(log_on=False)
rmse_log, bias_log = smeared_blocked_cv(log_on=True)
smear = None
fig, ax = plt.subplots(figsize=(6.5, 4))
ax.bar(["agbd", "ln(1+agbd)"], [rmse_lin, rmse_log], color=["#525252", "#2b83ba"])
ax.set(ylabel="RMSE espacial (Mg/ha)",
       title=f"f8 · objetivo linear vs log (bias {bias_lin:.1f}% / {bias_log:.1f}%)")
save_fig(fig, "f8_log_target.png")
print(f"[LOG] linear RMSE={rmse_lin:.2f} · log RMSE={rmse_log:.2f}")

# --- estado persistido para a célula champion --------------------------------
state = {
    "minleaf_sweep": sweep,
    "min_leaf_best": best_mlf,
    "algorithms": res_algs,
    "learning_curve": lc,
    "log_eval": {"rmse_linear": rmse_lin, "bias_linear": bias_lin,
                 "rmse_log": rmse_log, "bias_log": bias_log,
                 "log_offset": CONF["LOG_OFFSET"]},
    "n_features": X.shape[1],
    "n_rows": n,
    "n_blocks": int(df["_block"].nunique()),
}
out = Path(CONF["DRIVE_ROOT"]) / CONF["FIG_DIR"] / "gate_state.json"
write_artifact(out, state)
print()
print("[FIGURAS GERADAS]")
for f in manifest():
    print("  ", f)
print("=" * 68)