"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — 2_3_7_STATISTICS_CELL07_JOIN_LARGO.py
========================================================================
Célula 07 · Junta (join) as tabelas exportadas SEPARADAS pelo GEE numa única
tabela LARGA: uma linha por (Bioma, UF, classe, def_sec) e uma coluna por
métrica. Usa CONF + funções da cell00 no namespace.

Fontes:
  · forest      → CSV largo (colunas '<vXX> Estoque (t)' / '<vXX> Incerteza (t)')
                  → é a BASE da tabela;
  · grassland   → 1 CSV por versão (tabela principal anual) → colunas
                  'grassland <v> Biomassa (t)' / '... Estoque de carbono (t)';
  · references  → 1 CSV por ref (colunas de métrica já prefixadas pelo autor,
                  ex.: 'Zimbres 2021 AGB (t C)').

O join usa a chave (Bioma, UF, classe, def_sec). Saída:
  OUT_DIR/consolidado_largo_2023.csv
"""
print("=" * 68)
print("statistics_gcn · cell07 · join largo")
print("=" * 68)

import re
import pandas as pd

KEY = ["Bioma", "UF", "classe", "def_sec"]
CATS = ["cobertura (n0)", "cobertura (n1)", "cobertura (n2)",
        "cobertura (n3)", "cobertura (n4)"]


def _read(pattern):
    return [pd.read_csv(f) for f in sorted(csv_dir().glob(pattern))]


def _prep(df):
    df = df.copy()
    if "Desmatamento e vegetação secundária" in df.columns:
        df["def_sec"] = df["Desmatamento e vegetação secundária"].astype(str)
    for c in ("Bioma", "UF"):
        if c in df.columns:
            df[c] = df[c].astype(str)
    if "classe" in df.columns:
        df["classe"] = pd.to_numeric(df["classe"], errors="coerce")
    return df


# --- base: forest largo ------------------------------------------------------
ff = _read("stats_forest_*2023*.csv")
if not ff:
    raise FileNotFoundError("nenhum stats_forest_*2023*.csv em " + str(csv_dir()))
base = _prep(pd.concat(ff, ignore_index=True))
metric_cols = [c for c in base.columns if re.match(r"^v\d+\s+", str(c))]
base = base[KEY + CATS + ["Área (ha)"] + metric_cols].copy()
print(f"[BASE] forest largo: {len(base)} linhas · {len(metric_cols)} colunas de versão")

parts = [base]

# --- grassland principal (sem `período`) -------------------------------------
for df in _read("stats_grassland_*2023*.csv"):
    if "período" in df.columns:
        continue  # mensais ficam de fora da tabela larga
    df = _prep(df)
    v = str(df["versao"].iloc[0]) if ("versao" in df.columns and len(df)) else "vXX"
    ren = {}
    if "Biomassa (t)" in df.columns:
        ren["Biomassa (t)"] = f"grassland {v} Biomassa (t)"
    if "Estoque de carbono (t)" in df.columns:
        ren["Estoque de carbono (t)"] = f"grassland {v} Estoque de carbono (t)"
    df = df.rename(columns=ren)
    keep = KEY + [c for c in ren.values() if c in df.columns]
    parts.append(df[keep])
    print(f"[GRASS] {v}: {len(df)} linhas ·", list(ren.values()))

# --- references (colunas de métrica já com o autor) --------------------------
NON_METRIC = set(KEY + CATS + [
    "ecossistema", "fonte", "ref_id", "Unidade Federativa",
    "Desmatamento e vegetação secundária", "ano_lulc", "ano", "Área (ha)"])
for df in _read("stats_references_*2023*.csv"):
    df = _prep(df)
    rid = str(df["ref_id"].iloc[0]) if ("ref_id" in df.columns and len(df)) else "?"
    mcols = [c for c in df.columns if c not in NON_METRIC]
    parts.append(df[[c for c in (KEY + mcols) if c in df.columns]])
    print(f"[REF] {rid}: {len(df)} linhas · {len(mcols)} métrica(s)")

# --- join largo --------------------------------------------------------------
out = parts[0]
for p in parts[1:]:
    out = out.merge(p, on=KEY, how="outer")
out = out.sort_values(KEY).reset_index(drop=True)

path = out_dir() / "consolidado_largo_2023.csv"
out.to_csv(path, index=False)
print(f"[OUT] {path} · {out.shape[0]} linhas × {out.shape[1]} colunas")
print("=" * 68)
