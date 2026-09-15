"""
MAPBIOMAS-CARBONO — Pantanal · statistics_util.py
==================================================
Funções compartilhadas pelas células do notebook de ESTATÍSTICAS
(pantanal/statistics_gcn/cellNN_*.py).

Papel do statistics_gcn (análise de escritório — leitura de CSVs do Drive):
  - lê os CSVs exportados pelo GEE (steps `7_statistics.js` das versões),
    que contêm UMA linha por classe LULC (nível n0) — SEM agregações
  - QA (fechamento/territórios, arquivos ausentes, sanidade física)
  - deriva EM MEMÓRIA as agregações n1/marcador/total (comparativos incluídos)
  - figuras (agregados por classe/marcador/versão/produto)
  - relatório XLSX (abas n0/n1/marcador/total/comparativo) + resumo .md
  - mapas OPCIONAIS (flag FAZER_MAPAS; exige re-computação no Earth Engine)

NÃO recomputa as estatísticas: se um CSV estiver faltando, o cell01 lista
qual step `7_statistics.js` rodar no GEE (e re-exportar para o Drive).

Modo de uso (ver README da pasta):
  1. Abra QUALQUER notebook do Google Colab.
  2. Rode statistics_cell00_autentication_drive.py (autentica EE + monta Drive).
  3. Coloque este arquivo (e os cellNN) na pasta de output do Drive
     (ou faça upload para o runtime) — o cell00 já adiciona a pasta ao sys.path.
  4. Rode as células seguintes apontando para o .py do fluxo (%run ou cole).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

# ---------------------------------------------------------------------------
# CONFIG (ajustável — o cell00 preenche via DRIVE_ROOT)
# ---------------------------------------------------------------------------
CONF = {
    "DRIVE_ROOT": "/content/drive/MyDrive/mapbiomas_carbono/pantanal",
    "CSV_DIR": "estatisticas",  # subpasta com os CSVs do 7_statistics.js
    "FIG_DIR": "figures",       # biblioteca de figuras (espelha o repo figures/)
    "OUT_DIR": "relatorio",     # XLSX + .md de resumo
    "YEAR": 2023,
    # --- escopo esperado dos arquivos ---
    "FOREST_VERSIONS": ["v03", "v04", "v05", "v06", "v07", "v08"],
    "GRASSLAND_PRODUCTS": ["biomass", "anpp", "carbon"],
    "GRASSLAND_REF_VERSION": "v02",  # referência do comparativo de produtos (bioma completo)
    "MISSING_TOL": 1.0,  # Mg (QA de somas)
    # --- figuras ---
    "FIGURE_DPI": 120,
    # --- mapas OPCIONAIS (off p/ padrão — recomputam no Earth Engine) ---
    "FAZER_MAPAS": False,
    "GRID_M": 10000,    # grade de agregação do mapa de médias (10 km)
    "C_RED": "#8c2d04", "C_FOREST": "#1a9850", "C_GRASS": "#fdae61",
    "C_OTHER": "#969696",
}
_MANIFEST: list[str] = []


# ---------------------------------------------------------------------------
# Paths / figuras / artefatos
# ---------------------------------------------------------------------------
def csv_dir() -> Path:
    d = Path(CONF["DRIVE_ROOT"]) / CONF["CSV_DIR"]
    d.mkdir(parents=True, exist_ok=True)
    return d


def fig_dir() -> Path:
    d = Path(CONF["DRIVE_ROOT"]) / CONF["FIG_DIR"]
    d.mkdir(parents=True, exist_ok=True)
    return d


def out_dir() -> Path:
    d = Path(CONF["DRIVE_ROOT"]) / CONF["OUT_DIR"]
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_fig(fig, name: str) -> str:
    path = fig_dir() / name
    fig.savefig(path, dpi=CONF["FIGURE_DPI"], bbox_inches="tight")
    plt.close(fig)
    _MANIFEST.append(str(path))
    print(f"[FIG] {path}")
    return str(path)


def write_artifact(path: Path, content) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, str):
        path.write_text(content, encoding="utf-8")
    else:
        path.write_text(json.dumps(content, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    _MANIFEST.append(str(path))
    print(f"[OUT] {path}")


def manifest() -> list[str]:
    return list(_MANIFEST)


# ---------------------------------------------------------------------------
# Legenda (espelho do módulo GEE COLLECTION_00/pantanal/module_lulc_legends.js)
# ---------------------------------------------------------------------------
DECIMAL = {
    3: "Formação Florestal", 4: "Formação Savânica", 5: "Mangue",
    6: "Floresta Alagável", 7: "Savana Alagada (beta)", 9: "Silvicultura",
    11: "Campo Alagado e Área Pantanosa", 12: "Formação Campestre",
    15: "Pastagem", 18: "Agricultura", 19: "Lavoura Temporária", 20: "Cana",
    21: "Mosaico de Usos", 23: "Praia, Duna e Areal", 24: "Área Urbanizada",
    25: "Outras Áreas Não Vegetadas", 29: "Afloramento Rochoso",
    30: "Mineração", 31: "Aquicultura", 32: "Apicum",
    33: "Rio, Lago e Oceano", 35: "Dendê", 36: "Lavoura Perene", 39: "Soja",
    40: "Arroz", 41: "Outras Lavouras Temporárias", 46: "Café",
    47: "Citrus", 48: "Outras Lavouras Perenes", 49: "Restinga Arbórea",
    50: "Restinga Herbácea ou Arbustiva", 75: "Usina Fotovoltaica",
    77: "Formação Herbácea Arbustiva", 84: "Marisma (beta)",
    91: "Parque eólico (beta)",
}
FOREST_CLASSES = [3, 4, 6, 7, 49]
GRASSLAND_CLASSES = [11, 12, 50]
N1_LABELS = {101: "Floresta", 102: "Campestre", 0: "Outros"}
N2_LABELS = {101: "florestal", 102: "campestre", 0: "outros"}


def n0_label(code: float) -> str:
    return DECIMAL.get(int(code), f"Classe {int(code)}")


def n2_of(code: float) -> str:
    c = int(code)
    if c in FOREST_CLASSES:
        return "florestal"
    if c in GRASSLAND_CLASSES:
        return "campestre"
    return "outros"


def marcador_of(code: float) -> str:
    return n2_of(code)


# ---------------------------------------------------------------------------
# Leitura dos CSVs do GEE (estatísticas_7)
# ---------------------------------------------------------------------------
def _drop_ee_columns(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(columns=[c for c in ("system:index", ".geo") if c in df.columns] or [],
                   errors="ignore")


def _read(pattern: str) -> pd.DataFrame:
    files = sorted(csv_dir().glob(pattern))
    if not files:
        return pd.DataFrame()
    frames = [_drop_ee_columns(pd.read_csv(f)) for f in files]
    return pd.concat(frames, ignore_index=True)


def _clean_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Padroniza o schema do consolidado a partir dos CSVs do 7_statistics.js.

    O GEE exporta APENAS o nível n0 (uma linha por classe). Caso sobrem CSVs
    antigos (com nivel/grupo), mantém somente n0 e normaliza `classe` numérica.
    """
    if df is None or not len(df):
        return pd.DataFrame()
    if "nivel" in df.columns:
        df = df[df["nivel"] == "n0"].copy()
    df = df.drop(columns=[c for c in ("nivel", "grupo") if c in df.columns],
                 errors="ignore")
    if "classe" in df.columns:
        df["classe"] = pd.to_numeric(df["classe"], errors="coerce")
    return df


def load_forest() -> pd.DataFrame:
    """Concatena stats_forest_*_2023*.csv (linhas n0 por classe LULC)."""
    return _clean_schema(_read("stats_forest_*2023*.csv"))


def load_grassland() -> pd.DataFrame:
    """Concatena stats_grassland_*_2023*.csv (linhas n0 por classe LULC)."""
    return _clean_schema(_read("stats_grassland_*2023*.csv"))


EXPECTED = {
    "forest": [f"stats_forest_{v}_*" for v in CONF["FOREST_VERSIONS"]],
    "grassland": [f"stats_grassland_*_{p}_*" for p in CONF["GRASSLAND_PRODUCTS"]],
}


def check_presence(detect: str | None = None) -> list[str]:
    """Retorna lista de arquivos ausentes (detect via glob simples)."""
    missing = []
    for grp, pats in EXPECTED.items():
        for p in pats:
            if not list(csv_dir().glob(f"{p}*.csv")):
                missing.append(p)
    for m in missing:
        js = "7_statistics.js" if "compare" in m or "stats" in m else ""
        print(f"[AUSENTE] {m}.csv → rode o step 7_statistics.js no GEE"
              f" e re-exporte para {csv_dir()}")
    if not missing:
        print("[OK] todos os arquivos esperados presentes em", csv_dir())
    return missing


# ---------------------------------------------------------------------------
# QA de fechamento (agregações derivadas EM MEMÓRIA a partir dos n0)
# ---------------------------------------------------------------------------
def qa_fecha(df: pd.DataFrame, value_col: str, key_cols: list[str],
             area_col: str = "area_ha") -> list[str]:
    """Valida o fechamento das agregações derivadas das linhas n0 por chave.

    Como o CSV do GEE traz apenas n0 (uma linha por classe), as somas de
    n1/marcador/total são RECOMPUTADAS aqui — o QA garante que a separação
    pela legenda (n1/marcador) soma o mesmo que o total, e que classes com
    área/estoque estão consistentes (sanidade de unidades, valores não nulos).
    """
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


def qa_territorios(df: pd.DataFrame, versions: list[str]) -> list[str]:
    """Avisa se alguma versão não aparecer nos CSVs."""
    found = sorted(df["version"].unique()) if "version" in df.columns else []
    missing = [v for v in versions if v not in found]
    return [f"versão sem arquivos: {m}" for m in missing]


# ---------------------------------------------------------------------------
# Agregações prontas para figuras/relatório (derivadas EM MEMÓRIA dos n0)
# ---------------------------------------------------------------------------
def pivot_marcador(df: pd.DataFrame, value_col: str,
                   keys=("version",)) -> pd.DataFrame:
    """Pivô marcador (florestal/campestre/outros) × valor, somando os n0."""
    rows = df.groupby(list(keys) + ["marcador"], dropna=False)[value_col].sum()
    return rows.reset_index()


def pivot_n0(df: pd.DataFrame, value_col: str,
             keys=("version",)) -> pd.DataFrame:
    """Tabela de classes decimais (col x versão) com n0 e n2."""
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
# Comparativos OFFLINE (derivados EM MEMÓRIA dos CSVs n0 do GEE)
# ---------------------------------------------------------------------------
def build_compare_forest(df: pd.DataFrame) -> pd.DataFrame:
    """Tabela version × marcador (florestal/campestre/outros + total), derivada
    das linhas n0 do consolidado forest. Espelha o antigo
    `compare_forest_versoes_2023.csv` do GEE."""
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


def build_compare_grassland(df: pd.DataFrame) -> pd.DataFrame:
    """Tabela produto × classe (+ TOTAL) da versão de referência (v02),
    derivada das linhas n0 do consolidado grassland. Espelha o antigo
    `compare_grassland_produtos_v02.csv` do GEE."""
    cols = ["produto", "versao", "ano", "classe", "n0", "n1", "marcador",
            "area_ha", "valor_t", "unidade"]
    if df is None or not len(df):
        return pd.DataFrame(columns=cols)
    ref = str(CONF["GRASSLAND_REF_VERSION"])
    d = df[df["versao"].astype(str) == str(ref)] if "versao" in df.columns else df
    if not len(d):
        return pd.DataFrame(columns=cols)
    out = []
    for p, grp in d.groupby("produto"):
        dec = grp.copy()
        if not len(dec):
            continue
        dec = dec.assign(produto=p, versao=ref, ano=CONF["YEAR"],
                         unidade=grp["unidade"].iloc[0])
        tot = pd.DataFrame([{
            "produto": p, "versao": ref, "ano": CONF["YEAR"], "classe": "",
            "n0": "TOTAL", "n1": "—", "marcador": "total",
            "area_ha": grp["area_ha"].sum(), "valor_t": grp["valor_t"].sum(),
            "unidade": grp["unidade"].iloc[0]}])
        out.append(pd.concat([dec[cols], tot], ignore_index=True))
    return pd.concat(out, ignore_index=True) if out else pd.DataFrame(columns=cols)