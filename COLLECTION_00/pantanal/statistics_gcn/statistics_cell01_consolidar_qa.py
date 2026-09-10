"""
MAPBIOMAS-CARBONO · Pantanal — STATISTICS_CELL01_CONSOLIDAR_QA.py
=================================================================
Célula 01 · Consolida os CSVs do GEE e valida somas.
Rodar em Colab após a cell00.

O que faz:
  1. checa quais arquivos esperados existem (e indica o step 7_statistics.js
     de cada versão a rodar no GEE quando faltar)
  2. consolida forest (V03–V07) e grassland (v01: biomassa/ANPP/carbono)
  3. QA de somas (n0 = n1 = total) e territórios por versão
  4. salva consolidados em OUT_DIR (consolidado_forest_2023.csv e
     consolidado_grassland_2023.csv) para reuso nas células seguintes
"""
import statistics_util as u

print("=" * 68)
print("statistics_gcn · cell01 · consolidação + QA")
print("=" * 68)

missing = u.check_presence()

forest = u.load_forest()
grassland = u.load_grassland()
cmpf = u.load_compare_forest()
cmpg = u.load_compare_grassland()

print()
print(f"[FOREST] {len(forest)} linhas · versões:",
      sorted(forest["version"].unique()) if len(forest) else "—")
print(f"[GRASSLAND] {len(grassland)} linhas · produtos:",
      sorted(grassland["produto"].unique()) if len(grassland) else "—")
print(f"[COMPARE] forest {len(cmpf)} · grassland {len(cmpg)} linhas")

# --- QA forest ---------------------------------------------------------------
if len(forest):
    problems = u.qa_somas(forest, "estoque_Mg", ["version", "territorio"])
    problems += u.qa_territorios(forest, u.CONF["FOREST_VERSIONS"])
    for p in problems:
        print("[QA !]", p)
    if not problems:
        print("[QA OK] forest: n0 = n1 = total em todas as versões/territórios")
    out = u.out_dir() / "consolidado_forest_2023.csv"
    forest.to_csv(out, index=False)
    print(f"[OUT] {out}")

# --- QA grassland ------------------------------------------------------------
if len(grassland):
    problems = u.qa_somas(grassland, "valor_Mg", ["produto", "territorio"])
    for p in problems:
        print("[QA !]", p)
    if not problems:
        print("[QA OK] grassland: n0 = n1 = total em todos os produtos")
    out = u.out_dir() / "consolidado_grassland_2023.csv"
    grassland.to_csv(out, index=False)
    print(f"[OUT] {out}")

if missing:
    print()
    print("[ATENÇÃO] faltam arquivos — rode no GEE os steps indicados e faça o")
    print("          download/export dos CSVs para", u.csv_dir(),
          "depois rode a cell01 novamente.")
print()
print(f"[ARTEFATOS] {len(u.manifest())} gerados")
print("=" * 68)