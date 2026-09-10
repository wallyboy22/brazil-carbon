"""
MAPBIOMAS-CARBONO · Pantanal Forest v07 — 2_3_1_GCN_CELL01_DIAGNOSTICO.py
==========================================================================
Célula 01 · Diagnóstico da matriz (Fase 0 da consulta v07).
Rodar em Colab após a cell00. Aponta para o .py do fluxo salvo no Drive.

Gera a biblioteca de figuras (salvas NA MESMA pasta de output):
  f1_alvo_distribuicao.png   distribuição do alvo agbd (linear/log)
  f2_correlacao_bandas.png   matriz de correlação de Pearson das covariáveis
  f3_residuo_x_agbd_se.png   resíduo do RF baseline × erro do rótulo (A2-3)
  f4_moran_variograma.png    Moran's I + variograma dos resíduos (A2-3/4)
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor

import 2_3_util as u
from sklearn.model_selection import GroupKFold  # noqa: E402

print("=" * 68)
print("v07 · cell01 · diagnóstico da matriz")
print("=" * 68)

df = u.load_matrix()
df, dropped = u.clean_features(df)
if dropped:
    print("[AVISO] bandas descartadas (>% de ausente):", dropped)
coords_m = u.coordinates_meters(df)
df["_block"] = u.spatial_blocks(df)

FEATS = [c for c in df.columns if c not in
         (u.CONF["TARGET"], u.CONF["WEIGHT_COL"], u.CONF["LON"], u.CONF["LAT"],
          u.CONF["AGBD_SE"], "_block", "geometry", "cell_id", "year", "decimal")]
X = df[FEATS].fillna(df[FEATS].median())
y = df[u.CONF["TARGET"]].values
w = u.weights_1_se2(df[u.CONF["AGBD_SE"]].values)

# --- f1: distribuição do alvo -------------------------------------------------
fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].hist(y, bins=60, color="#1a9850", edgecolor="white")
ax[0].set(xlabel="agbd (Mg/ha)", ylabel="n", title="Alvo original")
ax[1].hist(np.log1p(y), bins=60, color="#2b83ba", edgecolor="white")
ax[1].set(xlabel="ln(1+agbd)", title="Alvo log — cauda alta estabilizada")
fig.suptitle("f1 · distribuição do alvo", fontweight="bold")
u.save_fig(fig, "f1_alvo_distribuicao.png")

# --- f2: correlação de Pearson ----------------------------------------------
corr = X.corr()
fig, ax = plt.subplots(figsize=(10, 8))
im = ax.imshow(corr.values, cmap="RdBu_r", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr))); ax.set_yticks(range(len(corr)))
ax.set_xticklabels(corr.columns, rotation=90, fontsize=6)
ax.set_yticklabels(corr.columns, fontsize=6)
fig.colorbar(im, ax=ax, shrink=0.6, label="Pearson r")
ax.set_title("f2 · correlação entre covariáveis (HLS→falta montar)")
u.save_fig(fig, "f2_correlacao_bandas.png")
red_m = np.sum(np.abs(corr.values) > 0.85) // 2
print(f"[CORRELAÇÃO] pares com |r|>0.85: {red_m}")

# --- RF baseline com CV espacial (blocos) → resíduos ------------------------
cv = GroupKFold(n_splits=u.CONF["CV_FOLDS"])
resid, ids_ = np.zeros(len(y)), np.zeros(len(y), dtype=bool)
lo, hi = np.percentile(df[u.CONF["LON"]]), np.percentile(df[u.CONF["LAT"]])
for tr, va in cv.split(X, y, df["_block"]):
    m = RandomForestRegressor(n_estimators=u.CONF["N_ESTIMATORS"],
                              max_features="sqrt", min_samples_leaf=5,
                              random_state=u.CONF["RANDOM_STATE"])
    m.fit(X.iloc[tr], y[tr], sample_weight=w[tr])
    resid[va] = y[va] - m.predict(X.iloc[va])
    ids_[va] = True
print(f"[BASELINE] RMSE espacial: {np.sqrt(np.mean(resid ** 2)):.2f} Mg/ha · "
      f"n_valid {ids_.sum()}")

# --- f3: resíduo × agbd_se ---------------------------------------------------
fig, ax = plt.subplots(figsize=(7, 5))
ax.scatter(df.loc[ids_, u.CONF["AGBD_SE"]], resid[ids_], s=8, alpha=0.4,
           color="#2b83ba")
ax.axhline(0, color="black", lw=0.8)
corr_r, corr_p = np.corrcoef(df.loc[ids_, u.CONF["AGBD_SE"]], resid[ids_])[0, 1]
ax.set(xlabel="agbd_se (erro do rótulo GEDI)", ylabel="resíduo (y−ŷ)",
       title=f"f3 · resíduo × agbd_se (r={corr_r:.2f})")
u.save_fig(fig, "f3_residuo_x_agbd_se.png")

# --- f4: Moran's I + variograma ---------------------------------------------
I, p, n_pairs = u.moran_i(resid[ids_], coords_m[ids_], band_m=90.0)
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.2))
a1.scatter(df.loc[ids_, u.CONF["LON"]], df.loc[ids_, u.CONF["LAT"]],
           c=resid[ids_], s=6, cmap="RdBu_r")
a1.set(xlabel="lon", ylabel="lat", title=f"resíduos espaciais (I={I:.2f}, p={p:.2f})")
mid, gamma = u.variogram(resid[ids_], coords_m[ids_])
if len(mid):
    a2.plot(mid, gamma, "-o", color="#1a9850")
a2.set(xlabel="distância (m)", ylabel="semivariância",
       title="f4 · variograma dos resíduos")
fig.suptitle("f4 · autocorrelação residual", fontweight="bold")
u.save_fig(fig, "f4_moran_variograma.png")
print(f"[MORAN] I={I:.3f} · pseudo-p={p:.3f} · pairs(90m)={n_pairs}  ")

print()
print("[FIGURAS GERADAS]")
for f in u.manifest():
    print("  ", f)
print("=" * 68)