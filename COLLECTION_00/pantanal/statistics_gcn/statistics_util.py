"""
MAPBIOMAS-CARBONO — Pantanal · statistics_util.py
==================================================
Funções compartilhadas pelas células do notebook de ESTATÍSTICAS
(pantanal/statistics_gcn/cellNN_*.py).

Papel do statistics_gcn (análise de escritório — leitura de CSVs do Drive):
  - lê os CSVs exportados pelo GEE (steps `7_statistics.js` das versões)
  - QA de somas (n0/n1/total, territórios, arquivos ausentes)
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


def load_forest() -> pd.DataFrame:
    """Concatena stats_forest_*_2023*.csv (níveis n0/n1/marcador/total)."""
    return _read("stats_forest_*2023*.csv")


def load_grassland() -> pd.DataFrame:
    """Concatena stats_grassland_*_2023*.csv (por produto)."""
    return _read("stats_grassland_*2023*.csv")


def load_compare_forest() -> pd.DataFrame:
    return _read("compare_forest_versoes_2023*.csv")


def load_compare_grassland() -> pd.DataFrame:
    return _read("compare_grassland_produtos_2023*.csv")


EXPECTED = {
    "forest": [f"stats_forest_{v}_*" for v in CONF["FOREST_VERSIONS"]] +
              ["compare_forest_versoes_2023"],
    "grassland": [f"stats_grassland_*_{p}_*" for p in CONF["GRASSLAND_PRODUCTS"]] +
                 ["compare_grassland_produtos_2023"],
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
# QA de somas (níveis devem fechar dentro de MISSING_TOL)
# ---------------------------------------------------------------------------
def qa_somas(df: pd.DataFrame, value_col: str, key_cols: list[str]) -> list[str]:
    """Valida total == somatório(n0) e total == somatório(n1) por chave."""
    problems = []
    for key, grp in df.groupby(key_cols):
        n0 = grp[grp["nivel"] == "n0"][value_col].sum()
        n1 = grp[grp["nivel"] == "n1"][value_col].sum()
        total_rows = grp[grp["nivel"] == "total"]
        if total_rows.empty:
            problems.append(f"{key}: sem linha total")
            continue
        total = total_rows[value_col].iloc[0]
        for label, soma in (("n0", n0), ("n1", n1)):
            if abs(soma - total) > CONF["MISSING_TOL"]:
                problems.append(f"{key}: {label} ({soma:.1f}) ≠ total ({total:.1f})")
    return problems


def qa_territorios(df: pd.DataFrame, versions: list[str]) -> list[str]:
    """Avisa se alguma versão não aparecer nos CSVs."""
    found = sorted(df["version"].unique()) if "version" in df.columns else []
    missing = [v for v in versions if v not in found]
    return [f"versão sem arquivos: {m}" for m in missing]


# ---------------------------------------------------------------------------
# Agregações prontas para figuras/relatório
# ---------------------------------------------------------------------------
def pivot_marcador(df: pd.DataFrame, value_col: str,
                   keys=("version", "marcador")) -> pd.DataFrame:
    """Pivô nivel=marcador × valor → linhas por chave."""
    rows = df[df["nivel"] == "marcador"].groupby(list(keys))[value_col].sum()
    return rows.reset_index()


def pivot_n0(df: pd.DataFrame, value_col: str,
             keys=("version",)) -> pd.DataFrame:
    """Tabela de classes decimais (col x versão) com n0 e n2."""
    rows = df[df["nivel"] == "n0"].copy()
    rows["n0"] = rows["classe"].apply(n0_label)
    rows["n2"] = rows["classe"].apply(n2_of)
    return rows.pivot_table(index=["n0", "n2"], columns=list(keys),
                            values=value_col, aggfunc="sum").reset_index()


def total_linha(df: pd.DataFrame, value_col: str, keys=("version",)) -> pd.DataFrame:
    t = df[df["nivel"] == "total"].groupby(list(keys) + ["territorio"])[
        value_col].sum()
    return t.reset_index()