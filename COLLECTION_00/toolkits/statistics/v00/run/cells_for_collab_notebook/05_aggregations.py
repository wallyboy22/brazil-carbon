"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — cells_for_collab_notebook
========================================================================
05_aggregations.py · Agregações em memória (colapso, pivôs, comparativos).

Rode após 04_qa.
"""
# ---------------------------------------------------------------------------
# Grassland: tabela principal LONGA por produto (biomass/carbon/anpp)
# ---------------------------------------------------------------------------
def expand_grass_product(df: pd.DataFrame) -> pd.DataFrame:
    """Deriva o produto semântico a partir do schema do grassland engine
    (principal ANUAL + mensais LONGOS).

    O CSV do GEE traz `produto='grassland'` em TODAS as linhas; aqui pivota
    em longo por produto de análise:
      - principal (sem `periodo`) → 'biomass' (`Biomassa acima do solo (t MS)`)
        E 'carbon' (`Carbono acima do solo (t C)`) — 2 linhas por combinação;
      - biomassa MENSAL descartada (o anual já cobre o comparativo);
      - anpp MENSAL → 'anpp' (soma dos meses feita por por_classe).
    """
    if df is None or not len(df):
        return pd.DataFrame()
    df = df.copy()
    if "periodo" not in df.columns:
        df["periodo"] = pd.NA
    annual = df[df["periodo"].isna()].copy()
    monthly = df[df["periodo"].notna()].copy()
    longa = []
    if len(annual):
        for p, active_col in (("biomass", "biomassa_t"),
                              ("carbon", "estoque_t")):
            if active_col not in annual.columns:
                continue
            part = annual.copy()
            part["produto"] = p
            for c in ("estoque_t", "biomassa_t", "anpp_t"):
                if c in part.columns and c != active_col:
                    part[c] = pd.NA
            longa.append(part)
    if len(monthly):
        anpp = monthly[monthly["anpp_t"].notna()].copy()
        if len(anpp):
            anpp["produto"] = "anpp"
            for c in ("estoque_t", "biomassa_t"):
                if c in anpp.columns:
                    anpp[c] = pd.NA
            longa.append(anpp)
    if not longa:
        return pd.DataFrame()
    out = pd.concat(longa, ignore_index=True)
    return out[out["produto"].isin(["biomass", "carbon", "anpp"])]


# ---------------------------------------------------------------------------
# Colapso de combinações (classe × def_sec; e meses) em UMA linha por classe.
#   área/valor = soma · incerteza = QUADRATURA (sqrt Σ ι²)
# ---------------------------------------------------------------------------
_PART_KEYS = ("produto", "versao", "version", "territorio", "Bioma", "UF",
              "classe", "n0", "n1", "n2", "n3", "n4", "marcador", "natureza",
              "ano")
_SUM_COLS = ("area_ha", "estoque_t", "biomassa_t", "anpp_t")


def por_classe(df: "pd.DataFrame") -> "pd.DataFrame":
    """Colapsa as linhas de combinação (classe × def_sec; × mês) em UMA linha
    por classe: área/valores somam; incerteza em quadratura."""
    if df is None or not len(df):
        return df
    keys = [k for k in _PART_KEYS if k in df.columns]
    cols = [c for c in _SUM_COLS if c in df.columns]
    out = df.groupby(keys, dropna=False)[cols].sum().reset_index()
    for c in ("unidade",):
        if c in df.columns and c not in keys:
            out[c] = (df.groupby(keys, dropna=False)[c]
                      .first().reset_index(drop=True))
    if "incerteza_t" in df.columns:
        inc = (df.groupby(keys, dropna=False)["incerteza_t"]
               .apply(lambda s: np.sqrt(np.sum(
                   np.square(pd.to_numeric(s, errors="coerce").fillna(0)))))
               .rename("incerteza_t")
               .reset_index())
        out = out.drop(columns=["incerteza_t"], errors="ignore")
        out = out.merge(inc, on=keys, how="left")
    return out


# ---------------------------------------------------------------------------
# Pivôs
# ---------------------------------------------------------------------------
def pivot_marcador(df: pd.DataFrame, value_col: str,
                   keys=("version",)) -> pd.DataFrame:
    """Pivô marcador (florestal/campestre/outros) × valor, somando os n0."""
    rows = df.groupby(list(keys) + ["marcador"], dropna=False)[value_col].sum()
    return rows.reset_index()


def pivot_n0(df: pd.DataFrame, value_col: str,
             keys=("version",)) -> pd.DataFrame:
    """Tabela de classes (col × versão) com n0 e n2."""
    rows = df.copy()
    rows["n0"] = rows["classe"].apply(n0_label)
    rows["n2"] = rows["classe"].apply(n2_of)
    return rows.pivot_table(index=["n0", "n2"], columns=list(keys),
                            values=value_col, aggfunc="sum").reset_index()


def total_linha(df: pd.DataFrame, value_col: str, keys=("version",)) -> pd.DataFrame:
    """Total (n0) por chave × território — sempre derivado, nunca exportado."""
    return (df.groupby(list(keys) + ["territorio"])[value_col].sum()
            .reset_index())


# ---------------------------------------------------------------------------
# Comparativos OFFLINE
# ---------------------------------------------------------------------------
def build_compare_forest(df: pd.DataFrame) -> pd.DataFrame:
    """Tabela version × marcador (florestal/campestre/outros + total)."""
    if df is None or not len(df):
        return pd.DataFrame()
    rows = df.groupby(["version", "marcador"], as_index=False).agg(
        area_ha=("area_ha", "sum"),
        estoque_t=("estoque_t", "sum"),
        incerteza_t=("incerteza_t", "sum"))
    tot = df.groupby(["version"], as_index=False).agg(
        area_ha=("area_ha", "sum"),
        estoque_t=("estoque_t", "sum"),
        incerteza_t=("incerteza_t", "sum"))
    tot["marcador"] = "total"
    out = pd.concat([rows, tot], ignore_index=True)
    out.insert(1, "ano", CONF["YEAR"])
    return out[["version", "ano", "marcador", "area_ha", "estoque_t",
                "incerteza_t"]]


GRASS_VALUE_COL = {"biomass": "biomassa_t", "carbon": "estoque_t",
                   "anpp": "anpp_t"}
GRASS_PRODUCT_LABEL = {
    "biomass": "Biomassa acima do solo (t MS)",
    "anpp": "Produtividade primária líquida acima do solo (t MS/ano)",
    "carbon": "Carbono acima do solo (t C)"}

# Rótulo (nome da COLUNA acordada) por coluna interna de valor.
VALUE_LABEL = {
    "estoque_t": "Carbono acima do solo (t C)",
    "biomassa_t": "Biomassa acima do solo (t MS)",
    "anpp_t": "Produtividade primária líquida acima do solo (t MS/ano)",
}
# Idem, para DENSIDADE (t/ha) — usado nos gráficos de média ponderada.
VALUE_DENS_LABEL = {
    "estoque_t": "Carbono acima do solo (t C/ha)",
    "biomassa_t": "Biomassa acima do solo (t MS/ha)",
    "anpp_t": "Produtividade primária líquida acima do solo (t MS/ha/ano)",
}


def grass_value_col(produto) -> str:
    """Coluna de valor do produto campestre no consolidado grassland."""
    return GRASS_VALUE_COL.get(str(produto), "biomassa_t")


def dens_ponderada(df: pd.DataFrame, value_col: str,
                   keys=("classe",)) -> pd.DataFrame:
    """Densidade ponderada por área: `sum(valor) / sum(area_ha)` por chave."""
    cols = list(keys) + ["area_ha", "valor", "dens"]
    if df is None or not len(df):
        return pd.DataFrame(columns=cols)
    g = (df.groupby(list(keys), dropna=False)
         .agg(area_ha=("area_ha", "sum"), valor=(value_col, "sum"))
         .reset_index())
    g["dens"] = np.where(g["area_ha"] > 0, g["valor"] / g["area_ha"], np.nan)
    return g


def build_compare_grassland(df: pd.DataFrame) -> pd.DataFrame:
    """Tabela produto × classe (+ TOTAL) da versão de referência."""
    cols = ["produto", "versao", "ano", "territorio", "unidade", "classe",
            "n0", "n1", "marcador", "area_ha", "valor_t"]
    if df is None or not len(df):
        return pd.DataFrame(columns=cols)
    ref = str(CONF["GRASSLAND_REF_VERSION"])
    d = df[df["versao"].astype(str) == ref].copy() if "versao" in df.columns else df.copy()
    if not len(d):
        return pd.DataFrame(columns=cols)
    out = []
    for p in ("biomass", "carbon", "anpp"):
        vc = grass_value_col(p)
        sub = d[d["produto"] == p].copy()
        if not len(sub):
            continue
        sub = por_classe(sub)
        if not len(sub):
            continue
        dec = pd.DataFrame({
            "produto": p, "versao": ref, "ano": CONF["YEAR"],
            "territorio": sub["territorio"].iloc[0]
            if "territorio" in sub else "",
            "unidade": sub["unidade"].iloc[0] if "unidade" in sub else "t",
            "classe": sub["classe"], "n0": sub["n0"], "n1": sub["n1"],
            "marcador": sub["marcador"], "area_ha": sub["area_ha"],
            "valor_t": sub[vc]})
        tot = pd.DataFrame([{
            "produto": p, "versao": ref, "ano": CONF["YEAR"],
            "territorio": dec["territorio"].iloc[0],
            "unidade": dec["unidade"].iloc[0],
            "classe": "", "n0": "TOTAL", "n1": "—", "marcador": "total",
            "area_ha": sub["area_ha"].sum(), "valor_t": sub[vc].sum()}])
        out.append(pd.concat([dec, tot], ignore_index=True))
    return pd.concat(out, ignore_index=True) if out else pd.DataFrame(columns=cols)


# ---------------------------------------------------------------------------
# Coluna `data` (YYYY-MM-DD) — compatível com o Looker Studio
# ---------------------------------------------------------------------------
def add_data_col(df: pd.DataFrame) -> pd.DataFrame:
    """Adiciona a coluna `data` (ISO `YYYY-MM-DD`) para o Looker Studio.

    - linhas mensais (coluna `periodo` = 'YYYY_MM') → 'YYYY-MM-01';
    - demais → 'YYYY-01-01' (de `ano`/`ano_lulc`/CONF['YEAR']).
    """
    if df is None or not len(df):
        return df
    df = df.copy()
    y = CONF["YEAR"]

    def _ano01(v):
        return f"{int(v):04d}-01-01" if pd.notna(v) else f"{int(y):04d}-01-01"

    if "periodo" in df.columns:
        def _mes(p):
            try:
                yy, mm = str(p).split("_")[:2]
                return f"{int(yy):04d}-{int(mm):02d}-01"
            except (ValueError, AttributeError):
                return f"{int(y):04d}-01-01"
        per = df["periodo"]
        if "ano" in df.columns:
            base = df["ano"].map(_ano01)
        elif "ano_lulc" in df.columns:
            base = df["ano_lulc"].map(_ano01)
        else:
            base = f"{int(y):04d}-01-01"
        df["data"] = [(_mes(p) if pd.notna(p) else b)
                      for p, b in zip(per, base if hasattr(base, "__iter__")
                                      else [base] * len(df))]
    else:
        if "ano" in df.columns:
            df["data"] = df["ano"].map(_ano01)
        elif "ano_lulc" in df.columns:
            df["data"] = df["ano_lulc"].map(_ano01)
        else:
            df["data"] = f"{int(y):04d}-01-01"
    return df

print("[OK] 05_aggregations · agregações carregadas")
