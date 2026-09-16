"""
MAPBIOMAS-CARBONO · Pantanal — 2_3_3_STATISTICS_CELL03_GRAFICOS.py
==================================================================
Célula 03 · Biblioteca de figuras das estatísticas (usa CONF + funções da
cell00 no namespace). Rodar em Colab após a cell02.

Figuras (salvas na MESMA pasta de output no Drive, FIG_DIR):
  f1_forest_estoque_por_classe.png    estoque (t) por classe C11, por versão
  f2_forest_estoque_por_marcador.png  florestal × campestre × outros, por versão
  f3_forest_compare_versoes.png       total e florestal por versão (v03→v08)
  f4_grassland_produtos.png           biomassa × ANPP × carbono por marcador
  f5_grassland_compare_menu.png       total e campestre por produto (barra)

Todas as agregações (classe/marcador/total) são derivadas EM MEMÓRIA das
linhas de combinação (classe × def_sec; e meses p/ ANPP) do consolidado —
o CSV do GEE não traz linhas agregadas.
"""
import numpy as np
import pandas as pd  # noqa: F401

print("=" * 68)
print("statistics_gcn · cell03 · figuras")
print("=" * 68)

forest = pd.read_csv(out_dir() / "consolidado_forest_2023.csv", encoding="utf-8")
grassland = pd.read_csv(out_dir() / "consolidado_grassland_2023.csv",
                        encoding="utf-8") if (out_dir() /
                        "consolidado_grassland_2023.csv").exists() else None
ref = CONF["GRASSLAND_REF_VERSION"]
if grassland is not None and "versao" in grassland.columns:
    grassland = grassland[grassland["versao"].astype(str) == str(ref)]
    print(f"[INFO] grassland consolidado filtrado p/ referência {ref}")

VEC = CONF["FOREST_VERSIONS"]
X = np.arange(len(VEC))

# --- f1: estoque por classe decimal (n0), agrupado por versão -----------------
if len(forest):
    order = (forest.groupby("classe")["estoque_t"].sum()).sort_values().index
    cls = [n0_label(c) for c in order]
    fig, ax = plt.subplots(figsize=(12, max(4, 0.42 * len(cls))))
    for i, v in enumerate(VEC):
        fs = por_classe(forest[forest["version"] == v])
        vals = fs.set_index("classe")["estoque_t"]
        ax.barh(cls, [vals.get(c, 0) for c in order], label=v,
                color=plt.cm.viridis(i / max(len(VEC) - 1, 1)),
                height=0.8 / len(VEC) - 0.04 if len(VEC) > 1 else 0.8)
    ax.set(xlabel="estoque (t)", title="f1 · estoque de AGC por classe C11 (2023)")
    ax.grid(axis="x", alpha=0.3)
    ax.legend(ncols=len(VEC))
    save_fig(fig, "f1_forest_estoque_por_classe.png")

    # --- f2: marcador florestal/campestre/outros por versão --------------------
    piv = (pivot_marcador(forest, "estoque_t")
           .pivot(index="version", columns="marcador", values="estoque_t")
           .fillna(0))
    cols = ["florestal", "campestre", "outros"]
    cols = [c for c in cols if c in piv.columns]
    fig, ax = plt.subplots(figsize=(9, 4.5))
    bottom = np.zeros(len(piv))
    for c in cols:
        ax.bar(piv.index, piv[c], bottom=bottom, label=c)
        bottom += piv[c].values
    ax.set(xlabel="versão", ylabel="estoque (t)",
           title="f2 · estoque por marcador (florestal × campestre × outros)")
    ax.legend()
    save_fig(fig, "f2_forest_estoque_por_marcador.png")

    # --- f3: comparativo entre versões (marcador florestal e total) ------------
    cmpf = build_compare_forest(forest)
    cmpf = cmpf[cmpf["marcador"].isin(["florestal", "total"])]
    pivc = cmpf.pivot(index="version", columns="marcador", values="estoque_t")
    fig, ax = plt.subplots(figsize=(8, 4.5))
    pivc.plot(ax=ax, marker="o", color={c: CONF[k] for c, k in
             [("florestal", "C_FOREST"), ("total", "C_RED")]})
    ax.set(xlabel="versão", ylabel="estoque (t)",
           title="f3 · comparativo florestal(101) e total por versão (2023)")
    save_fig(fig, "f3_forest_compare_versoes.png")

# --- f4/f5: grassland ---------------------------------------------------------
if grassland is not None and len(grassland):
    produtos = [p for p in grassland["produto"].unique()]
    fig, axes = plt.subplots(2, 2, figsize=(11, 8))
    axes = axes.ravel()
    for i, p in enumerate(produtos):
        g = grassland[grassland["produto"] == p]
        vc = grass_value_col(p)
        if vc == "anpp_t" and "periodo" in g.columns:
            deagg = (g.groupby(["classe", "marcador"], dropna=False)
                     .agg(anpp_t=("anpp_t", "sum")).reset_index())
        else:
            deagg = g
        marc = deagg.groupby("marcador", dropna=False)[vc].sum()
        tot = deagg[vc].sum()
        ax = axes[i]
        ax.bar(marc.index, marc.values, color=[CONF["C_GRASS"], CONF["C_OTHER"]])
        ax.axhline(tot, color=CONF["C_RED"], ls="--", lw=1)
        ax.set(title=f"{p} · total {tot:.0f} {GRASS_PRODUCT_LABEL.get(p, '')}",
               ylabel="Mg")
        if len(marc) == 0:
            ax.text(0.5, 0.5, "sem dados", ha="center", va="center", alpha=0.5)
    fig.suptitle(f"f4 · produtos campestres {ref} por marcador (2023)",
                 fontweight="bold")
    for ax in axes[len(produtos):]:
        ax.axis("off")
    save_fig(fig, "f4_grassland_produtos.png")

    cmpg = build_compare_grassland(grassland)
    totp = cmpg[cmpg["n0"] == "TOTAL"]
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.bar(totp["produto"], totp["valor_t"], color=CONF["C_GRASS"])
    ax.set(xlabel="produto", ylabel="Mg",
           title=f"f5 · grassland {ref} — total por produto (2023)")
    save_fig(fig, "f5_grassland_compare_menu.png")

print()
print(f"[ARTEFATOS] {len(manifest())} — baixe/exporte as figuras para cá:")
for m in manifest():
    print("  ", m)
print()
print("[DICA] figuras → COLLECTION_00/pantanal/statistics_gcn/figures/ no repo")
print("=" * 68)