"""
MAPBIOMAS-CARBONO · Pantanal — STATISTICS_CELL05_REFERENCIA.py
==============================================================
Célula 05 · ANÁLISE DOS DADOS DE REFERÊNCIA — cruzes em termos comuns.
Rodar em Colab APÓS a cell01 (precisa dos consolidados 2023 gerados lá).

O que faz (lendo o Earth Engine — sem re-exportar nada do pipeline):
  1. computa cada referência (catálogo ref.REF_CATALOG) por classe C11/2023
     no bioma Pantanal, na escala nativa (ou coarsened via CONF) — cache em
     OUT_DIR/referencias_por_classe_2023.csv
  2. T1 · tabela_cross_2023.csv — todas as versões (forest V03–V08; grassland
     v02 carbon/biomass) × referências, densidade em t C/ha (ou t MS/ha p/
     biomass), diff e incerteza por classe
  3. T2 · tabela_melhor_ano_referencia_2023.csv — ref+época de menor distância
     de densidade por produto×versão×classe (regra adotada) + fator_impl
  4. resumo_referencia_2023.md — achados por marcador e flags (AGB→C, cobertura
     campestre, Xu 2021 b1..b20→ano 2000..2019 como premissa)

Saídas em OUT_DIR (Drive), prontas para exportar.
"""
import statistics_util as u

print("=" * 68)
print("statistics_gcn · cell05 · análise de dados de referência")
print("=" * 68)

import ee  # noqa: E402
import pandas as pd  # noqa: E402

import referencia_mbc11 as ref  # noqa: E402

# Confirma constantes via CONF (fonte única de verdade operacional).
ref.CARBON_FRACTION = u.CONF["CARBON_FRACTION"]
ref.REF_MIN_VALID = u.CONF["REF_MIN_VALID"]

# --- entrada (consolidados da cell01) ----------------------------------------
out = u.out_dir()
f_cons = out / "consolidado_forest_2023.csv"
g_cons = out / "consolidado_grassland_2023.csv"
for p in (f_cons, g_cons):
    if not p.exists():
        print(f"[FALTA] {p} — rode a cell01 antes (gera os consolidados).")
if not f_cons.exists() or not g_cons.exists():
    print("=" * 68)
    raise SystemExit(0)

forest = pd.read_csv(f_cons)
grass = pd.read_csv(g_cons)
print(f"[IN] forest {len(forest)} linhas · grassland {len(grass)} linhas")

# --- 1) referências por classe (compute EE + cache) --------------------------
cache = out / "referencias_por_classe_2023.csv"
if cache.exists():
    refs_df = pd.read_csv(cache)
    records = None
    print(f"[CACHE] {cache} ({len(refs_df)} linhas) — usar STEMP? use: apague "
          "o cache para recomputar")
else:
    scale_overrides = {}
    if not u.CONF["REF_FINE_SCALE"]:
        coarse = u.CONF["REF_SCALE_COARSE"]
        for rid in ("baccini_agb", "qcn_total", "qcn_agb",
                    "qcnr_total", "qcnr_agb", "tcn_agc", "tcn_total"):
            scale_overrides[rid] = coarse
    print("[EE] computando referências por classe C11/2023 no Pantanal ...")
    print("     escalas:", {r.ref_id: scale_overrides.get(r.ref_id, r.scale)
                            for r in ref.REF_CATALOG})
    records = ref.compute_all_references(lulc_year=u.CONF["YEAR"],
                                         scale_overrides=scale_overrides)
    refs_df = ref.refs_to_frame(records)
    refs_df.to_csv(cache, index=False)
    print(f"[OUT] {cache} ({len(refs_df)} linhas)")

# --- QA das referências ------------------------------------------------------
problems = ref.qa_references(refs_df)
for p in problems:
    print("[QA !]", p)
if not problems:
    print("[QA OK] referências: todas com área > 0 nas classes cobertas")

# --- linhas dos produtos (densidade por classe, 2023) ------------------------
products = ref.product_lines(forest, grass, year=u.CONF["YEAR"])
print(f"[PROD] {len(products)} linhas produto×versão×classe · "
      f"produtos: {sorted(products['produto'].unique())}")

# --- 2) T1 · cross 2023 ------------------------------------------------------
t1 = ref.cross_2023(products, refs_df)
t1_path = out / "tabela_cross_2023.csv"
t1.to_csv(t1_path, index=False)
print(f"[OUT] {t1_path} ({len(t1)} linhas)")

# --- 3) T2 · melhor ano de referência ----------------------------------------
t2 = ref.best_reference_year(products, refs_df,
                             min_valid=u.CONF["REF_MIN_VALID"])
t2_path = out / "tabela_melhor_ano_referencia_2023.csv"
t2.to_csv(t2_path, index=False)
print(f"[OUT] {t2_path} ({len(t2)} linhas)")

# --- 4) resumo markdown ------------------------------------------------------
lines = []
lines.append("# MAPBIOMAS-CARBONO Pantanal — análise de dados de referência (2023)")
lines.append("")
lines.append("Termos comuns: densidade **t C/ha** por classe (1 Mg = 1 t;")
lines.append("convertido de AGB com fator %.2f). Biomassa (t MS/ha) comparada"
             " com AGB (lenhoso)." % ref.CARBON_FRACTION)
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
md_path = out / "resumo_referencia_2023.md"
md_path.write_text(md, encoding="utf-8")
print(f"[OUT] {md_path}")

print(f"[ARTEFATOS] {len(u.manifest())} gerados")
print("=" * 68)