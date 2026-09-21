"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — 12_join_largo.py
========================================================================
Etapa 12 · Junta (join) as tabelas exportadas SEPARADAS pelo GEE numa única
tabela LARGA: uma linha por (Bioma, UF, classe, def_sec) e uma coluna por
métrica. Usa CONF + funções de 00..06 no namespace.

Fontes:
  · forest      → CSV largo (colunas '<vXX> Biomassa acima do solo (t MS)' /
                  '<vXX> Carbono acima do solo (t C)*') → é a BASE da tabela;
  · grassland   → 1 CSV por versão (principal anual) → colunas
                  'grassland <v> Biomassa acima do solo (t MS)' /
                  '... Carbono acima do solo (t C)';
  · references  → 1 CSV por FAMÍLIA (colunas de métrica descritivas, ex.:
                  'Biomassa acima do solo (t MS)', 'Carbono acima do solo (t C)*').

O join usa a chave (Bioma, UF, classe, def_sec). Saída:
  OUT_DIR/consolidado_largo_2023.csv
"""
print("=" * 68)
print("statistics · 12_join_largo · join largo")
print("=" * 68)

import re
import numpy as np
import pandas as pd

_YEAR = CONF["YEAR"]
_SCOPE = CONF.get("TERRITORY_SCOPE", "bioma_uf")
# Chave do join: rótulos territoriais presentes no escopo (bioma_uf → Bioma+UF).
_KEY_ALL = ["Bioma", "UF", "classe", "def_sec"]
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
    # sentinel 2 de nodata (ex.: TCN/grassland ~ ±9.22e17) → NaN
    num = df.select_dtypes(include=[np.number]).columns
    df[num] = df[num].mask(df[num].abs() >= 1e15)
    return _filter_defsec(df)


# --- base: forest largo ------------------------------------------------------
ff = _read(f"stats_forest_*{_SCOPE}_{_YEAR}.csv")
if not ff:
    raise FileNotFoundError(
        f"nenhum stats_forest_*{_SCOPE}_{_YEAR}.csv em " + str(csv_dir()))
base = _prep(pd.concat(ff, ignore_index=True))
KEY = [c for c in _KEY_ALL if c in base.columns]
metric_cols = [c for c in base.columns if re.match(r"^v\d+\s+", str(c))]
base = base[KEY + CATS + ["Área (ha)"] + metric_cols].copy()
print(f"[BASE] forest largo: {len(base)} linhas · {len(metric_cols)} colunas de versão")

parts = [base]

# --- grassland principal (sem `período`) -------------------------------------
for df in _read(f"stats_grassland_*{_SCOPE}_{_YEAR}.csv"):
    if "período" in df.columns:
        continue  # mensais ficam de fora da tabela larga
    df = _prep(df)
    v = str(df["versao"].iloc[0]) if ("versao" in df.columns and len(df)) else "vXX"
    ren = {}
    for c in ("Biomassa acima do solo (t MS)", "Carbono acima do solo (t C)"):
        if c in df.columns:
            ren[c] = f"grassland {v} {c}"
    df = df.rename(columns=ren)
    keep = KEY + [c for c in ren.values() if c in df.columns]
    parts.append(df[keep])
    print(f"[GRASS] {v}: {len(df)} linhas ·", list(ren.values()))

# --- references (1 CSV por família; colunas de métrica descritivas) ----------
NON_METRIC = set(KEY + CATS + [
    "ecossistema", "Unidade Federativa",
    "Desmatamento e vegetação secundária", "ano_lulc", "Área (ha)"])
for fp in sorted(csv_dir().glob(f"stats_references_*_{_SCOPE}_{_YEAR}.csv")):
    df = _prep(pd.read_csv(fp))
    grupo = fp.stem.replace("stats_references_", "").replace(
        f"_{_SCOPE}_{_YEAR}", "")
    mcols = [c for c in df.columns if c not in NON_METRIC]
    ren = {c: f"{grupo} {c}" for c in mcols}
    df = df.rename(columns=ren)
    parts.append(df[[c for c in (KEY + [ren[c] for c in mcols]) if c in df.columns]])
    print(f"[REF] {grupo}: {len(df)} linhas · {len(mcols)} métrica(s)")

# --- join largo --------------------------------------------------------------
out = parts[0]
for p in parts[1:]:
    out = out.merge(p, on=KEY, how="outer")
out = out.sort_values(KEY).reset_index(drop=True)
out = add_data_col(out)  # coluna `data` (YYYY-MM-DD) p/ Looker Studio

path = out_dir() / "consolidado_largo_2023.csv"
out.to_csv(path, index=False)
print(f"[OUT] {path} · {out.shape[0]} linhas × {out.shape[1]} colunas")
print("=" * 68)
