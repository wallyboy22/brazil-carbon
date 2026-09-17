"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — cells_for_collab_notebook
========================================================================
02_schema.py · Schema "gráfico-ready" dos CSVs do GEE → nomes internos.

Colunas de PRODUTO (forest/grassland):
  'cobertura (n0)' → 'n0' · 'Área (ha)' → 'area_ha'
  'Biomassa acima do solo (t MS)' → 'biomassa_t'
  'Carbono acima do solo (t C)' → 'estoque_t'
  'Produtividade primária líquida acima do solo (t MS/ano)' → 'anpp_t'
Colunas de MÉTRICA das REFERÊNCIAS: ver REF_COL_MAP.

Rode após 01_legends.
"""
# ---------------------------------------------------------------------------
# Schema "gráfico-ready" dos CSVs → nomes internos canônicos.
# ---------------------------------------------------------------------------
GRAPH_COLS = {
    "cobertura (n0)": "n0",
    "cobertura (n1)": "n1",
    "cobertura (n2)": "n2",
    "cobertura (n3)": "n3",
    "cobertura (n4)": "n4",
    "Desmatamento e vegetação secundária": "def_sec",
    "Área (ha)": "area_ha",
    "Biomassa acima do solo (t MS)": "biomassa_t",
    "Carbono acima do solo (t C)": "estoque_t",
    "Produtividade primária líquida acima do solo (t MS/ano)": "anpp_t",
    "período": "periodo",
}

# Colunas de MÉTRICA das REFERÊNCIAS (nome descritivo → stem interno).
# O `*` marca a métrica derivada NO ESTÁGIO DE ESTATÍSTICA (ex.: AGB→C).
REF_COL_MAP = {
    "Biomassa acima do solo (t MS)": "agb_tB",
    "Carbono acima do solo (t C)*": "agb_tC",
    "Carbono acima do solo (t C)": "agc_tC",
    "Biomassa abaixo do solo (t MS)": "bgb_tB",
    "Carbono abaixo do solo (t C)*": "bgb_tC",
    "Carbono abaixo do solo (t C)": "bgc_tC",
    "Carbono na madeira morta (t C)": "cdw_tC",
    "Carbono na serrapilheira (t C)": "litter_tC",
    "Carbono vivo (t C)": "live_tC",
    "Carbono total (t C)": "total_tC",
    "Incerteza (t C)": "incerteza_tC",
}


def _drop_ee_columns(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(
        columns=[c for c in ("system:index", ".geo") if c in df.columns] or [],
        errors="ignore")


def _derive_territorio(df: pd.DataFrame) -> pd.DataFrame:
    """Compatibilidade: o CSV não traz `territorio`; deriva de `Bioma`."""
    if "territorio" not in df.columns and "Bioma" in df.columns:
        df["territorio"] = df["Bioma"].astype(str) + " (bioma)"
    return df


def _remap_products(df: pd.DataFrame) -> pd.DataFrame:
    """Renomeia colunas de PRODUTO (forest/grassland) para nomes internos."""
    df = df.rename(columns={k: v for k, v in GRAPH_COLS.items()
                            if k in df.columns})
    return _derive_territorio(df)


def _remap_refs(df: pd.DataFrame) -> pd.DataFrame:
    """Renomeia as colunas de MÉTRICA das REFERÊNCIAS para nomes internos."""
    df = df.rename(columns={k: v for k, v in REF_COL_MAP.items()
                            if k in df.columns})
    return _derive_territorio(df)


def _read(pattern: str) -> pd.DataFrame:
    files = sorted(csv_dir().glob(pattern))
    if not files:
        return pd.DataFrame()
    frames = [_drop_ee_columns(pd.read_csv(f)) for f in files]
    return pd.concat(frames, ignore_index=True)


def _clean_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Padroniza o schema do consolidado (produtos forest/grassland).

    O GEE exporta apenas COMBINAÇÕES (classe × def_sec; `período` nas séries
    campestres): as colunas `natureza`/`marcador`/`def_sec_code` NÃO vêm do
    CSV e são derivadas em memória a partir da classe LULC (01_legends).
    """
    if df is None or not len(df):
        return pd.DataFrame()
    if "nivel" in df.columns:
        df = df[df["nivel"] == "n0"].copy()
    df = df.drop(columns=[c for c in ("nivel", "grupo") if c in df.columns],
                 errors="ignore")
    df = _remap_products(df)
    if "classe" in df.columns:
        df["classe"] = pd.to_numeric(df["classe"], errors="coerce")
    if "def_sec" in df.columns:
        df["def_sec_code"] = df["def_sec"].map(defsec_code)
    if "natureza" not in df.columns and "classe" in df.columns:
        df["natureza"] = df["classe"].map(lambda c: natureza_of(c)
                                          if pd.notna(c) else None)
    if "marcador" not in df.columns and "classe" in df.columns:
        df["marcador"] = df["classe"].map(lambda c: marcador_of(c)
                                          if pd.notna(c) else None)
    return df

print("[OK] 02_schema · GRAPH_COLS + REF_COL_MAP + remap carregados")
