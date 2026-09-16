"""
MAPBIOMAS-CARBONO · Pantanal — 2_3_2_STATISTICS_CELL02_CONSOLIDAR_QA.py
========================================================================
Célula 02 · Consolida os CSVs do GEE e valida somas (usa CONF + funções da
cell00 no namespace). Rodar em Colab após a cell01.

O que faz:
  1. checa quais arquivos esperados existem (e indica o step 7_statistics.js
     de cada versão a rodar no GEE quando faltar)
  2. consolida forest (V03–V08) e grassland (v02: biomassa/ANPP/carbono)
  3. QA de somas (n0 = n1 = total) e territórios por versão
  4. salva consolidados em OUT_DIR (consolidado_forest_2023.csv e
     consolidado_grassland_2023.csv) para reuso nas células seguintes
"""
print("=" * 68)
print("statistics_gcn · cell02 · consolidação + QA")
print("=" * 68)

missing = check_presence()

forest = load_forest()
grassland = load_grassland()

print()
print(f"[FOREST] {len(forest)} linhas · versões:",
      sorted(forest["version"].unique()) if len(forest) else "—")
print(f"[GRASSLAND] {len(grassland)} linhas · produtos:",
      sorted(grassland["produto"].unique()) if len(grassland) else "—")

# --- comparativos OFFLINE (a partir do consolidado) -------------------------
cmpf = build_compare_forest(forest)
cmpg = build_compare_grassland(grassland)
print(f"[COMPARE] forest {len(cmpf)} · grassland {len(cmpg)} linhas (offline)")

# --- QA forest ---------------------------------------------------------------
if len(forest):
    problems = qa_somas(forest, "estoque_t", ["version", "territorio"])
    problems += qa_defsec(forest, ("version", "territorio"))
    problems += qa_territorios(forest, CONF["FOREST_VERSIONS"])
    for p in problems:
        print("[QA !]", p)
    if not problems:
        print("[QA OK] forest: n0 = n1 = total em todas as versões/territórios"
              " e def_sec fecha (Σ area_mod = area)")
    out = out_dir() / "consolidado_forest_2023.csv"
    forest.to_csv(out, index=False)
    print(f"[OUT] {out}")

# --- QA grassland ------------------------------------------------------------
if len(grassland):
    problems = []
    for vc in ("biomassa_t", "estoque_t"):
        problems += qa_somas(grassland, vc,
                             ["produto", "versao", "territorio"])
    problems += qa_defsec(grassland, ("produto", "versao", "territorio"))
    for p in problems:
        print("[QA !]", p)
    if not problems:
        print("[QA OK] grassland: n0 = n1 = total em todos os produtos"
              " e def_sec fecha")
    out = out_dir() / "consolidado_grassland_2023.csv"
    grassland.to_csv(out, index=False)
    print(f"[OUT] {out}")

if missing:
    print()
    print("[ATENÇÃO] faltam arquivos — rode no GEE os steps indicados e faça o")
    print("          download/export dos CSVs para", csv_dir(),
          "depois rode a cell02 novamente.")
print()
print(f"[ARTEFATOS] {len(manifest())} gerados")
print("=" * 68)