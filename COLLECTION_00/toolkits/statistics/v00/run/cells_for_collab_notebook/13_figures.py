"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — 13_figures.py
==================================================================
Etapa 13 · Biblioteca de figuras das estatísticas. Rode após 11_consolidate.

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
print("statistics · 13_figures · figuras")
print("=" * 68)

forest = pd.read_csv(out_dir() / "consolidado_forest_2023.csv", encoding="utf-8")
grassland_raw = pd.read_csv(out_dir() / "consolidado_grassland_2023.csv",
                            encoding="utf-8") if (out_dir() /
                            "consolidado_grassland_2023.csv").exists() else None
ref = CONF["GRASSLAND_REF_VERSION"]
grassland = grassland_raw
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
        vals = fs.groupby("classe")["estoque_t"].sum()
        ax.barh(cls, [vals.get(c, 0) for c in order], label=v,
                color=plt.cm.viridis(i / max(len(VEC) - 1, 1)),
                height=0.8 / len(VEC) - 0.04 if len(VEC) > 1 else 0.8)
    ax.set(xlabel=VALUE_LABEL["estoque_t"],
           title=f"f1 · {VALUE_LABEL['estoque_t']} por classe C11 (2023)")
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
               ylabel="t")
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
    ax.set(xlabel="produto", ylabel="t",
           title=f"f5 · grassland {ref} — total por produto (2023)")
    save_fig(fig, "f5_grassland_compare_menu.png")

# ---------------------------------------------------------------------------
# Densidade ponderada (sum(t)/sum(ha)) + medidas das REFERÊNCIAS
# ---------------------------------------------------------------------------
try:
    refs = load_references_csv()
except Exception as e:  # noqa: BLE001
    print("[AVISO] referências indisponíveis:", e)
    refs = pd.DataFrame()


def _refs_por_classe(term):
    """Densidade de referência (na unidade do produto) por classe × ref."""
    if not len(refs):
        return pd.DataFrame(columns=["classe", "ref_id", "dens"])
    allowed = ALLOWED_TERMS.get(term, ())
    sub = refs[refs["ref_term"].isin(allowed)].copy()
    if not len(sub):
        return pd.DataFrame(columns=["classe", "ref_id", "dens"])
    sub = ref_value_for_product(sub, term).dropna(subset=["ref_value"])
    return sub[["classe", "ref_id", "ref_value"]].rename(
        columns={"ref_value": "dens"})


def _plot_dens_refs(ax, refsub, order):
    """Sobrepõe as densidades de referência (pontos) num eixo de barras."""
    for rid, g in refsub.groupby("ref_id"):
        gi = g.set_index("classe")
        ys = [gi["dens"].get(c, np.nan) for c in order]
        ax.plot(range(len(order)), ys, marker="o", ls="none", ms=5,
                label=f"ref: {rid}")


def _density_figure(ax_order_by_area, value_col, keys, ylab, title, fname,
                    ref_term=None):
    d = dens_ponderada(ax_order_by_area, value_col, keys)
    if not len(d):
        return
    order = (ax_order_by_area.groupby("classe")["area_ha"].sum()
             .sort_values(ascending=False).index[:15])
    cls = [n0_label(c) for c in order]
    x = np.arange(len(order))
    fig, ax = plt.subplots(figsize=(12, max(4, 0.45 * len(cls))))
    if "version" in keys:
        for i, v in enumerate(CONF["FOREST_VERSIONS"]):
            dv = d[d["version"] == v].set_index("classe")["dens"]
            ax.bar(x + i * 0.8 / len(CONF["FOREST_VERSIONS"]),
                   [dv.get(c, np.nan) for c in order],
                   width=0.8 / len(CONF["FOREST_VERSIONS"]), label=v)
        ax.set_xticks(x + 0.4 - 0.4 / len(CONF["FOREST_VERSIONS"]))
    else:
        dv = d.set_index("classe")["dens"]
        ax.bar(x, [dv.get(c, np.nan) for c in order], label=keys[-1])
        ax.set_xticks(x)
    if ref_term:
        _plot_dens_refs(ax, _refs_por_classe(ref_term), order)
    ax.set_xticklabels(cls, rotation=45, ha="right")
    ax.set(ylabel=ylab, title=title)
    ax.grid(axis="y", alpha=0.3)
    ax.legend(ncols=2, fontsize=8)
    save_fig(fig, fname)


if len(forest):
    _density_figure(forest, "estoque_t", ["version", "classe"],
                    VALUE_DENS_LABEL["estoque_t"],
                    f"f6 · densidade ponderada de {VALUE_LABEL['estoque_t']} "
                    "por classe × versão + referências",
                    "f6_forest_densidade_por_classe.png", ref_term="agc")

if grassland_raw is not None and len(grassland_raw):
    _vers = (sorted(grassland_raw["versao"].astype(str).unique())
             if "versao" in grassland_raw.columns else [])
    g_src = grassland_raw
    if str(ref) in _vers:
        g_src = grassland_raw[grassland_raw["versao"].astype(str) == str(ref)]
    elif _vers:
        g_src = grassland_raw[grassland_raw["versao"].astype(str) == _vers[0]]
        print(f"[INFO] grassland densidade usando versão {_vers[0]}")
    gC = g_src[g_src["produto"] == "carbon"]
    gB = g_src[g_src["produto"] == "biomass"]
    if len(gC):
        _density_figure(gC, "estoque_t", ["classe"],
                        VALUE_DENS_LABEL["estoque_t"],
                        f"f7 · densidade ponderada de "
                        f"{VALUE_LABEL['estoque_t']} — campestre + referências",
                        "f7_grassland_carbono_densidade.png", ref_term="carbon")
    if len(gB):
        _density_figure(gB, "biomassa_t", ["classe"],
                        VALUE_DENS_LABEL["biomassa_t"],
                        f"f8 · densidade ponderada de "
                        f"{VALUE_LABEL['biomassa_t']} — campestre + referências",
                        "f8_grassland_biomassa_densidade.png", ref_term="biomass")

print()
print(f"[ARTEFATOS] {len(manifest())} — baixe/exporte as figuras para cá:")
for m in manifest():
    print("  ", m)
print()
print("[DICA] figuras → COLLECTION_00/toolkits/statistics/v00/run/cells_for_collab_notebook/figures/ no repo")
print("=" * 68)