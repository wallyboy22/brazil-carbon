"""
MAPBIOMAS-CARBONO — Pantanal · referencia_mbc11.py
===================================================
Dados de referência de biomassa/carbono: catálogo operacional, computação por
classe C11 e cruzes `produto × referência` em termos comuns (t C/ha).

Fonte das referências: repositório CCAL (IPAM) — Biomass_ref_maps (17 assets) +
QCN/TCN (4ª/3ª Comunicação Nacional do Brasil), espelho das fichas em
COLLECTION_00/docs.

Convenções (padrão do projeto):
  - unidade canônica de comparação de ESTOQUE: t C/ha (densidade por classe)
    e t C (total). 1 Mg = 1 t (numericamente); "Nunca usar Mg/ha".
  - conversão AGB → C: CARBON_FRACTION = 0.47 (IPCC default; configurável).
  - referências de BIOMASSA (t MS/ha → AGB t/ha) comparadas sem fator (lenhoso).

Pontos de atenção (documentados, não escondidos):
  1. O produto florestal trata o `agbd` do GEDI (biomassa, Mg/ha) como t C/ha
     ⇒ em média ~1 e ~2x os mapas de referência (AGB vs AGC). O cruzamento
     revela esse viés via `fator_impl` (dens_prod / dens_ref).
  2. Xu & Saatchi (2021) = carbono de biomassa VIVA (AGB+BGB), 2000–2019 (10 km).
     Ordem b1..b20 → anos 2000..2019 é PREMISSA (metadado não disponível no asset).
  3. Avitabile Mode_K Pantanal (banda `total_1985`) tem semântica/unidade a
     confirmar — entra no T1 (contexto), fora do T2 (candidato).
  4. Referências AGB cobrem vegetação LENHOSA: em classes campestres a área
     válida (~0%) invalida o cruzamento — QA por `valid_pct`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from lulc_mbc11 import C11_ASSET

# ---------------------------------------------------------------------------
# Constantes / configuração
# ---------------------------------------------------------------------------
CARBON_FRACTION = 0.47  # AGB (t) -> C (t), IPCC default (AGB→AGC)
REF_MIN_VALID = 0.05    # fração mínima de área válida p/ considerar a comparação
PANTANAL_FC = ("projects/ee-ipam/assets/ORIGINAIS/IBGE/"
               "limite_biomas_IBGE_2026")
REF_ROOT = "projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps"
QCN_ROOT = "projects/ee-ipam/assets/CCAL/public/qcn"

# Ano assumido p/ a coluna "melhor época" de referências estáticas (T1).
XU_START_YEAR = 2000
XU_END_YEAR = 2019


# ---------------------------------------------------------------------------
# Catálogo operacional
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Ref:
    ref_id: str
    asset: str
    group: str
    variable: str
    unit: str            # unidade nativa dos valores (t/ha | t C/ha)
    term: str            # 'agb' | 'agc' | 'bgc' | 'live' | 'total' | 'error'
    epoch: str           # '2011' | '2000'... | 'baseline' | '1985'
    bands: tuple = ()    # bandas a computar; tupla de anos p/ Xu (1999 < ano < 2020)
    scale: float = 928.0
    factor_to_c: float = 1.0     # multiplica dens. nativa -> t C/ha
    nodata_le: Optional[float] = None   # se valor <= nodata_le -> mascarar
    t2_candidate: bool = True    # elegível ao "melhor ano de referência" (T2)
    filter_index: Optional[str] = None   # para IMAGE_COLLECTION: system:index
    note: str = ""

    def band_for(self, key):
        """Resolve banda do asset a partir da chave (ano p/ Xu, banda p/ demais)."""
        if isinstance(key, int) and XU_START_YEAR <= key <= XU_END_YEAR:
            return f"b{key - XU_START_YEAR + 1}"
        return str(key)


def _r(ref_id, asset, group, variable, unit, term, epoch, bands=(), scale=928.0,
       factor_to_c=1.0, nodata_le=None, t2_candidate=True, filter_index=None,
       note=""):
    return Ref(ref_id=ref_id, asset=asset, group=group, variable=variable,
               unit=unit, term=term, epoch=epoch, bands=tuple(bands),
               scale=scale, factor_to_c=factor_to_c, nodata_le=nodata_le,
               t2_candidate=t2_candidate, filter_index=filter_index, note=note)


_E_ = None  # (não usado; mantido p/ clareza das linhas abaixo)

REF_CATALOG: list[Ref] = [
    # ---- Saatchi 2011 (Américas, ~1 km, florestas) ---------------------------
    _r("saatchi_agb", f"{REF_ROOT}/Saatchi_2011_america_agb_1km", "Saatchi 2011",
       "AGB", "t/ha", "agb", "2011", ("b1",), 928.0, CARBON_FRACTION,
       note="florestal; 2007-08"),
    _r("saatchi_carbon", f"{REF_ROOT}/Saatchi_2011_america_carbon_1km",
       "Saatchi 2011", "AGC", "t C/ha", "agc", "2011", ("b1",), 928.0, 1.0),
    _r("saatchi_bgb", f"{REF_ROOT}/Saatchi_2011_america_bgb_1km", "Saatchi 2011",
       "BGB", "t/ha", "bgc", "2011", ("b1",), 928.0, CARBON_FRACTION,
       t2_candidate=False, note="pool BGB (contexto)"),
    _r("saatchi_carbon_error",
       f"{REF_ROOT}/Saatchi_2011_america_carbon_error_1km", "Saatchi 2011",
       "erro AGC", "t C/ha", "error", "2011", ("b1",), 928.0, 1.0,
       t2_candidate=False, note="incerteza da ref"),
    # ---- Baccini 2012 (tropical, ~30 m; teto byte 255) -----------------------
    _r("baccini_agb", f"{REF_ROOT}/Z_baccini_30_agb", "Baccini 2012", "AGB",
       "t/ha", "agb", "2012", ("b1",), 30.0, CARBON_FRACTION,
       note="teto 255 t/ha (saturação, não físico)"),
    # ---- Avitabile 2016 (fusão Saatchi+Baccini, ~1 km, ano-base 2010) --------
    _r("avitabile_agb", f"{REF_ROOT}/Avitabile_AGB_Map", "Avitabile 2016",
       "AGB", "t/ha", "agb", "2010", ("b1",), 928.0, CARBON_FRACTION,
       nodata_le=-3.4e38, note="sentinela -3.4e38 mascarada"),
    _r("avitabile_carbon_cerr",
       f"{REF_ROOT}/Avitabile_Carbon_AGB_Cerr", "Avitabile 2016",
       "AGC (Cerrado)", "t C/ha", "agc", "2010", ("b1",), 928.0, 1.0,
       nodata_le=-3.4e38),
    _r("avitabile_carbon_amaz",
       f"{REF_ROOT}/Avitabile_Carbon_AGB_amaz", "Avitabile 2016",
       "AGC (Amazônia)", "t C/ha", "agc", "2010", ("b1",), 928.0, 1.0,
       nodata_le=-3.4e38),
    _r("avitabile_mode_k_pant",
       f"{REF_ROOT}/Avitabile_AGB_Map_Mode_K_2_2", "Avitabile 2016",
       "AGB Mode K (Pantanal)", "t/ha", "agb", "1985", ("total_1985",),
       250.0, CARBON_FRACTION, t2_candidate=False, filter_index="pantanal_rect_total_v2",
       note="semântica/unidade a confirmar (banco total_1985)"),
    # ---- Xu & Saatchi 2021 (biomassa viva AGB+BGB, C Mg/ha, 2000–2019, 10 km)
    _r("xu2021", f"{REF_ROOT}/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2",
       "Xu & Saatchi 2021", "carbono biomassa viva (AGB+BGB)", "t C/ha", "live",
       "2000-2019", tuple(range(XU_START_YEAR, XU_END_YEAR + 1)),
       11131.949, 1.0, note="b<i> -> ano 1999+i (premissa); inclui BGB"),
    # ---- TCN (3ª CN, baseline pretérito, ~110 m) ------------------------------
    _r("tcn_agc", f"{REF_ROOT}/TCN_AGC_comAgua_wgs84", "TCN (3ª CN)",
       "AGC", "t C/ha", "agc", "baseline", ("b1",), 110.0, 1.0),
    _r("tcn_total", f"{REF_ROOT}/TCN_TOTALC_comAgua_wgs84", "TCN (3ª CN)",
       "estoque total (soma pools)", "t C/ha", "total", "baseline", ("b1",),
       110.0, 1.0),
    _r("tcn_bgc", f"{REF_ROOT}/TCN_BGC_comAgua_wgs84", "TCN (3ª CN)",
       "BGC", "t C/ha", "bgc", "baseline", ("b1",), 110.0, 1.0, t2_candidate=False),
    _r("tcn_dwc", f"{REF_ROOT}/TCN_DWC_comAgua_wgs84", "TCN (3ª CN)",
       "DWC", "t C/ha", "bgc", "baseline", ("b1",), 110.0, 1.0, t2_candidate=False),
    _r("tcn_litter", f"{REF_ROOT}/TCN_LITTERC_comAgua_wgs84", "TCN (3ª CN)",
       "LITTER", "t C/ha", "bgc", "baseline", ("b1",), 110.0, 1.0, t2_candidate=False),
    # ---- QCN (4ª CN, baseline / alinhada a 1985) ------------------------------
    _r("qcn_total", f"{QCN_ROOT}/qcn_brazil_historical_biomass_carbon_v1",
       "QCN (4ª CN)", "estoque total", "t C/ha", "total", "baseline",
       ("TOTAL",), 30.0, 1.0),
    _r("qcn_agb", f"{QCN_ROOT}/qcn_brazil_historical_biomass_carbon_v1",
       "QCN (4ª CN)", "AGB (acima do solo)", "t C/ha", "agc", "baseline",
       ("AGB",), 30.0, 1.0),
    _r("qcnr_total", f"{QCN_ROOT}/qcn_brazil_historical_biomass_carbon_qcn_rect_v1",
       "QCN-r (4ª CN, rect)", "estoque total", "t C/ha", "total", "1985",
       ("TOTAL",), 30.0, 1.0, note="alinhada ao grid/ano-base MapBiomas 1985"),
    _r("qcnr_agb", f"{QCN_ROOT}/qcn_brazil_historical_biomass_carbon_qcn_rect_v1",
       "QCN-r (4ª CN, rect)", "AGB (acima do solo)", "t C/ha", "agc", "1985",
       ("AGB",), 30.0, 1.0, note="alinhada ao grid/ano-base MapBiomas 1985"),
]

REF_BY_ID = {r.ref_id: r for r in REF_CATALOG}


# ---------------------------------------------------------------------------
# Computação no Earth Engine (por classe C11, bioma Pantanal)
# ---------------------------------------------------------------------------
def _load_ref_image(r: Ref, key) -> "ee.Image":
    import ee
    if r.filter_index:
        img = ee.Image(ee.ImageCollection(r.asset)
                       .filter(ee.Filter.eq("system:index", r.filter_index))
                       .first())
    else:
        img = ee.Image(r.asset)
    band = r.band_for(key)
    img = img.select(band)
    if r.nodata_le is not None:
        img = img.updateMask(img.gt(r.nodata_le))
    return img


def compute_for_biome(r: Ref, key, lulc_year: int = 2023,
                      biome: "ee.Geometry" | None = None,
                      max_pixels: int = int(1e13),
                      scale_overrides: dict | None = None) -> dict:
    """Soma por classe C11 (lulc_year) do bioma: área válida, soma e densidade.

    Retorna dict com chaves: ref_id, band, year, rows (lista de dicts por
    classe: classe, area_ha, total_native, dens_native).
    """
    import ee
    if biome is None:
        biome = (ee.FeatureCollection(PANTANAL_FC)
                 .filter(ee.Filter.eq("Bioma", "Pantanal")).geometry())
    lulc = ee.Image(C11_ASSET).select(f"classification_{lulc_year}").rename("classe")
    val = _load_ref_image(r, key).rename("val")
    area = ee.Image.pixelArea().divide(10000).rename("area_ha")
    stack = ee.Image.cat([val, val.multiply(area), area, lulc])
    scale = (scale_overrides or {}).get(r.ref_id, r.scale)
    red = (ee.Reducer.sum().repeat(3)
           .group(groupField=3, groupName="classe"))
    res = stack.reduceRegion(reducer=red, geometry=biome, scale=scale,
                             maxPixels=max_pixels, tileScale=2)
    raw = res.getInfo()
    rows = []
    for g in raw.get("groups") or []:
        try:
            s = g["sum"]
            if isinstance(s, list):
                s0, s1, s2 = (float(x) for x in s)
            else:
                s0 = float(g["sum"]); s1 = float(g["sum_1"]); s2 = float(g["sum_2"])
        except (KeyError, TypeError, ValueError):
            continue
        dens = (s1 / s2) if s2 > 0 else 0.0
        rows.append({"classe": g["classe"], "area_ha": round(s2, 1),
                     "total_native": round(s1, 1), "dens_native": round(dens, 3)})
    row_type = "year" if isinstance(key, int) else "band"
    return {"ref_id": r.ref_id, "band": r.band_for(key), row_type: key,
            "rows": rows}


def compute_all_references(lulc_year: int = 2023, max_pixels: int = int(1e13),
                           scale_overrides: dict | None = None,
                           ref_ids: list[str] | None = None) -> list[dict]:
    """Computa todas as referências (ou um subconjunto por ref_ids)."""
    out = []
    for r in REF_CATALOG:
        if ref_ids is not None and r.ref_id not in ref_ids:
            continue
        for key in r.bands:
            rec = compute_for_biome(r, key, lulc_year=lulc_year,
                                    max_pixels=max_pixels,
                                    scale_overrides=scale_overrides)
            out.append(rec)
    return out


def refs_to_frame(records: list[dict]) -> "pd.DataFrame":
    """Converte records de compute_all_references() em DataFrame longo:
    ref_id, band, year, classe, area_ha, dens_native, total_native, term,
    unit, factor_to_c, epoch, t2_candidate."""
    import pandas as pd
    rows = []
    for rec in records:
        r = REF_BY_ID[rec["ref_id"]]
        for row in rec["rows"]:
            rows.append({**row, "ref_id": r.ref_id, "band": rec["band"],
                         "year": rec.get("year"), "ref_term": r.term,
                         "unit": r.unit, "factor_to_c": r.factor_to_c,
                         "epoch": r.epoch, "group": r.group,
                         "variable": r.variable,
                         "t2_candidate": r.t2_candidate})
    df = pd.DataFrame(rows)
    if not df.empty:
        df["classe"] = pd.to_numeric(df["classe"], errors="coerce")
    return df


# ---------------------------------------------------------------------------
# Termos comuns: valor da referência na unidade do produto
# ---------------------------------------------------------------------------
# Categorias de referência aceitas por termo de PRODUTO.
ALLOWED_TERMS = {
    "agc":     ("agc", "live"),      # estoque de carbono acima do solo
    "carbon":  ("agc", "live", "total"),
    "biomass": ("agb",),             # uma única coluna manda no produto
}
PRODUCT_TERM = {"forest": "agc", "grassland_carbon": "carbon",
                "grassland_biomass": "biomass"}


def ref_value_for_product(df: "pd.DataFrame", product_term: str) -> "pd.DataFrame":
    """Adiciona `ref_value` (densidade na unidade do produto) e `val_unit`."""
    df = df.copy()
    if product_term == "biomass":
        df["ref_value"] = df["dens_native"]
        df["val_unit"] = df["unit"]  # AGB t/ha comparada a t MS/ha
    else:
        df["ref_value"] = df["dens_native"] * df["factor_to_c"]
        df["val_unit"] = "t C/ha"
    df["ref_total"] = df["total_native"] * df["factor_to_c"]
    return df


# ---------------------------------------------------------------------------
# Tabela 1 — cruzamento ano 2023 (todas as versões × referências)
# ---------------------------------------------------------------------------
def product_lines(forest: "pd.DataFrame", grassland: "pd.DataFrame",
                  year: int = 2023) -> "pd.DataFrame":
    """Linhas produto×versão×classe com densidade e incerteza (2023).

    forest    → produto='forest'   dens = estoque_t/area_ha (t C/ha), term 'agc'
    grassland → 'grassland_carbon' dens = estoque_t/area_ha (t C/ha)
                'grassland_biomass' dens = biomassa_t/area_ha (t MS/ha)
    (ANPP fica fora — fluxo, sem referência de estoque.)
    """
    import pandas as pd
    rows = []
    if forest is not None and len(forest):
        f = forest[forest["ano"] == year] if "ano" in forest else forest
        rows.append(pd.DataFrame({
            "produto": "forest", "versao": f["version"].astype(str),
            "classe": pd.to_numeric(f["classe"], errors="coerce"),
            "n0": f["n0"], "n1": f["n1"], "natureza": f["natureza"],
            "marcador": f["marcador"], "area_ha": f["area_ha"],
            "dens_prod": f["estoque_t"] / f["area_ha"].replace(0, pd.NA),
            "inc_tcha": f["incerteza_t"] / f["area_ha"].replace(0, pd.NA),
            "term": "agc"}))
    if grassland is not None and len(grassland):
        g = grassland[grassland["ano"] == year] if "ano" in grassland else grassland
        g = g[g["produto"].isin(["carbon", "biomass"])].copy()
        for pname, pproduto, vcol in (("grassland_carbon", "carbon", "estoque_t"),
                                      ("grassland_biomass", "biomass", "biomassa_t")):
            sub = g[g["produto"] == pproduto]
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
    """T1 · linha por produto×versão×classe×referência (época representativa).

    Para séries (Xu) usa o ano mais próximo de YEAR como época default; para
    referências estáticas usa `epoch`. Adiciona dens/diff/incerteza/val_pct.
    """
    import pandas as pd
    if not len(products) or not len(refs):
        return pd.DataFrame()
    frames = []
    for term, gterm in products.groupby("term"):
        allowed = ALLOWED_TERMS.get(term, ())
        sub = refs[refs["ref_term"].isin(allowed)].copy()
        if not len(sub):
            continue
        # época representativa de cada ref (Xu → último ano; demais → único)
        sub = _representative_rows(sub)
        j = gterm.merge(sub, on="classe", how="left")
        j = ref_value_for_product(j, term)
        j["diff"] = j["dens_prod"] - j["ref_value"]
        j["diff_pct"] = 100 * j["diff"] / j["ref_value"].replace(0, pd.NA)
        j["val_pct"] = j["area_ha_y"] / j["area_ha_x"].replace(0, pd.NA)
        j["dentro_inc"] = (j["diff"].abs() <= j["inc_tcha"])
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
    """Mantém 1 linha por ref×classe: banda/epoca representativa."""
    out = []
    for (rid, cls), g in refs.groupby(["ref_id", "classe"]):
        if "year" in g.columns and g["year"].notna().any():
            g = g[g["year"] == g["year"].max()]
        else:
            g = g.head(1)
        out.append(g)
    import pandas as pd
    return pd.concat(out, ignore_index=True) if out else refs


# ---------------------------------------------------------------------------
# Tabela 2 — melhor ano de referência (distância mínima de densidade)
# ---------------------------------------------------------------------------
def best_reference_year(products: "pd.DataFrame", refs: "pd.DataFrame",
                        min_valid: float = REF_MIN_VALID) -> "pd.DataFrame":
    """T2 · por produto×versão×classe: ref+época que minimiza |dens|
    entre as referências elegíveis (t2_candidate) com val_pct >= min_valid.

    Retorna também fator_impl (dens_prod/dens_ref) como diagnóstico do viés de
    unidade do produto florestal (agbd tratado como C) e top-3 candidatos.
    """
    import pandas as pd
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
    rec = ("Xu2021" if best["ref_id"] == "xu2021" else best["ref_id"]) + "/" + \
        (_clean_year(best.get("year")) or best["epoch"])
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


# ---------------------------------------------------------------------------
# QA das referências
# ---------------------------------------------------------------------------
def qa_references(refs: "pd.DataFrame", min_valid: float = REF_MIN_VALID) -> list[str]:
    import pandas as pd
    problems = []
    if not len(refs):
        return problems
    tot = refs.groupby(["ref_id", "band", "classe"])["area_ha"].sum().reset_index()
    for (rid, band), g in tot.groupby(["ref_id", "band"]):
        classes_nn = (g["area_ha"] > 0).sum()
        zero = (g["area_ha"] == 0).sum()
        if zero:
            problems.append(f"{rid}/{band}: {zero} classes com área 0 "
                            "(ref não cobre — esperado em campestre p/ AGB)")
    return problems