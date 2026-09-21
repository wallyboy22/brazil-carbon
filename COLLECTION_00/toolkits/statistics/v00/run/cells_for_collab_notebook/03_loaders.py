"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — cells_for_collab_notebook
========================================================================
03_loaders.py · Leitura canônica dos CSVs do GEE (forest/grassland).

Rode após 02_schema. Deixa as tabelas LONGAS por versão/produto no namespace.
"""
import re

# Ano e escopo territorial dos CSVs (sufixo `_<escopo>_`).
_YEAR = CONF["YEAR"]
_SCOPE = CONF["TERRITORY_SCOPE"]

# ---------------------------------------------------------------------------
# Forest — CSV LARGO (todas as versões em colunas) → longo por versão
# ---------------------------------------------------------------------------
def load_forest() -> pd.DataFrame:
    """Carrega o CSV LARGO florestal (stats_forest_*<escopo>_<ano>.csv) e o
    desmembra em formato longo por versão, a partir das colunas '<vXX> Biomassa
    acima do solo (t MS)' / '<vXX> Carbono acima do solo (t C)*' e das
    incertezas. A biomassa é a nativa (`agbd`); o carbono é derivado no stats."""
    df = _read(f"stats_forest_*{_SCOPE}_{_YEAR}.csv")
    if not len(df):
        return pd.DataFrame()
    bio_re = re.compile(r"^(v\d+)\s+Biomassa acima do solo \(t MS\)$")
    bio_cols = [c for c in df.columns if bio_re.match(str(c))]
    if not bio_cols:
        return _clean_schema(df)  # schema antigo
    frames = []
    for c in bio_cols:
        v = bio_re.match(str(c)).group(1)
        part = df.copy()
        part["version"] = v
        part["biomassa_t"] = part[c]
        carb = f"{v} Carbono acima do solo (t C)*"
        incb = f"{v} Incerteza (t MS)"
        incc = f"{v} Incerteza (t C)*"
        part["estoque_t"] = part[carb] if carb in df.columns else pd.NA
        part["incerteza_t"] = part[incc] if incc in df.columns else pd.NA
        part["incerteza_tb"] = part[incb] if incb in df.columns else pd.NA
        frames.append(part)
    long = pd.concat(frames, ignore_index=True)
    drop_re = re.compile(
        r"^v\d+\s+(Carbono acima do solo \(t C\)\*|Incerteza \(t (MS|C)\)\*?)$")
    drop = bio_cols + [c for c in df.columns if drop_re.match(str(c))]
    long = long.drop(columns=drop, errors="ignore")
    return _clean_schema(long)


# ---------------------------------------------------------------------------
# Grassland — principal ANUAL + biomassa/ANPP mensais LONGOS
# ---------------------------------------------------------------------------
def load_grassland() -> pd.DataFrame:
    """Concatena stats_grassland_*<escopo>_<ano>.csv (principal ANUAL +
    biomassa/ANPP mensais LONGOS — 1 linha por combinação classe × def_sec × mês)."""
    return _clean_schema(_read(f"stats_grassland_*{_SCOPE}_{_YEAR}.csv"))


# ---------------------------------------------------------------------------
# Presença de arquivos
# ---------------------------------------------------------------------------
_gv = CONF["GRASSLAND_REF_VERSION"]
EXPECTED = {
    "forest": [f"stats_forest_*{_SCOPE}_{_YEAR}"],
    "grassland": [f"stats_grassland_{_gv}_{_SCOPE}_{_YEAR}",
                  f"stats_grassland_{_gv}_biomassa_mensal_{_SCOPE}_{_YEAR}",
                  f"stats_grassland_{_gv}_anpp_mensal_{_SCOPE}_{_YEAR}"],
    "references": [f"stats_references_*_{_SCOPE}_{_YEAR}"],
}


def check_presence(detect: str | None = None) -> list[str]:
    """Retorna lista de arquivos ausentes (detect via glob simples)."""
    missing = []
    for grp, pats in EXPECTED.items():
        for p in pats:
            if not list(csv_dir().glob(f"{p}*.csv")):
                missing.append((grp, p))
    for grp, m in missing:
        js = "run_references.js" if grp == "references" else "run_pantanal.js"
        print(f"[AUSENTE] {m}*.csv → rode o {js} no GEE e re-exporte"
              f" para {csv_dir()}")
    if not missing:
        print("[OK] todos os arquivos esperados presentes em", csv_dir())
    return [m for _, m in missing]

print("[OK] 03_loaders · load_forest/load_grassland/check_presence carregados")
