"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — 14_report.py
===================================================================
Etapa 14 · Relatório consolidado (XLSX + .md). Rode após 13_figures.

Gera, em OUT_DIR:
  resumo_pantanal_2023.xlsx — abas:
    forest: n0 por versão | n1 | marcador | total | comparativo_versoes
    grassland: n0 por produto | n1 | marcador | total | comparativo_produtos
  resumo_pantanal_2023.md — sumário textual (totais, marcador, QA)

Todas as abas agregadas (n1/marcador/total) são derivadas EM MEMÓRIA das
linhas de combinação (classe × def_sec; e meses p/ NPP) do consolidado.
"""
import pandas as pd

print("=" * 68)
print("statistics · 14_report · relatório")
print("=" * 68)

forest = pd.read_csv(out_dir() / "consolidado_forest_2023.csv", encoding="utf-8")
ref = CONF["GRASSLAND_REF_VERSION"]
grassland_path = out_dir() / "consolidado_grassland_2023.csv"
grassland = pd.read_csv(grassland_path, encoding="utf-8") if grassland_path.exists() else None
if grassland is not None and "versao" in grassland.columns:
    grassland = grassland[grassland["versao"].astype(str) == str(ref)]
cmpf = build_compare_forest(forest)
cmpg = build_compare_grassland(grassland)

md = [f"# Resumo das estatísticas · Pantanal · ano {CONF['YEAR']}",
      f"\nGerado por `toolkits/statistics/v00/run/cells_for_collab_notebook` em Colab.",
      f"\nFiltro def_sec: "
      f"{', '.join(CONF['DEF_SEC_FILTER']) if CONF.get('DEF_SEC_FILTER') else 'todos'}.",
      "\n## Floresta (carbono acima do solo, t)\n"]

xlsx_path = out_dir() / f"resumo_pantanal_{CONF['YEAR']}.xlsx"
with pd.ExcelWriter(xlsx_path, engine="openpyxl") as xw:
    # ---------------- FLORESTA ----------------
    if len(forest) and "version" in forest.columns:
        has_inc = "incerteza_t" in forest.columns
        for v in CONF["FOREST_VERSIONS"]:
            d = forest[forest["version"] == v]
            if not len(d):
                continue
            agg = {"area_ha": ("area_ha", "sum"),
                   "estoque_t": ("estoque_t", "sum")}
            if has_inc:
                agg["incerteza_t"] = ("incerteza_t", "sum")
            tab = (d.groupby(["territorio", "classe", "n0"])
                   .agg(**agg)
                   .reset_index())
            tab.to_excel(xw, sheet_name=f"{v}_n0", index=False)
            (d.groupby(["territorio", "n1"])
             .agg(**agg)
             .reset_index().to_excel(xw, sheet_name=f"{v}_n1", index=False))
            (d.groupby(["territorio", "marcador"])
             .agg(**agg)
             .reset_index().to_excel(xw, sheet_name=f"{v}_marcador",
                                     index=False))
            (d.groupby(["territorio"])
             .agg(**agg)
             .reset_index().to_excel(xw, sheet_name=f"{v}_total", index=False))
            tot = d["estoque_t"].sum()
            fl = forest[(forest["version"] == v) &
                        (forest["marcador"] == "florestal")]["estoque_t"].sum()
            md.append(f"- **{v}**: total {tot:,.0f} t · florestal"
                      f" {fl:,.0f} t ({fl / tot * 100:.1f}%)")
        if cmpf is not None and len(cmpf):
            cmpf.to_excel(xw, sheet_name="comparativo_versoes", index=False)
            md.append("\n### Comparativo florestal (101) e total por versão\n")
            for _, r in cmpf[cmpf["marcador"] == "florestal"].iterrows():
                md.append(f"- {r['version']}: {r['estoque_t']:,.0f} t"
                          f" (área {r['area_ha']:,.0f} ha)")
    # ---------------- GRASSLAND ----------------
    if grassland is not None and len(grassland):
        md.append(f"\n## Campestre ({ref} — biomassa/NPP/carbono, "
                  f"{CONF['YEAR']})\n")
        for p in grassland["produto"].unique():
            d = grassland[grassland["produto"] == p]
            vc = grass_value_col(p)
            if vc == "anpp_t" and "periodo" in d.columns:
                d = (d.groupby(["territorio", "classe", "n0", "n1", "n2",
                                "marcador"], dropna=False)
                     .agg(area_ha=("area_ha", "sum"),
                          anpp_t=("anpp_t", "sum")).reset_index())
            rows = d.rename(columns={vc: "valor_t"})
            tot = rows["valor_t"].sum()
            camp = rows[rows["marcador"] == "campestre"]["valor_t"].sum()
            d0 = (rows.groupby(["territorio", "classe", "n0"])
                  .agg(area_ha=("area_ha", "sum"), valor_t=("valor_t", "sum"))
                  .reset_index())
            d0.to_excel(xw, sheet_name=f"{p}_n0", index=False)
            (rows.groupby(["territorio", "n1"])
             .agg(area_ha=("area_ha", "sum"), valor_t=("valor_t", "sum"))
             .reset_index().to_excel(xw, sheet_name=f"{p}_n1", index=False))
            (rows.groupby(["territorio", "marcador"])
             .agg(area_ha=("area_ha", "sum"), valor_t=("valor_t", "sum"))
             .reset_index().to_excel(xw, sheet_name=f"{p}_marcador",
                                     index=False))
            (rows.groupby(["territorio"])
             .agg(area_ha=("area_ha", "sum"), valor_t=("valor_t", "sum"))
             .reset_index().to_excel(xw, sheet_name=f"{p}_total", index=False))
            md.append(f"- **{p}**: {tot:,.0f} "
                      f"{GRASS_PRODUCT_LABEL.get(p, 't')}"
                      f" · campestre {camp:,.0f} t"
                      f" ({camp / tot * 100:.1f}%)")
        if cmpg is not None and len(cmpg):
            cmpg.to_excel(xw, sheet_name="comparativo_produtos", index=False)

report_md = out_dir() / f"resumo_pantanal_{CONF['YEAR']}.md"
write_artifact(report_md, "\n".join(md))
print()
print("[RESUMO]")
print("\n".join(md))
print()
print(f"[ARTEFATOS] {len(manifest())} — " + ", ".join(manifest()[-2:]))
print("=" * 68)