"""
MAPBIOMAS-CARBONO · Pantanal — STATISTICS_CELL02_GRAFICOS.py
============================================================
Célula 02 · Biblioteca de figuras das estatísticas.
Rodar em Colab após a cell01.

Figuras (salvas na MESMA pasta de output no Drive, FIG_DIR):
  f1_forest_estoque_por_classe.png    estoque (Mg) por classe C11, por versão
  f2_forest_estoque_por_marcador.png  florestal × campestre × outros, por versão
  f3_forest_compare_versoes.png       total e florestal por versão (v00→v07)
  f4_grassland_produtos.png           biomassa × ANPP × carbono por marcador
  f5_grassland_compare_menu.png       total e campestre por produto (barra)
"""
import numpy as np
import pandas as pd

import statistics_util as u

print("=" * 68)
print("statistics_gcn · cell02 · figuras")
print("=" * 68)

forest = pd.read_csv(u.out_dir() / "consolidado_forest_2023.csv", encoding="utf-8")
grassland = pd.read_csv(u.out_dir() / "consolidado_grassland_2023.csv",
                        encoding="utf-8") if (u.out_dir() /
                        "consolidado_grassland_2023.csv").exists() else None
ref = u.CONF["GRASSLAND_REF_VERSION"]
if grassland is not None and "versao" in grassland.columns:
    grassland = grassland[grassland["versao"].astype(str) == str(ref)]
    print(f"[INFO] grassland consolidado filtrado p/ referência {ref}")

VEC = u.CONF["FOREST_VERSIONS"]
X = np.arange(len(VEC))

# --- f1: estoque por classe decimal (n0), agrupado por versão -----------------
if len(forest):
    n0 = forest[forest["nivel"] == "n0"]
    order = (n0.groupby("classe")["estoque_Mg"].sum()).sort_values().index
    cls = [u.n0_label(c) for c in order]
    fig, ax = plt.subplots(figsize=(12, max(4, 0.42 * len(cls))))
    for i, v in enumerate(VEC):
        vals = n0[n0["version"] == v].set_index("classe")["estoque_Mg"]
        ax.barh(cls, [vals.get(c, 0) for c in order], label=v,
                color=plt.cm.viridis(i / max(len(VEC) - 1, 1)),
                height=0.8 / len(VEC) - 0.04 if len(VEC) > 1 else 0.8)
    ax.set(xlabel="estoque (Mg)", title="f1 · estoque de AGC por classe C11 (2023)")
    ax.grid(axis="x", alpha=0.3)
    ax.legend(ncols=len(VEC))
    u.save_fig(fig, "f1_forest_estoque_por_classe.png")

    # --- f2: marcador florestal/campestre/outros por versão --------------------
    piv = (forest[forest["nivel"] == "marcador"]
           .groupby(["version", "marcador"])["estoque_Mg"].sum().unstack(fill_value=0))
    cols = ["florestal", "campestre", "outros"]
    cols = [c for c in cols if c in piv.columns]
    fig, ax = plt.subplots(figsize=(9, 4.5))
    bottom = np.zeros(len(piv))
    for c in cols:
        ax.bar(piv.index, piv[c], bottom=bottom, label=c)
        bottom += piv[c].values
    ax.set(xlabel="versão", ylabel="estoque (Mg)",
           title="f2 · estoque por marcador (florestal × campestre × outros)")
    ax.legend()
    u.save_fig(fig, "f2_forest_estoque_por_marcador.png")

    # --- f3: comparativo entre versões (marcador florestal e total) ------------
    cmpf = u.build_compare_forest(forest)
    cmpf = cmpf[cmpf["marcador"].isin(["florestal", "total"])]
    pivc = cmpf.pivot(index="version", columns="marcador", values="estoque_Mg")
    fig, ax = plt.subplots(figsize=(8, 4.5))
    pivc.plot(ax=ax, marker="o", color={c: u.CONF[k] for c, k in
             [("florestal", "C_FOREST"), ("total", "C_RED")]})
    ax.set(xlabel="versão", ylabel="estoque (Mg)",
           title="f3 · comparativo florestal(101) e total por versão (2023)")
    u.save_fig(fig, "f3_forest_compare_versoes.png")

# --- f4/f5: grassland ---------------------------------------------------------
if grassland is not None and len(grassland):
    prod_label = {"biomass": "biomassa (Mg MS)", "anpp": "ANPP (Mg MS/ano)",
                  "carbon": "carbono (Mg C)"}
    marc = grassland[grassland["nivel"] == "marcador"]
    fig, axes = plt.subplots(2, 2, figsize=(11, 8))
    axes = axes.ravel()
    for i, p in enumerate(grassland["produto"].unique()):
        d = marc[marc["produto"] == p]
        tot = grassland[(grassland["produto"] == p) &
                        (grassland["nivel"] == "total")]["valor_Mg"].sum()
        ax = axes[i]
        ax.bar(d["marcador"], d["valor_Mg"], color=[u.CONF["C_GRASS"],
                u.CONF["C_OTHER"]])
        ax.axhline(tot, color=u.CONF["C_RED"], ls="--", lw=1)
        ax.set(title=f"{p} · total {tot:.0f} {prod_label.get(p, '')}",
               ylabel="Mg")
        if len(d) == 0:
            ax.text(0.5, 0.5, "sem dados", ha="center", va="center", alpha=0.5)
    fig.suptitle(f"f4 · produtos campestres {ref} por marcador (2023)",
                 fontweight="bold")
    for ax in axes[len(grassland["produto"].unique()):]:
        ax.axis("off")
    u.save_fig(fig, "f4_grassland_produtos.png")

    cmpg = u.build_compare_grassland(grassland)
    totp = cmpg[cmpg["n0"] == "TOTAL"]
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.bar(totp["produto"], totp["valor_Mg"], color=u.CONF["C_GRASS"])
    ax.set(xlabel="produto", ylabel="Mg",
           title=f"f5 · grassland {ref} — total por produto (2023)")
    u.save_fig(fig, "f5_grassland_compare_menu.png")

print()
print(f"[ARTEFATOS] {len(u.manifest())} — baixe/exporte as figuras para cá:")
for m in u.manifest():
    print("  ", m)
print()
print("[DICA] figuras → COLLECTION_00/pantanal/statistics_gcn/figures/ no repo")
print("=" * 68)