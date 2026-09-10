"""
MAPBIOMAS-CARBONO · Pantanal Forest v07 — 2_3_3_GCN_CELL03_THINNING_FIGURAS.py
==============================================================================
Célula 03 · Thinning espacial + biblioteca de figuras (Fase 1 da consulta v07).
Rodar em Colab após a cell02. Aponta para o .py do fluxo salvo no Drive.

Decisões (resposta da consulta A1/B6):
  - thinning OFF-LINE (grade espacial 60-90 m), mantendo por célula o footprint
    de MENOR agbd_se (mais confiável dentro da grade)
  - a matriz THINNED é exportada para o Drive (samples_thinned_v07.csv) e é a
    que alimenta o treino/validação server-side (3_) via Assets reexportados
  - gera as figuras de antes×depois na MESMA pasta de output
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

import 2_3_util as u

print("=" * 68)
print("v07 · cell03 · thinning espacial + figuras")
print("=" * 68)

df = u.load_matrix()
df, dropped = u.clean_features(df)

print(f"[ANTES] n={len(df)}")
fig, axes = plt.subplots(1, 2, figsize=(12, 4.6))
for ax, (th, tag) in zip(axes, [(60, "60 m"), (90, "90 m")]):
    thin = u.grid_thin(df, cell_m=th)
    ax.scatter(thin[u.CONF["LON"]], thin[u.CONF["LAT"]], s=1.5, alpha=0.35,
               color="#2b83ba")
    ax.set(xlabel="lon", ylabel="lat", title=f"após thinning {tag} (n={len(thin)})")
fig.suptitle("f9 · thinning espacial — grade 60–90 m", fontweight="bold")
u.save_fig(fig, "f9_thinning_60_90m.png")
print(f"[THIN 60m] n={len(u.grid_thin(df, 60))} · [THIN 75m] " +
      f"n={len(u.grid_thin(df, 75))} · [THIN 90m] n={len(u.grid_thin(df, 90))}")

# --- aplica a grade definitiva (THIN_M do 2_3_util) --------------------------
thin = u.grid_thin(df)
print(f"[DEPOIS] n={len(thin)} (THIN_M={u.CONF['THIN_M']} m)")

# f10: densidade espacial — pontos por bloco antes × depois -------------------
def dens(df_in, band=0.02):
    gx = np.floor(df_in[u.CONF["LON"]] / band).astype(int)
    gy = np.floor(df_in[u.CONF["LAT"]] / band).astype(int)
    g = gx * 100_000 + gy
    return pd.Series(g).value_counts()

d_antes, d_depois = dens(df), dens(thin)
fig, ax = plt.subplots(figsize=(6.5, 4))
ax.hist(d_antes.clip(upper=200), bins=50, alpha=0.55, color="#d73027",
        label=f"antes (mediana {d_antes.median():.0f})")
ax.hist(d_depois.clip(upper=200), bins=50, alpha=0.55, color="#1a9850",
        label=f"depois (mediana {d_depois.median():.0f})")
ax.set(xlabel="nº de pontos por célula (~2 km)", ylabel="células",
       title="f10 · densidade espacial antes × depois do thinning")
ax.legend()
u.save_fig(fig, "f10_densidade_antes_depois.png")

# --- foi mantido o footprint de menor agbd_se? (controle de qualidade) -------
se_antes = df[u.CONF["AGBD_SE"]].median()
se_depois = thin[u.CONF["AGBD_SE"]].median()
print(f"[SE] mediana agbd_se antes={se_antes:.2f} → depois={se_depois:.2f} " +
      f"({(se_antes - se_depois) / se_antes * 100:.0f}% menor)")

# --- exporta a matriz thinned (mesma pasta de output/matriz) -----------------
out_csv = u.matrix_dir() / "samples_thinned_v07.csv"
thin.to_csv(out_csv, index=False)
u.write_artifact(out_csv, f"thinned matrix: {len(thin)} rows")
print(f"[CSV] matriz thinned → {out_csv}")

print()
print("[FIGURAS GERADAS]")
for f in u.manifest():
    print("  ", f)
print("=" * 68)