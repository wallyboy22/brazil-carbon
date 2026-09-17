"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — cells_for_collab_notebook
========================================================================
04_qa.py · QA de fechamento, def_sec e territórios.

Rode após 03_loaders.
"""
# ---------------------------------------------------------------------------
# QA de fechamento (agregações derivadas EM MEMÓRIA a partir dos n0)
# ---------------------------------------------------------------------------
def qa_fecha(df: pd.DataFrame, value_col: str, key_cols: list[str],
             area_col: str = "area_ha") -> list[str]:
    """Valida o fechamento das agregações derivadas das combinações por chave."""
    problems: list[str] = []
    if not len(df):
        return problems
    for key, grp in df.groupby(key_cols):
        total = grp[value_col].sum()
        tot_n1 = grp.groupby("n1", dropna=False)[value_col].sum().sum()
        tot_mark = grp.groupby("marcador", dropna=False)[value_col].sum().sum()
        if abs(tot_n1 - total) > CONF["MISSING_TOL"]:
            problems.append(f"{key}: n1 ({tot_n1:.1f}) ≠ total ({total:.1f})")
        if abs(tot_mark - total) > CONF["MISSING_TOL"]:
            problems.append(f"{key}: marcador ({tot_mark:.1f}) ≠ total "
                            f"({total:.1f})")
        if grp["marcador"].isna().any():
            problems.append(f"{key}: há classes sem marcador (legenda)")
        if (grp[value_col] < 0).any() or (grp[area_col] < 0).any():
            problems.append(f"{key}: valores negativos de {value_col}/área")
        dens = grp[value_col].sum() / max(grp[area_col].sum(), 1e-6)
        if grp[area_col].sum() > 0 and dens > CONF["DENSITY_MAX"]:
            problems.append(f"{key}: densidade média implícita {dens:.0f} "
                            f"t/ha > {CONF['DENSITY_MAX']} (unidades?)")
        if grp[area_col].sum() <= 0 and grp[value_col].sum() > 0:
            problems.append(f"{key}: estoque > 0 sem área")
    return problems


def qa_somas(df: pd.DataFrame, value_col: str, key_cols: list[str],
             area_col: str = "area_ha") -> list[str]:
    """QA de fechamento das agregações n0 (n1 = total, sem valores nulos)."""
    problems: list[str] = []
    if not len(df):
        return problems
    for key, grp in df.groupby(key_cols):
        total = grp[value_col].sum()
        tot_n1 = grp.groupby("n1", dropna=False)[value_col].sum().sum()
        tot_mark = grp.groupby("marcador", dropna=False)[value_col].sum().sum()
        if abs(tot_n1 - total) > CONF["MISSING_TOL"]:
            problems.append(f"{key}: n1 ({tot_n1:.1f}) ≠ total ({total:.1f})")
        if abs(tot_mark - total) > CONF["MISSING_TOL"]:
            problems.append(f"{key}: marcador ({tot_mark:.1f}) ≠ total "
                            f"({total:.1f})")
        if grp[value_col].isna().any():
            problems.append(f"{key}: há nulos em {value_col}")
        dens = grp[value_col].sum() / max(grp[area_col].sum(), 1e-6)
        if grp[area_col].sum() > 0 and dens > CONF["DENSITY_MAX"]:
            problems.append(f"{key}: densidade média implícita {dens:.0f} "
                            f"t/ha > {CONF['DENSITY_MAX']} (unidades?)")
        if grp[area_col].sum() <= 0 and grp[value_col].sum() > 0:
            problems.append(f"{key}: {value_col} > 0 sem área")
    return problems


def qa_defsec(df: pd.DataFrame,
              key_cols: tuple = ("version", "territorio")) -> list[str]:
    """QA da estratificação def_sec (1 linha por combinação classe × def_sec)."""
    problems: list[str] = []
    if not len(df) or "def_sec" not in df.columns:
        return problems
    # com filtro de estrato ativo, só resta 1 def_sec → relaxa as checagens
    # específicas de def_sec (duplicidade, rótulos, dominância de 'Não Observado')
    filtered = bool(CONF.get("DEF_SEC_FILTER"))
    if "def_sec_code" not in df.columns:
        df = df.assign(def_sec_code=df["def_sec"].map(defsec_code))
    vcols = [c for c in ("estoque_t", "biomassa_t", "anpp_t")
             if c in df.columns]
    for key, grp in df.groupby(list(key_cols) + ["classe"]):
        if "periodo" in grp.columns:
            partes = [pg for _, pg in grp.groupby(
                grp["periodo"].fillna("__anual__"), dropna=False)]
        else:
            partes = [grp]
        if not filtered:
            dups = sum(pg["def_sec"].duplicated().sum() for pg in partes)
            if dups:
                problems.append(f"{key}: {dups} combinações def_sec duplicadas "
                                "(classe × def_sec × mês)")
            unknown = grp[grp["def_sec_code"] < 0]
            if len(unknown):
                labels = ", ".join(sorted({str(v) for v in unknown["def_sec"]}))
                problems.append(f"{key}: rótulos def_sec fora da legenda: {labels}")
        if grp["area_ha"].isna().any() or (grp["area_ha"] < 0).any():
            problems.append(f"{key}: área nula/negativa em combinação def_sec")
        for vc in vcols:
            # só valida a coluna ATIVA do grupo (nas tabelas longas por produto
            # as demais colunas de valor ficam NaN por construção)
            if grp[vc].notna().any() and grp[vc].isna().any():
                problems.append(f"{key}: nulos em {vc}")
            if (grp[vc] < 0).any():
                problems.append(f"{key}: valores negativos em {vc}")
        if "natureza" in grp.columns and len(grp):
            nat = grp["natureza"].iloc[0]
            mark = grp["marcador"].iloc[0]
            if nat == "Antrópico" and mark != "outros":
                problems.append(f"{key}: natureza {nat} com marcador {mark}")
        if not filtered:
            no = grp[grp["def_sec_code"] == 0]["area_ha"].sum()
            a = grp["area_ha"].sum()
            if a > 0 and no / a > 0.5:
                problems.append(f"{key}: 'Não Observado' cobre {no / a:.0%} da área")
    return problems


def qa_territorios(df: pd.DataFrame, versions: list[str]) -> list[str]:
    """Avisa se alguma versão não aparecer nos CSVs."""
    found = sorted(df["version"].unique()) if "version" in df.columns else []
    missing = [v for v in versions if v not in found]
    return [f"versão sem arquivos: {m}" for m in missing]

print("[OK] 04_qa · QA carregado")
