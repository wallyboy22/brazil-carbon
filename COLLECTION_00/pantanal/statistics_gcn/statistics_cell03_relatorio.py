"""
MAPBIOMAS-CARBONO · Pantanal — STATISTICS_CELL03_RELATORIO.py
=============================================================
Célula 03 · Relatório consolidado (XLSX + .md).
Rodar em Colab após a cell02.

Gera, em OUT_DIR:
  resumo_<eco>_2023.xlsx — abas por ecossistema:
    forest: n0 por versão | n1 | marcador | total | comparativo_versoes
    grassland: n0 por produto | n1 | marcador | total | comparativo_produtos
  resumo_pantanal_2023.md — sumário textual (totais, marcador, QA)
"""
import pandas as pd

import statistics_util as u

print("=" * 68)
print("statistics_gcn · cell03 · relatório")
print("=" * 68)

forest = pd.read_csv(u.out_dir() / "consolidado_forest_2023.csv", encoding="utf-8")
ref = u.CONF["GRASSLAND_REF_VERSION"]
grassland_path = u.out_dir() / "consolidado_grassland_2023.csv"
grassland = pd.read_csv(grassland_path, encoding="utf-8") if grassland_path.exists() else None
if grassland is not None and "versao" in grassland.columns:
    grassland = grassland[grassland["versao"].astype(str) == str(ref)]
cmpf = u.load_compare_forest()
cmpg = u.load_compare_grassland()

md = [f"# Resumo das estatísticas · Pantanal · ano {u.CONF['YEAR']}",
      f"\nGerado por `pantanal/statistics_gcn` em Colab.",
      "\n## Floresta (AGC, Mg/ha → Mg)\n"]

xlsx_path = u.out_dir() / f"resumo_pantanal_{u.CONF['YEAR']}.xlsx"
with pd.ExcelWriter(xlsx_path, engine="openpyxl") as xw:
    # ---------------- FLORESTA ----------------
    if len(forest) and "version" in forest.columns:
        for v in u.CONF["FOREST_VERSIONS"]:
            d = forest[forest["version"] == v]
            for nivel in ("n0", "n1", "marcador", "total"):
                tab = (d[d["nivel"] == nivel]
                       .groupby(["territorio", "classe", "n0", "marcador"])
                       .agg(area_ha=("area_ha", "sum"),
                            estoque_Mg=("estoque_Mg", "sum"),
                            incerteza_Mg=("incerteza_Mg", "sum"))
                       .reset_index())
                tab.to_excel(xw, sheet_name=f"{v}_{nivel}", index=False)
            tv = d[d["nivel"] == "total"]
            if len(tv):
                tot = tv["estoque_Mg"].sum()
                fl = forest[(forest["version"] == v) &
                            (forest["nivel"] == "marcador") &
                            (forest["marcador"] == "florestal")]["estoque_Mg"].sum()
                md.append(f"- **v{v}**: total {tot:,.0f} Mg · florestal"
                          f" {fl:,.0f} Mg ({fl / tot * 100:.1f}%)")
        if cmpf is not None and len(cmpf):
            cmpf.to_excel(xw, sheet_name="comparativo_versoes", index=False)
            md.append("\n### Comparativo florestal (101) e total por versão\n")
            for _, r in cmpf[cmpf["marcador"] == "florestal"].iterrows():
                md.append(f"- {r['version']}: {r['estoque_Mg']:,.0f} Mg"
                          f" (área {r['area_ha']:,.0f} ha)")
    # ---------------- GRASSLAND ----------------
    if grassland is not None and len(grassland):
        md.append(f"\n## Campestre ({ref} — biomassa/ANPP/carbono, 2023)\n")
        prod_label = {"biomass": "biomassa (Mg MS)", "anpp": "ANPP (Mg MS/ano)",
                      "carbon": "carbono (Mg C)"}
        for p in grassland["produto"].unique():
            d = grassland[(grassland["produto"] == p) &
                          (grassland["nivel"] == "total")]
            for nivel in ("n0", "n1", "marcador", "total"):
                tab = (grassland[(grassland["produto"] == p) &
                                 (grassland["nivel"] == nivel)]
                       .groupby(["territorio", "classe", "n0", "n1", "n2"])
                       .agg(area_ha=("area_ha", "sum"), valor_Mg=("valor_Mg", "sum"))
                       .reset_index())
                tab.to_excel(xw, sheet_name=f"{p}_{nivel}", index=False)
            tot = d["valor_Mg"].sum() if len(d) else 0
            camp = grassland[(grassland["produto"] == p) &
                             (grassland["nivel"] == "marcador") &
                             (grassland["marcador"] == "campestre")]["valor_Mg"].sum()
            md.append(f"- **{p}**: {tot:,.0f} {prod_label.get(p, 'Mg')}"
                      f" · campestre {camp:,.0f} Mg"
                      f" ({camp / tot * 100:.1f}%")
        if cmpg is not None and len(cmpg):
            cmpg.to_excel(xw, sheet_name="comparativo_produtos", index=False)

u.write_artifact(xlsx_path, "")

report_md = u.out_dir() / f"resumo_pantanal_{u.CONF['YEAR']}.md"
u.write_artifact(report_md, "\n".join(md))
print()
print("[RESUMO]")
print("\n".join(md))
print()
print(f"[ARTEFATOS] {len(u.manifest())} — " + ", ".join(u.manifest()[-2:]))
print("=" * 68)