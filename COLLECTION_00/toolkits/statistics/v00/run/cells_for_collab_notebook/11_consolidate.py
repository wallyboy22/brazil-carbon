"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — 11_consolidate.py
========================================================================
Etapa 11 · Consolida os CSVs do GEE (LONGO canônico) e valida somas.

Rode após 10_auth_drive. Usa CONF + funções de 00..06 no namespace.

  1. checa arquivos esperados (indica qual driver rodar no GEE quando faltar)
  2. consolida forest (todas as versões presentes) e grassland
  3. QA de somas (n0 = n1 = total) e territórios por versão
  4. salva consolidados LONGO em OUT_DIR (consolidado_forest_2023.csv e
     consolidado_grassland_2023.csv) — canônicos p/ QA e 15_references
"""
print("=" * 68)
print("statistics · 11_consolidate · consolidação + QA")
print("=" * 68)

_f = CONF.get("DEF_SEC_FILTER")
print("[FILTRO] def_sec =", ", ".join(_f) if _f else "todos")

missing = check_presence()

forest = add_data_col(load_forest())
grassland = add_data_col(expand_grass_product(load_grassland()))

print()
print(f"[FOREST] {len(forest)} linhas · versões:",
      sorted(forest["version"].unique()) if len(forest) else "—")
print(f"[GRASSLAND] {len(grassland)} linhas (longo por produto) · produtos:",
      sorted(grassland["produto"].unique()) if len(grassland) else "—")

# --- comparativos OFFLINE (a partir do consolidado) -------------------------
cmpf = build_compare_forest(forest)
cmpg = build_compare_grassland(grassland)
print(f"[COMPARE] forest {len(cmpf)} · grassland {len(cmpg)} linhas (offline)")

# --- QA forest ---------------------------------------------------------------
if len(forest):
    problems = qa_somas(forest, "estoque_t", ["version", "territorio", "UF"])
    problems += qa_defsec(forest, ("version", "territorio", "UF"))
    problems += qa_territorios(forest, CONF["FOREST_VERSIONS"])
    for p in problems:
        print("[QA !]", p)
    if not problems:
        print("[QA OK] forest: n1/marcador = total em todas as versões/"
              "territórios e combinações def_sec coerentes")
    out = out_dir() / "consolidado_forest_2023.csv"
    forest.to_csv(out, index=False)
    print(f"[OUT] {out}")

# --- QA grassland ------------------------------------------------------------
if len(grassland):
    problems = []
    for p in grassland["produto"].unique():
        vc = grass_value_col(p)
        problems += qa_somas(grassland[grassland["produto"] == p], vc,
                             ["produto", "versao", "territorio", "UF"])
    problems += qa_defsec(grassland, ("produto", "versao", "territorio", "UF"))
    for p in problems:
        print("[QA !]", p)
    if not problems:
        print("[QA OK] grassland: n1/marcador = total em todos os produtos"
              " e combinações def_sec coerentes")
    out = out_dir() / "consolidado_grassland_2023.csv"
    grassland.to_csv(out, index=False)
    print(f"[OUT] {out}")

if missing:
    print()
    print("[ATENÇÃO] faltam arquivos — rode no GEE os steps indicados e faça o")
    print("          download/export dos CSVs para", csv_dir(),
          "depois rode a 11_consolidate novamente.")
print()
print(f"[ARTEFATOS] {len(manifest())} gerados")
print("=" * 68)