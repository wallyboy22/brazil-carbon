"""
MAPBIOMAS-CARBONO · Pantanal Forest v08 — 2_3_2_GCN_CELL02_DIAGNOSTICO.py
==========================================================================
Célula 02 · Diagnóstico da matriz (Fase 0 da consulta v08).
Rodar em Colab após a célula 00 (util) e 01 (auth/drive). Cole o conteúdo,
usando CONF/funções já carregadas no namespace pela célula 00.

Roda para CADA fonte disponível (auto = gedi e/ou ifn) em sequência; com
`CONF['SOURCE']` fixo, roda só aquela. Grava em `<VERSION>_<SOURCE>/figures/`.

Gera a biblioteca de figuras:
  f1_alvo_distribuicao.png   distribuição do alvo agbd (linear/log)
  f2_correlacao_bandas.png   matriz de correlação de Pearson das covariáveis
  f3_residuo_x_agbd_se.png   resíduo do RF baseline × erro do rótulo (agbd_se)
                             ou × agbd observado (IFN, sem agbd_se)
  f4_moran_variograma.png    Moran's I + variograma dos resíduos (A2-3/4)
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold
from scipy.stats import pearsonr

print("=" * 68)
print("v08 · cell02 · diagnóstico da matriz")
print("=" * 68)

for _src in sources_to_run():
    CONF["SOURCE"] = _src
    print("\n" + "#" * 68)
    print(f"# FONTE: {_src} · contexto {context_name()} · {fig_dir()}")
    print("#" * 68)

    df = load_matrix(_src)
    df, dropped = clean_features(df)
    if dropped:
        print("[AVISO] bandas descartadas (>% de ausente):", dropped)
    coords_m = coordinates_meters(df)
    df["_block"] = spatial_blocks(df)

    FEATS = [c for c in df.columns if c not in
             (CONF["TARGET"], CONF["WEIGHT_COL"], CONF["LON"], CONF["LAT"],
              CONF["AGBD_SE"], "_block", "geometry", "cell_id", "year", "decimal")]
    X = df[FEATS].fillna(df[FEATS].median())
    y = df[CONF["TARGET"]].values

    # --- f1: distribuição do alvo ---------------------------------------------
    fig, ax = plt.subplots(1, 2, figsize=(11, 4))
    ax[0].hist(y, bins=60, color="#1a9850", edgecolor="white")
    ax[0].set(xlabel="agbd (t/ha)", ylabel="n", title="Alvo original")
    ax[1].hist(np.log1p(y), bins=60, color="#2b83ba", edgecolor="white")
    ax[1].set(xlabel="ln(1+agbd)", title="Alvo log — cauda alta estabilizada")
    fig.suptitle(f"f1 · distribuição do alvo — {_src}", fontweight="bold")
    save_fig(fig, "f1_alvo_distribuicao.png")

    # --- f2: correlação de Pearson --------------------------------------------
    corr = X.corr()
    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(corr.values, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(corr))); ax.set_yticks(range(len(corr)))
    ax.set_xticklabels(corr.columns, rotation=90, fontsize=6)
    ax.set_yticklabels(corr.columns, fontsize=6)
    fig.colorbar(im, ax=ax, shrink=0.6, label="Pearson r")
    ax.set_title(f"f2 · correlação entre covariáveis — {_src}")
    save_fig(fig, "f2_correlacao_bandas.png")
    red_m = np.sum(np.abs(corr.values) > 0.85) // 2
    print(f"[CORRELAÇÃO] pares com |r|>0.85: {red_m}")

    # --- RF baseline com CV espacial (blocos) → resíduos ----------------------
    cv = GroupKFold(n_splits=CONF["CV_FOLDS"])
    resid, ids_ = np.zeros(len(y)), np.zeros(len(y), dtype=bool)
    for k, (tr, va) in enumerate(cv.split(X, y, df["_block"]), 1):
        print(f"[BASELINE] fold {k}/{CONF['CV_FOLDS']} · treino={len(tr)} · val={len(va)}")
        m = RandomForestRegressor(n_estimators=CONF["N_ESTIMATORS_DIAG"],
                                  max_features="sqrt", min_samples_leaf=5,
                                  n_jobs=-1, random_state=CONF["RANDOM_STATE"])
        m.fit(X.iloc[tr], y[tr])
        resid[va] = y[va] - m.predict(X.iloc[va])
        ids_[va] = True
    baseline_rmse = float(np.sqrt(np.mean(resid ** 2)))
    print(f"[BASELINE] RMSE espacial: {baseline_rmse:.2f} t/ha · n_valid {ids_.sum()}")

    # --- f3: resíduo × (agbd_se no GEDI; agbd observado na IFN) ---------------
    xcol = CONF["AGBD_SE"] if CONF["AGBD_SE"] in df.columns else CONF["TARGET"]
    xlabel = ("agbd_se (erro do rótulo)" if xcol != CONF["TARGET"]
              else "agbd observado (sem agbd_se)")
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.scatter(df.loc[ids_, xcol], resid[ids_], s=8, alpha=0.4, color="#2b83ba")
    ax.axhline(0, color="black", lw=0.8)
    corr_r, corr_p = pearsonr(df.loc[ids_, xcol].values, resid[ids_])
    ax.set(xlabel=xlabel, ylabel="resíduo (y−ŷ)",
           title=f"f3 · resíduo × {xcol} (r={corr_r:.2f}) — {_src}")
    save_fig(fig, "f3_residuo_x_agbd_se.png")

    # --- f4: Moran's I + variograma -------------------------------------------
    I, p, n_pairs = moran_i(resid[ids_], coords_m[ids_], band_m=90.0)
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.2))
    a1.scatter(df.loc[ids_, CONF["LON"]], df.loc[ids_, CONF["LAT"]],
               c=resid[ids_], s=6, cmap="RdBu_r")
    a1.set(xlabel="lon", ylabel="lat", title=f"resíduos espaciais (I={I:.2f}, p={p:.2f})")
    mid, gamma = variogram(resid[ids_], coords_m[ids_])
    if len(mid):
        a2.plot(mid, gamma, "-o", color="#1a9850")
    a2.set(xlabel="distância (m)", ylabel="semivariância",
           title="f4 · variograma dos resíduos")
    fig.suptitle(f"f4 · autocorrelação residual — {_src}", fontweight="bold")
    save_fig(fig, "f4_moran_variograma.png")
    print(f"[MORAN] I={I:.3f} · pseudo-p={p:.3f} · pairs(90m)={n_pairs}  ")

    # --- diagnostico.json: alimenta o relatório (célula 06) -------------------
    write_artifact(fig_dir() / "diagnostico.json",
                   {"source": _src,
                    "baseline_rmse": baseline_rmse,
                    "baseline_bias_pct": float(np.mean(resid[ids_]) / np.mean(y) * 100),
                    "collinear_pairs_gt085": int(red_m),
                    "moran_i": float(I), "moran_p": float(p),
                    "moran_pairs_90m": int(n_pairs),
                    "resid_x_col": xcol, "resid_x_pearson_r": float(corr_r)})

    print()
    print("[FIGURAS GERADAS]")
    for f in manifest():
        print("  ", f)
print("=" * 68)
