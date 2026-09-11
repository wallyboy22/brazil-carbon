"""
MAPBIOMAS-CARBONO · Pantanal Forest v08 — 2_3_4_GCN_CELL04_THINNING_FIGURAS.py
===============================================================================
Célula 04 · Thinning espacial + biblioteca de figuras (Fase 1 da consulta v08).
Rodar em Colab após a célula 03. Cole o conteúdo, usando CONF/funções já
carregadas no namespace pela célula 00.

Decisões (resposta da consulta A1/B6):
  - thinning OFF-LINE (grade espacial 60-90 m), mantendo por célula o footprint
    de MENOR agbd_se (mais confiável dentro da grade)
  - a matriz THINNED é exportada para o Drive (samples_thinned_v08.csv) e é a
    que alimenta o treino/validação server-side (3_) via Assets reexportados
  - gera as figuras de antes×depois na MESMA pasta de output
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

print("=" * 68)
print("v08 · cell04 · thinning espacial + figuras")
print("=" * 68)

df = load_matrix()
df, dropped = clean_features(df)

print(f"[ANTES] n={len(df)}")
fig, axes = plt.subplots(1, 2, figsize=(12, 4.6))
for ax, (th, tag) in zip(axes, [(60, "60 m"), (90, "90 m")]):
    thin = grid_thin(df, cell_m=th)
    ax.scatter(thin[CONF["LON"]], thin[CONF["LAT"]], s=1.5, alpha=0.35,
               color="#2b83ba")
    ax.set(xlabel="lon", ylabel="lat", title=f"após thinning {tag} (n={len(thin)})")
fig.suptitle("f9 · thinning espacial — grade 60–90 m", fontweight="bold")
save_fig(fig, "f9_thinning_60_90m.png")
print(f"[THIN 60m] n={len(grid_thin(df, 60))} · [THIN 75m] " +
      f"n={len(grid_thin(df, 75))} · [THIN 90m] n={len(grid_thin(df, 90))}")

# --- aplica a grade definitiva (THIN_M da célula 00/util) --------------------
thin = grid_thin(df)
print(f"[DEPOIS] n={len(thin)} (THIN_M={CONF['THIN_M']} m)")

# f10: densidade espacial — pontos por bloco antes × depois -------------------
def dens(df_in, band=0.02):
    gx = np.floor(df_in[CONF["LON"]] / band).astype(int)
    gy = np.floor(df_in[CONF["LAT"]] / band).astype(int)
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
save_fig(fig, "f10_densidade_antes_depois.png")

# --- foi mantido o footprint de menor agbd_se? (controle de qualidade) -------
se_antes = df[CONF["AGBD_SE"]].median()
se_depois = thin[CONF["AGBD_SE"]].median()
print(f"[SE] mediana agbd_se antes={se_antes:.2f} → depois={se_depois:.2f} " +
      f"({(se_antes - se_depois) / se_antes * 100:.0f}% menor)")

# --- exporta a matriz thinned (mesma pasta de output) ------------------------
out_csv = matrix_dir() / "samples_thinned_v08.csv"
thin.to_csv(out_csv, index=False)
write_artifact(matrix_dir() / "samples_thinned_v08.note.txt",
               f"thinned matrix: {len(thin)} rows")
print(f"[CSV] matriz thinned → {out_csv}")

print()
print("[FIGURAS GERADAS]")
for f in manifest():
    print("  ", f)
print("=" * 68)