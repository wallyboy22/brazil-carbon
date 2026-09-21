"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — cells_for_collab_notebook
========================================================================
06_references.py · Catálogo/mapa das REFERÊNCIAS + análise T1/T2.

As estatísticas das referências são computadas NO EARTH ENGINE (run/run_references.js)
e exportadas **1 CSV por FAMÍLIA** (`stats_references_<grupo>_<escopo>_<ano>.csv`),
com as métricas de cada ref em COLUNAS descritivas. Aqui:
  · `load_references_csv` faz o *unpivot* das colunas nativas para longo,
    derivando (termo, unidade, fator) do NOME da coluna;
  · T1 (`cross_2023`) e T2 (`best_reference_year`) cruzam por TERMO.

Rode após 05_aggregations.
"""
# ---------------------------------------------------------------------------
# Constantes e mapas
# ---------------------------------------------------------------------------
CARBON_FRACTION = CONF["CARBON_FRACTION"]  # AGB (t) -> C (t)
REF_MIN_VALID = CONF["REF_MIN_VALID"]      # fração mínima de área válida

# Família (grupo do arquivo) → rótulo + época (o ano-base vai no nome do grupo).
GRUPO_META = {
    "saatchi":   {"group": "Saatchi 2011", "epoch": "2011"},
    "baccini":   {"group": "Baccini 2012", "epoch": "2012"},
    "zimbres":   {"group": "Zimbres 2021", "epoch": "2019"},
    "avitabile": {"group": "Avitabile 2016", "epoch": "2010"},
    "xu":        {"group": "Xu & Saatchi 2021", "epoch": "2019"},
    "tcn":       {"group": "TCN (3ª CN)", "epoch": "baseline"},
    "qcn":       {"group": "QCN (4ª CN)", "epoch": "baseline"},
    "qcnr":      {"group": "QCN-r (4ª CN)", "epoch": "1985"},
}

# Colunas NATIVAS das referências (nome → termo). As colunas com `*` (derivadas
# no estágio de estatística) são ignoradas — o carbono sai de AGB × fator.
REF_NATIVE_COLS = {
    "Biomassa acima do solo (t MS)": "agb",
    "Carbono acima do solo (t C)": "agc",
    "Biomassa abaixo do solo (t MS)": "bgb",
    "Carbono abaixo do solo (t C)": "bgc",
    "Carbono na madeira morta (t C)": "cdw",
    "Carbono na serrapilheira (t C)": "litter",
    "Carbono vivo (t C)": "live",
    "Carbono total (t C)": "total",
    "Incerteza (t C)": "error",
}

# termo → (magnitude, factor_to_c, unidade nativa)
REF_MAG = {
    "agb": ("biomassa", CARBON_FRACTION, "t MS/ha"),
    "bgb": ("biomassa", CARBON_FRACTION, "t MS/ha"),
    "agc": ("carbono", 1.0, "t C/ha"),
    "bgc": ("carbono", 1.0, "t C/ha"),
    "cdw": ("carbono", 1.0, "t C/ha"),
    "litter": ("carbono", 1.0, "t C/ha"),
    "live": ("carbono", 1.0, "t C/ha"),
    "total": ("carbono", 1.0, "t C/ha"),
    "error": ("incerteza", 1.0, "t C/ha"),
}

# Termos elegíveis ao "melhor ano de referência" (T2).
T2_TERMS = ("agb", "agc", "total", "live")


def load_references_csv(lulc_year: int = 2023,
                        territorio: str | None = None) -> "pd.DataFrame":
    """Lê os CSVs agrupados `stats_references_*_<ano>.csv`, filtra o território
    e monta o DataFrame LONGO com UMA linha por (ref × classe).

    Colunas: ref_id, ref_family, band, year, classe, area_ha, total_native,
    dens_native, ref_term, unit, factor_to_c, epoch, group, variable,
    t2_candidate.
    """
    territorio = territorio or CONF.get("REF_TERRITORIO", "Pantanal (bioma)")
    scope = CONF.get("TERRITORY_SCOPE", "bioma_uf")
    files = sorted(csv_dir().glob(
        f"stats_references_*_{scope}_{lulc_year}.csv"))
    if not files:
        raise FileNotFoundError(
            f"nenhum stats_references_*_{scope}_{lulc_year}.csv em {csv_dir()} — "
            "rode o run/run_references.js no GEE e re-exporte para o Drive.")
    frames = []
    for fp in files:
        grupo = fp.stem.replace("stats_references_", "").replace(
            f"_{scope}_{lulc_year}", "")
        meta = GRUPO_META.get(grupo, {"group": grupo, "epoch": "?"})
        df = _derive_territorio(pd.read_csv(fp, encoding="utf-8"))
        if "Desmatamento e vegetação secundária" in df.columns:
            df["def_sec"] = df["Desmatamento e vegetação secundária"]
        df = _filter_defsec(df)
        if "territorio" in df.columns:
            df = df[df["territorio"] == territorio]
        if not len(df):
            continue
        cols = [c for c in REF_NATIVE_COLS if c in df.columns]
        if not cols:
            print(f"[AVISO] {fp.name}: nenhuma coluna de métrica reconhecida.")
            continue
        long = df[["classe", "Área (ha)"] + cols].melt(
            id_vars=["classe", "Área (ha)"], value_vars=cols,
            var_name="col", value_name="total_native")
        long["ref_family"] = grupo
        long["ref_term"] = long["col"].map(REF_NATIVE_COLS)
        long["ref_id"] = grupo + "_" + long["ref_term"]
        long["unit"] = long["ref_term"].map(lambda t: REF_MAG[t][2])
        long["factor_to_c"] = long["ref_term"].map(lambda t: REF_MAG[t][1])
        long["group"] = meta["group"]
        long["epoch"] = meta["epoch"]
        long["t2_candidate"] = long["ref_term"].isin(T2_TERMS)
        long["band"] = ""
        long["year"] = None
        long["variable"] = long["ref_term"]
        long = long.rename(columns={"Área (ha)": "area_ha"})
        frames.append(long.drop(columns=["col"]))
    if not frames:
        return pd.DataFrame()
    df = pd.concat(frames, ignore_index=True)
    for c in ("classe", "area_ha", "total_native"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["classe"])
    df = (df.groupby(["ref_id", "ref_family", "band", "classe"], dropna=False)
          .agg(area_ha=("area_ha", "sum"),
               total_native=("total_native", "sum"),
               year=("year", "first"), ref_term=("ref_term", "first"),
               unit=("unit", "first"), factor_to_c=("factor_to_c", "first"),
               epoch=("epoch", "first"), group=("group", "first"),
               variable=("variable", "first"),
               t2_candidate=("t2_candidate", "first"))
          .reset_index())
    df["area_ha"] = df["area_ha"].round(1)
    # sentinel 2 de nodata (ex.: TCN ~ ±9.22e17) → NaN
    df.loc[df["total_native"].abs() >= 1e15, "total_native"] = np.nan
    df["total_native"] = df["total_native"].round(1)
    df["dens_native"] = np.where(df["area_ha"] > 0,
                                 df["total_native"] / df["area_ha"], 0.0)
    df["dens_native"] = df["dens_native"].round(3)
    return df


# ---------------------------------------------------------------------------
# Termos comuns: valor da referência na unidade do produto
# ---------------------------------------------------------------------------
ALLOWED_TERMS = {
    "agc":     ("agc", "live"),
    "carbon":  ("agc", "live", "total", "bgc", "bgb", "cdw", "litter"),
    "biomass": ("agb",),
}
PRODUCT_TERM = {"forest": "agc", "grassland_carbon": "carbon",
                "grassland_biomass": "biomass"}


def ref_value_for_product(df: "pd.DataFrame", product_term: str) -> "pd.DataFrame":
    """Adiciona `ref_value` (densidade na unidade do produto) e `val_unit`."""
    df = df.copy()
    if product_term == "biomass":
        df["ref_value"] = df["dens_native"]
        df["val_unit"] = df["unit"]
    else:
        df["ref_value"] = df["dens_native"] * df["factor_to_c"]
        df["val_unit"] = "t C/ha"
    df["ref_total"] = df["total_native"] * df["factor_to_c"]
    return df


def product_lines(forest: "pd.DataFrame", grassland: "pd.DataFrame",
                  year: int = 2023) -> "pd.DataFrame":
    """Linhas produto×versão×classe com densidade e incerteza (ano)."""
    rows = []
    if forest is not None and len(forest):
        f = forest[forest["ano"] == year] if "ano" in forest else forest
        f = por_classe(f)
        inc = f["incerteza_t"] if "incerteza_t" in f.columns else pd.Series(
            pd.NA, index=f.index)
        rows.append(pd.DataFrame({
            "produto": "forest", "versao": f["version"].astype(str),
            "classe": pd.to_numeric(f["classe"], errors="coerce"),
            "n0": f["n0"], "n1": f["n1"], "natureza": f["natureza"],
            "marcador": f["marcador"], "area_ha": f["area_ha"],
            "dens_prod": f["estoque_t"] / f["area_ha"].replace(0, pd.NA),
            "inc_tcha": inc / f["area_ha"].replace(0, pd.NA),
            "term": "agc"}))
    if grassland is not None and len(grassland):
        g = grassland[grassland["ano"] == year] if "ano" in grassland else grassland
        g = g[g["produto"].isin(["carbon", "biomass"])].copy()
        for pname, pproduto, vcol in (("grassland_carbon", "carbon", "estoque_t"),
                                      ("grassland_biomass", "biomass", "biomassa_t")):
            sub = g[g["produto"] == pproduto].copy()
            if "periodo" in sub.columns:
                sub = sub[sub["periodo"].isna()]
            sub = por_classe(sub)
            rows.append(pd.DataFrame({
                "produto": pname, "versao": sub["versao"].astype(str),
                "classe": pd.to_numeric(sub["classe"], errors="coerce"),
                "n0": sub["n0"], "n1": sub["n1"], "natureza": sub["natureza"],
                "marcador": sub["marcador"], "area_ha": sub["area_ha"],
                "dens_prod": sub[vcol] / sub["area_ha"].replace(0, pd.NA),
                "inc_tcha": pd.NA, "term": pproduto}))
    df = pd.concat(rows, ignore_index=True) if rows else pd.DataFrame()
    if len(df):
        df = df.dropna(subset=["classe", "dens_prod"])
    return df


def cross_2023(products: "pd.DataFrame", refs: "pd.DataFrame",
               ref_epoch_default: dict | None = None) -> "pd.DataFrame":
    """T1 · linha por produto×versão×classe×referência (época representativa)."""
    if not len(products) or not len(refs):
        return pd.DataFrame()
    frames = []
    for term, gterm in products.groupby("term"):
        allowed = ALLOWED_TERMS.get(term, ())
        sub = refs[refs["ref_term"].isin(allowed)].copy()
        if not len(sub):
            continue
        sub = _representative_rows(sub)
        j = gterm.merge(sub, on="classe", how="left")
        j = ref_value_for_product(j, term)
        j["diff"] = j["dens_prod"] - j["ref_value"]
        j["diff_pct"] = 100 * j["diff"] / j["ref_value"].replace(0, pd.NA)
        j["val_pct"] = j["area_ha_y"] / j["area_ha_x"].replace(0, pd.NA)
        j["dentro_inc"] = False
        m_inc = j["diff"].notna() & j["inc_tcha"].notna()
        j.loc[m_inc, "dentro_inc"] = (j.loc[m_inc, "diff"].abs()
                                      <= j.loc[m_inc, "inc_tcha"])
        frames.append(j)
    out = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    cols = ["produto", "versao", "classe", "n0", "n1", "natureza", "marcador",
            "area_ha_x", "dens_prod", "inc_tcha", "ref_id", "group", "variable",
            "term", "ref_term", "unit", "val_unit", "epoch", "year", "band",
            "area_ha_y", "val_pct", "dens_native", "ref_value", "ref_total",
            "diff", "diff_pct", "dentro_inc"]
    if len(out):
        out = out[cols]
        cols = ["produto", "versao", "classe", "n0", "n1",
                "natureza", "marcador", "area_cls_ha", "dens_prod", "inc_tcha",
                "term", "ref_id", "ref_group", "ref_variable", "ref_term",
                "ref_unit", "val_unit", "ref_epoch", "ref_year", "ref_band",
                "ref_area_ha", "ref_val_pct", "ref_dens_native",
                "ref_value", "ref_total", "diff_dens", "diff_pct",
                "dentro_incerteza"]
        out = out.rename(columns={"area_ha_x": "area_cls_ha", "group": "ref_group",
                        "variable": "ref_variable",
                        "unit": "ref_unit", "epoch": "ref_epoch",
                        "year": "ref_year", "band": "ref_band",
                        "area_ha_y": "ref_area_ha", "val_pct": "ref_val_pct",
                        "dens_native": "ref_dens_native",
                        "diff": "diff_dens", "dentro_inc": "dentro_incerteza"})
        out = out[cols]
    return out


def _representative_rows(refs: "pd.DataFrame") -> "pd.DataFrame":
    """Mantém 1 linha por ref×classe (banda/época representativa)."""
    out = []
    for (rid, cls), g in refs.groupby(["ref_id", "classe"]):
        if "year" in g.columns and g["year"].notna().any():
            g = g[g["year"] == g["year"].max()]
        else:
            g = g.head(1)
        out.append(g)
    return pd.concat(out, ignore_index=True) if out else refs


def best_reference_year(products: "pd.DataFrame", refs: "pd.DataFrame",
                        min_valid: float = REF_MIN_VALID) -> "pd.DataFrame":
    """T2 · por produto×versão×classe: ref+época que minimiza |dens|."""
    if not len(products) or not len(refs):
        return pd.DataFrame()
    rows = []
    for (term, prod), (pid, versao, cls), prodrow in _iter_products(products):
        allowed = ALLOWED_TERMS.get(term, ())
        sub = refs[(refs["ref_term"].isin(allowed)) & (refs["t2_candidate"])]
        sub = sub[sub["classe"] == cls].copy()
        if not len(sub):
            rows.append(_t2_row(prodrow, None))
            continue
        sub = ref_value_for_product(sub, term)
        sub = sub.dropna(subset=["ref_value"])
        if not (prodrow["area_ha"] and prodrow["area_ha"] > 0):
            rows.append(_t2_row(prodrow, None))
            continue
        sub["val_pct"] = sub["area_ha"] / prodrow["area_ha"]
        sub = sub[sub["val_pct"] >= min_valid]
        if not len(sub):
            rows.append(_t2_row(prodrow, None))
            continue
        sub["diff_abs"] = (prodrow["dens_prod"] - sub["ref_value"]).abs()
        best = sub.sort_values("diff_abs").iloc[0]
        top = list(sub.sort_values("diff_abs")[["ref_id", "epoch"]]
                   .itertuples(index=False, name=None))
        rows.append(_t2_row(prodrow, best, top))
    df = pd.DataFrame(rows)
    return df


def _iter_products(products: "pd.DataFrame"):
    for (pid, versao, cls), g in products.groupby(["produto", "versao", "classe"]):
        row = g.iloc[0]
        yield (row["term"], ""), (pid, versao, cls), {
            "produto": pid, "versao": versao, "classe": cls, "n0": row["n0"],
            "n1": row["n1"], "natureza": row["natureza"],
            "marcador": row["marcador"], "area_ha": row["area_ha"],
            "dens_prod": row["dens_prod"], "term": row["term"]}


def _clean_year(year):
    try:
        y = float(year)
    except (TypeError, ValueError):
        return None
    return str(int(y)) if y == y else None


def _t2_row(prow, best, top=None):
    if best is None:
        return {**{k: prow[k] for k in ("produto", "versao", "classe", "n0",
                                        "n1", "natureza", "marcador", "area_ha",
                                        "dens_prod")},
                "melhor_ref": None, "melhor_epoch": None, "melhor_year": None,
                "melhor_dens_ref": None, "diff_abs": None, "diff_pct": None,
                "fator_impl": None, "candidatos_top3": None,
                "recomendacao": "sem referência confiável (cobertura/termo)"}
    rec = best["ref_id"] + "/" + (_clean_year(best.get("year")) or best["epoch"])
    dens = float(best["ref_value"])
    diff_abs = abs(float(prow["dens_prod"]) - dens)
    return {**{k: prow[k] for k in ("produto", "versao", "classe", "n0", "n1",
                                    "natureza", "marcador", "area_ha",
                                    "dens_prod")},
            "melhor_ref": best["ref_id"], "melhor_epoch": best["epoch"],
            "melhor_year": best.get("year"),
            "melhor_dens_ref": round(dens, 3),
            "diff_abs": round(diff_abs, 3),
            "diff_pct": round(100 * diff_abs / max(float(prow["dens_prod"]), 1e-9), 1),
            "fator_impl": round(float(prow["dens_prod"]) / dens, 3)
            if dens > 0 else None,
            "candidatos_top3": " | ".join(f"{r}/{e}" for r, e in (top or [])[:3]),
            "recomendacao": rec}


def qa_references(refs: "pd.DataFrame", min_valid: float = REF_MIN_VALID) -> list[str]:
    problems = []
    if not len(refs):
        return problems
    tot = refs.groupby(["ref_id", "band", "classe"])["area_ha"].sum().reset_index()
    for (rid, band), g in tot.groupby(["ref_id", "band"]):
        zero = (g["area_ha"] == 0).sum()
        if zero:
            problems.append(f"{rid}/{band}: {zero} classes com área 0 "
                            "(ref não cobre — esperado em campestre p/ AGB)")
    return problems

print("[OK] 06_references · catálogo de famílias + load_references_csv + T1/T2")
