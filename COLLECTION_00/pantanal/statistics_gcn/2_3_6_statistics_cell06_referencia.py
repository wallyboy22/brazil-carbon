"""
MAPBIOMAS-CARBONO · Pantanal — 2_3_6_STATISTICS_CELL06_REFERENCIA.py
====================================================================
Célula 06 · ANÁLISE DOS DADOS DE REFERÊNCIA — cruzes em termos comuns.
Rodar em Colab APÓS a cell02 (precisa dos consolidados 2023). Usa CONF e os
componentes de REFERÊNCIA já carregados pela cell00.

O que faz (lendo os CSVs exportados pelo GEE — SEM Earth Engine):
  1. lê cada referência (REF_CATALOG × bioma) dos `stats_references_*.csv`
     exportados pelo step `7_references.js`, via load_references_csv()
  2. T1 · tabela_cross_2023.csv — todas as versões (forest V03–V08; grassland
     v02 carbon/biomass) × referências, densidade em t C/ha (ou t MS/ha p/
     biomass), diff e incerteza por classe
  3. T2 · tabela_melhor_ano_referencia_2023.csv — ref+época de menor distância
     de densidade por produto×versão×classe (regra adotada) + fator_impl
  4. resumo_referencia_2023.md — achados por marcador e flags (AGB→C, cobertura
     campestre, Xu 2021 b1..b20→ano 2000..2019 como premissa)

Saídas em OUT_DIR (Drive), prontas para exportar.
"""
print("=" * 68)
print("statistics_gcn · cell06 · análise de dados de referência")
print("=" * 68)

# Confirma constantes via CONF (fonte única de verdade operacional — a cell00
# já derivou CARBON_FRACTION e REF_MIN_VALID de CONF).
assert CARBON_FRACTION == CONF["CARBON_FRACTION"]
assert REF_MIN_VALID == CONF["REF_MIN_VALID"]

# --- entrada (consolidados da cell02) ----------------------------------------
forest = pd.read_csv(out_dir() / "consolidado_forest_2023.csv", encoding="utf-8")
grass_path = out_dir() / "consolidado_grassland_2023.csv"
for p in (out_dir() / "consolidado_forest_2023.csv", grass_path):
    if not p.exists():
        print(f"[FALTA] {p} — rode a cell02 antes (gera os consolidados).")
if not grass_path.exists():
    print("[INFO] sem grassland — cruzamento só forest.")
grass = pd.read_csv(grass_path, encoding="utf-8") if grass_path.exists() else None

print(f"[IN] forest {len(forest)} linhas · grassland "
      f"{len(grass) if grass is not None else 0} linhas")

# --- 1) referências por classe (lê CSVs do GEE + cache em OUT_DIR) ----------
cache = out_dir() / "referencias_por_classe_2023.csv"
if cache.exists():
    refs_df = pd.read_csv(cache)
    print(f"[CACHE] {cache} ({len(refs_df)} linhas) — apague o cache para "
          "reler os CSVs do Drive")
else:
    print(f"[CSV] lendo stats_references_*_{CONF['YEAR']}.csv de"
          f" {csv_dir()} · território: {CONF['REF_TERRITORIO']}")
    refs_df = load_references_csv(lulc_year=CONF["YEAR"])
    refs_df.to_csv(cache, index=False)
    print(f"[OUT] {cache} ({len(refs_df)} linhas)")

# --- QA das referências ------------------------------------------------------
problems = qa_references(refs_df)
for p in problems:
    print("[QA !]", p)
if not problems:
    print("[QA OK] referências: todas com área > 0 nas classes cobertas")

# --- linhas dos produtos (densidade por classe, 2023) ------------------------
products = product_lines(forest, grass, year=CONF["YEAR"])
print(f"[PROD] {len(products)} linhas produto×versão×classe · "
      f"produtos: {sorted(products['produto'].unique())}")

# --- 2) T1 · cross 2023 ------------------------------------------------------
t1 = cross_2023(products, refs_df)
t1_path = out_dir() / "tabela_cross_2023.csv"
t1.to_csv(t1_path, index=False)
print(f"[OUT] {t1_path} ({len(t1)} linhas)")

# --- 3) T2 · melhor ano de referência ----------------------------------------
t2 = best_reference_year(products, refs_df,
                         min_valid=CONF["REF_MIN_VALID"])
t2_path = out_dir() / "tabela_melhor_ano_referencia_2023.csv"
t2.to_csv(t2_path, index=False)
print(f"[OUT] {t2_path} ({len(t2)} linhas)")

# --- 4) resumo markdown ------------------------------------------------------
lines = []
lines.append("# MAPBIOMAS-CARBONO Pantanal — análise de dados de referência (2023)")
lines.append("")
lines.append("Termos comuns: densidade **t C/ha** por classe (1 Mg = 1 t;")
lines.append("convertido de AGB com fator %.2f). Biomassa (t MS/ha) comparada"
             " com AGB (lenhoso)." % CARBON_FRACTION)
lines.append("")
lines.append("## T1 · volumes por marcador × grupo de referência")
if len(t1):
    g1 = t1.groupby(["marcador", "ref_group"])["diff_pct"].describe()
    lines.append(g1.to_string())
    lines.append("")
    dens = t1.groupby("produto")["dens_prod"].describe()
    lines.append("## Produto — densidade por classe")
    lines.append(dens.to_string())
    lines.append("")
if len(t2):
    prov = t1[t1["produto"] == "forest"]
    if len(prov):
        fi = prov.groupby("ref_id")["diff_pct"].agg(
            ["median"]).sort_values("median")
        lines.append("## Viés do produto florestal (agbd tratado como C)")
        lines.append("diff_pct mediana por referência (|produto - ref|/prod):")
        lines.append(fi.to_string())
        lines.append("")
    lines.append("## T2 · distribuição do melhor ano de referência")
    if t2["melhor_ref"].notna().any():
        g2 = (t2.dropna(subset=["melhor_ref"])
               .groupby(["produto", "melhor_ref"])["melhor_year"]
               .agg(lambda s: s.value_counts().to_dict()))
        lines.append(g2.to_string())
        lines.append("")
        imp = (t2.dropna(subset=["fator_impl"])
               .groupby("produto")["fator_impl"].agg(["median", "min", "max"]))
        lines.append("## fator_impl (dens_prod / dens_ref — diagnóstico de unidade)")
        lines.append(imp.to_string())
lines.append("")
lines.append("## Flags")
lines.append("- Xu2021 `b1..b20` -> anos 2000..2019 é PREMISSA (metadado ausente).")
lines.append("- AGB refs cobrem vegetação LENHOSA; campestre pode ficar sem")
lines.append("  cobertura (QA `ref_val_pct`).")
lines.append("- Avitabile Mode_K Pantanal (1985) semântica a confirmar (T2 fora).")
lines.append("- Produto florestal `fator_impl` mediano ~2 → confere C vs AGB.")
md = "\n".join(lines) + "\n"
md_path = out_dir() / "resumo_referencia_2023.md"
write_artifact(md_path, md)

print(f"[ARTEFATOS] {len(manifest())} gerados")
print("=" * 68)