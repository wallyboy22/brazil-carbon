"""
MAPBIOMAS-CARBONO · Pantanal — 2_3_0_STATISTICS_CELL00_UTIL.py
==============================================================
Célula 00 do Google Colab (statistics_gcn = google collab notebook).
FUNÇÕES E CONFIGURAÇÃO COMPARTILHADAS — rode ANTES das células 2_3_1..2_3_6.

Não faz import de nada próprio: cole o conteúdo desta célula na PRIMEIRA
célula do notebook (ou use %run) para que CONF, as funções abaixo e a
estrutura de REFERÊNCIA fiquem disponíveis no namespace do runtime para as
células seguintes (mesmo esquema do gate v08/2_3_gcn — sem script util).

Papel do statistics_gcn (análise de escritório — leitura de CSVs do Drive):
  - lê os CSVs exportados pelo GEE (steps `7_statistics.js` das versões),
    que contêm UMA linha por classe LULC (nível n0) — SEM agregações
  - QA (fechamento/territórios, arquivos ausentes, sanidade física)
  - deriva EM MEMÓRIA as agregações n1/marcador/total (comparativos incluídos)
  - figuras (agregados por classe/marcador/versão/produto)
  - relatório XLSX (abas n0/n1/marcador/total/comparativo) + resumo .md
  - mapas OPCIONAIS (flag FAZER_MAPAS; exige re-computação no Earth Engine)
  - análise de dados de REFERÊNCIA (catalogo CCAL + T1 cross 2023 + T2 melhor
    ano de referência), lendo o Earth Engine diretamente

NÃO recomputa as estatísticas básicas: se um CSV estiver faltando, a cell02
lista qual step `7_statistics.js` rodar no GEE (e re-exportar para o Drive).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field  # noqa: F401
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

# ---------------------------------------------------------------------------
# CONFIG (ajustável a cada execução — a cell01 preenche via DRIVE_ROOT)
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
    "MISSING_TOL": 1.0,  # t (QA de somas)
    "DENSITY_MAX": 400.0,  # t/ha (QA de densidade implícita)
    # --- dados de REFERÊNCIA (cell06 — seção REFERÊNCIA desta célula) ---
    "CARBON_FRACTION": 0.47,   # AGB (t) -> C (t), IPCC default (AGB→AGC)
    "REF_MIN_VALID": 0.05,     # mín. fração de área válida p/ comparar ref
    "REF_FINE_SCALE": False,   # se False, reamostra refs finas p/ REF_SCALE_COARSE
    "REF_SCALE_COARSE": 110.0, # escala (m) do coarsening p/ QCN/Baccini/TCN
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
# Legenda oficial MapBiomas Coleção 11 (código → nome) por nível de agregação.
# Espelho do módulo GEE `COLLECTION_00/pantanal/module_lulc_legends.js` (e do
# antigo lulc_mbc11.py, incorporado nesta célula). Fonte única de verdade =
# os dicionários oficiais do projeto:
#   LULC_NIVEIS    → nível da classe (1..4)
#   LULC_NIVEL_0   → Natural | Antrópico | Não observado
#   LULC_NIVEL_1   → Floresta | Veg. Herbácea e Arbustiva | Área não vegetada |
#                    Agropecuária | Corpos D´água | Não observado
#   LULC_NIVEL_1_1 → formação de detalhe
#   LULC_NIVEL_2   → classe de detalhe
#   LULC_NIVEL_3   → agregação de lavoura
#   LULC_NIVEL_4   → lavoura específica (soja, cana, arroz, algodão…)
# ---------------------------------------------------------------------------
C11_ASSET = (
    "projects/mapbiomas-public/assets/brazil/lulc/collection11/"
    "mapbiomas_brazil_collection11_coverage_v3"
)
DEF_SEC_ASSET = (
    "projects/mapbiomas-public/assets/brazil/lulc/collection11/"
    "mapbiomas_brazil_collection11_deforestation_secondary_vegetation_v5"
)


def defsec_band(year: int) -> str:
    return f"classification_{year}"


# ---- Legenda def_sec (0..7) --------------------------------------------------
DEF_SEC_VEG_LEGEND = {
    0: "Não Observado",
    1: "Antrópico",
    2: "Vegetação Primária",
    3: "Vegetação Secundária",
    4: "Desmatamento Primário",
    5: "Recrescimento",
    6: "Desmatamento Secundário",
    7: "Outras Transições",
}
DEFSEC_MODS = [0, 1, 2, 3, 4, 5, 6, 7]
DEFSEC_TIPOS = {
    0: "nao_observado",
    1: "antropico",
    2: "primaria",
    3: "secundaria",
    4: "desmatamento",
    5: "recrescimento",
    6: "desmatamento",
    7: "transicao",
}


def defsec_label(mod) -> str:
    return DEF_SEC_VEG_LEGEND.get(int(mod), f"Mod {int(mod)}")


def defsec_tipo(mod) -> str:
    return DEFSEC_TIPOS.get(int(mod), "outro")


# ---- Legendas oficiais por nível (código → nome) -----------------------------
LULC_NIVEIS = {
    0: "Não observado", 1: "Nível 1", 3: "Nível 2", 4: "Nível 2",
    5: "Nível 2", 6: "Nível 2", 7: "Nível 2", 49: "Nível 2", 10: "Nível 1",
    11: "Nível 2", 12: "Nível 2", 77: "Nível 2", 32: "Nível 2",
    29: "Nível 2", 50: "Nível 2", 13: "Nível 2", 84: "Nível 2",
    14: "Nível 1", 15: "Nível 2", 18: "Nível 2", 19: "Nível 3",
    39: "Nível 4", 20: "Nível 4", 40: "Nível 4", 62: "Nível 4",
    41: "Nível 4", 36: "Nível 3", 46: "Nível 4", 47: "Nível 4",
    35: "Nível 4", 48: "Nível 4", 9: "Nível 2", 21: "Nível 2",
    22: "Nível 1", 23: "Nível 2", 24: "Nível 2", 30: "Nível 2",
    75: "Nível 2", 91: "Nível 2", 25: "Nível 2", 26: "Nível 1",
    33: "Nível 2", 31: "Nível 3", 27: "Não observado",
}

LULC_NIVEL_0 = {
    0: "Não observado", 1: "Natural", 3: "Natural", 4: "Natural",
    5: "Natural", 6: "Natural", 7: "Natural", 49: "Natural", 10: "Natural",
    11: "Natural", 12: "Natural", 77: "Natural", 32: "Natural",
    29: "Antrópico", 50: "Natural", 13: "Natural", 84: "Natural",
    14: "Antrópico", 15: "Antrópico", 18: "Antrópico", 19: "Antrópico",
    39: "Antrópico", 20: "Antrópico", 40: "Antrópico", 62: "Antrópico",
    41: "Antrópico", 36: "Antrópico", 46: "Antrópico", 47: "Antrópico",
    35: "Antrópico", 48: "Antrópico", 9: "Antrópico", 21: "Antrópico",
    22: "Antrópico", 23: "Antrópico", 24: "Antrópico", 30: "Antrópico",
    75: "Antrópico", 91: "Antrópico", 25: "Antrópico", 26: "Antrópico",
    33: "Antrópico", 31: "Antrópico", 27: "Não observado",
}

LULC_NIVEL_1 = {
    0: "Não observado", 1: "Floresta", 3: "Floresta", 4: "Floresta",
    5: "Floresta", 6: "Floresta", 7: "Floresta", 49: "Floresta",
    10: "Vegetação Herbácea e Arbustiva", 11: "Vegetação Herbácea e Arbustiva",
    12: "Vegetação Herbácea e Arbustiva", 77: "Vegetação Herbácea e Arbustiva",
    32: "Vegetação Herbácea e Arbustiva", 29: "Área não vegetada",
    50: "Vegetação Herbácea e Arbustiva",
    13: "Vegetação Herbácea e Arbustiva", 84: "Vegetação Herbácea e Arbustiva",
    14: "Agropecuária", 15: "Agropecuária", 18: "Agropecuária",
    19: "Agropecuária", 39: "Agropecuária", 20: "Agropecuária",
    40: "Agropecuária", 62: "Agropecuária", 41: "Agropecuária",
    36: "Agropecuária", 46: "Agropecuária", 47: "Agropecuária",
    35: "Agropecuária", 48: "Agropecuária", 9: "Agropecuária",
    21: "Agropecuária", 22: "Área não vegetada", 23: "Área não vegetada",
    24: "Área não vegetada", 30: "Área não vegetada",
    75: "Área não vegetada", 91: "Área não vegetada",
    25: "Área não vegetada", 26: "Corpos D´água", 33: "Corpos D´água",
    31: "Corpos D´água", 27: "Não observado",
}

LULC_NIVEL_1_1 = {
    0: "Não observado", 1: "Formação Florestal", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Formação Florestal",
    6: "Formação Florestal", 7: "Formação Florestal", 49: "Formação Savânica",
    10: "Formação Campestre", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Campestre", 32: "Formação Campestre",
    29: "Outros", 50: "Formação Campestre", 13: "Formação Campestre",
    84: "Formação Campestre", 14: "Agropecuária", 15: "Pastagem",
    18: "Agricultura", 19: "Agricultura", 39: "Agricultura",
    20: "Agricultura", 40: "Agricultura", 62: "Agricultura",
    41: "Agricultura", 36: "Agricultura", 46: "Agricultura",
    47: "Agricultura", 35: "Agricultura", 48: "Agricultura",
    9: "Silvicultura", 21: "Mosaico de Usos", 22: "Outros", 23: "Outros",
    24: "Outros", 30: "Outros", 75: "Outros", 91: "Outros", 25: "Outros",
    26: "Outros", 33: "Outros", 31: "Outros", 27: "Não observado",
}

LULC_NIVEL_2 = {
    0: "Não observado", 1: "Floresta", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Mangue", 6: "Floresta Alagável",
    7: "Savana Alagada", 49: "Restinga Arbórea",
    10: "Vegetação Herbácea e Arbustiva", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Herbáceo Arbustiva",
    32: "Apicum", 29: "Afloramento Rochoso", 50: "Restinga herbácea",
    13: "Outras Formações não Florestais", 84: "Marisma",
    14: "Agropecuária", 15: "Pastagem", 18: "Agricultura",
    19: "Agricultura", 39: "Agricultura", 20: "Agricultura",
    40: "Agricultura", 62: "Agricultura", 41: "Agricultura",
    36: "Agricultura", 46: "Agricultura", 47: "Agricultura",
    35: "Agricultura", 48: "Agricultura", 9: "Silvicultura",
    21: "Mosaico de Usos", 22: "Área não vegetada", 23: "Praia, Duna e Areal",
    24: "Área Urbanizada", 30: "Mineração", 75: "Usina Fotovoltaica",
    91: "Energia Eólica", 25: "Outras Áreas não Vegetadas",
    26: "Corpos D´água", 33: "Rio, Lago e Oceano", 31: "Aquicultura",
    27: "Não observado",
}

LULC_NIVEL_3 = {
    0: "Não observado", 1: "Floresta", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Mangue", 6: "Floresta Alagável",
    7: "Savana Alagada", 49: "Restinga Arbórea",
    10: "Formação Natural não Florestal", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Herbáceo Arbustiva",
    32: "Apicum", 29: "Afloramento Rochoso", 50: "Restinga herbácea",
    13: "Outras Formações não Florestais", 84: "Marisma",
    14: "Agropecuária", 15: "Pastagem", 18: "Agricultura",
    19: "Lavoura Temporária", 39: "Lavoura Temporária", 20: "Lavoura Temporária",
    40: "Lavoura Temporária", 62: "Lavoura Temporária",
    41: "Lavoura Temporária", 36: "Lavoura Perene", 46: "Lavoura Perene",
    47: "Lavoura Perene", 35: "Lavoura Perene", 48: "Lavoura Perene",
    9: "Silvicultura", 21: "Mosaico de Usos", 22: "Área não vegetada",
    23: "Praia, Duna e Areal", 24: "Área Urbanizada", 30: "Mineração",
    75: "Usina Fotovoltaica", 91: "Energia Eólica",
    25: "Outras Áreas não Vegetadas", 26: "Corpos D´água",
    33: "Rio, Lago e Oceano", 31: "Aquicultura", 27: "Não observado",
}

LULC_NIVEL_4 = {
    0: "Não observado", 1: "Floresta", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Mangue", 6: "Floresta Alagável",
    7: "Savana Alagada", 49: "Restinga Arbórea",
    10: "Formação Natural não Florestal", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Herbáceo Arbustiva",
    32: "Apicum", 29: "Afloramento Rochoso", 50: "Restinga herbácea",
    13: "Outras Formações não Florestais", 84: "Marisma",
    14: "Agropecuária", 15: "Pastagem", 18: "Agricultura",
    19: "Lavoura Temporária", 39: "Soja", 20: "Cana", 40: "Arroz",
    62: "Algodão", 41: "Outras Lavouras Temporárias", 36: "Lavoura Perene",
    46: "Café", 47: "Citrus", 35: "Dendê", 48: "Outras Lavouras Perenes",
    9: "Silvicultura", 21: "Mosaico de Usos", 22: "Área não Vegetada",
    23: "Praia, Duna e Areal", 24: "Área Urbanizada", 30: "Mineração",
    75: "Usina Fotovoltaica", 91: "Energia Eólica",
    25: "Outras Áreas não Vegetadas", 26: "Corpos D´água",
    33: "Rio, Lago e Oceano", 31: "Aquicultura", 27: "Não observado",
}

# Códigos de lavoura com nome específico no nível 4 (n0 usará nível 4).
LAVOURA_N4_CODES = [19, 20, 35, 36, 39, 40, 41, 46, 47, 48, 62]


def _clamp(d: dict, code) -> str:
    try:
        return d[int(code)]
    except (KeyError, TypeError, ValueError):
        return f"Classe {int(code)}"


def n0_label(code) -> str:
    c = int(code)
    if c in LAVOURA_N4_CODES and c in LULC_NIVEL_4:
        return LULC_NIVEL_4[c]
    return _clamp(LULC_NIVEL_2, c)


def n1_of(code) -> str:
    return _clamp(LULC_NIVEL_1, code)


def n2_of(code) -> str:
    return _clamp(LULC_NIVEL_2, code)


def natureza_of(code) -> str:
    return _clamp(LULC_NIVEL_0, code)


def marcador_from_n1(n1: str) -> str:
    if n1 == "Floresta":
        return "florestal"
    if n1 == "Vegetação Herbácea e Arbustiva":
        return "campestre"
    return "outros"


def marcador_of(code) -> str:
    return marcador_from_n1(n1_of(code))


def info(code):
    n1 = n1_of(code)
    return {
        "n0": n0_label(code),
        "n1": n1,
        "n2": n2_of(code),
        "natureza": natureza_of(code),
        "marcador": marcador_from_n1(n1),
    }

# Aliases compat (deprecados — não usar em código novo).
DECIMAL = {c: n0_label(c)
           for c in sorted(set(LULC_NIVEL_2) | set(LAVOURA_N4_CODES))}
FOREST_CLASSES = [3, 4, 6, 7, 49]
GRASSLAND_CLASSES = [11, 12, 50]
N1_LABELS = {
    101: "Floresta", 102: "Campestre", 0: "Outros",
}
N2_LABELS = {
    "florestal": "florestal", "campestre": "campestre", "outros": "outros",
}


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
    "forest": [f"stats_forest_{v}_" for v in CONF["FOREST_VERSIONS"]],
    "grassland": [f"stats_grassland_*_{p}_" for p in CONF["GRASSLAND_PRODUCTS"]],
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


def qa_somas(df: pd.DataFrame, value_col: str, key_cols: list[str],
             area_col: str = "area_ha") -> list[str]:
    """QA de fechamento das agregações n0 (n1 = total, sem valores nulos).

    Recomputa n1/marcador/total em memória a partir das linhas n0 do CSV do
    GEE e valida densidade implícita (unidades). Compatível com a cell02.
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
    """QA da estratificação def_sec (colunas area_mod{0..7}_ha dos CSVs).

    Para cada classe: Σ área def_sec ≈ área_ha e coerência natureza/marcador
    (Antrópico ⇒ marcador `outros`; classes Naturais têm mods de vegetação).
    """
    problems: list[str] = []
    if not len(df):
        return problems
    mod_cols = sorted(c for c in df.columns if c.startswith("area_mod"))
    mods = sorted({int(c.split("_")[1].replace("mod", ""))
                   for c in df.columns if c.startswith("area_mod")})
    total_val_cols = [c for c in df.columns
                      if c.endswith("_t") and "_mod" not in c]
    if not mod_cols:
        return problems
    for key, grp in df.groupby(list(key_cols) + ["classe"]):
        a = grp["area_ha"].sum()
        a_mod = sum(grp[f"area_mod{m}_ha"].sum() for m in mods)
        if a > 0 and abs(a_mod - a) / a > 0.02:
            problems.append(f"{key}: soma area def_sec ({a_mod:.1f} ha) != area "
                            f"da classe ({a:.1f} ha)")
        if "natureza" in grp.columns and len(grp):
            nat = grp["natureza"].iloc[0]
            mark = grp["marcador"].iloc[0]
            if nat == "Antrópico" and mark != "outros":
                problems.append(f"{key}: natureza {nat} com marcador {mark}")
        for vc in total_val_cols:
            head = vc[:-2]  # 'estoque_t' → 'estoque'
            tot = grp[vc].sum()
            tot_mod = sum(
                grp[f"{head}_mod{m}_t"].sum()
                for m in mods if f"{head}_mod{m}_t" in grp.columns)
            if abs(tot_mod - tot) > CONF["MISSING_TOL"]:
                problems.append(f"{key}: soma {vc} def_sec ({tot_mod:.1f}) != "
                                f"total ({tot:.1f})")
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


# Coluna de valor por produto campestre (schema real do GEE grassland).
GRASS_VALUE_COL = {"biomass": "biomassa_t", "carbon": "estoque_t",
                   "anpp": "anpp_t"}
GRASS_PRODUCT_LABEL = {"biomass": "biomassa (t MS)", "anpp": "ANPP (t MS/ano)",
                       "carbon": "carbono (t C)"}


def grass_value_col(produto) -> str:
    """Coluna de valor do produto campestre no consolidado grassland."""
    return GRASS_VALUE_COL.get(str(produto), "biomassa_t")


def build_compare_grassland(df: pd.DataFrame) -> pd.DataFrame:
    """Tabela produto × classe (+ TOTAL) da versão de referência (v02),
    derivada das linhas n0 do consolidado grassland. Espelha o antigo
    `compare_grassland_produtos_v02.csv` do GEE.

    Coluna de valor por produto: biomass→biomassa_t, carbon→estoque_t,
    anpp→anpp_t (agregado sobre os meses).
    """
    cols = ["produto", "versao", "ano", "territorio", "unidade", "classe",
            "n0", "n1", "marcador", "area_ha", "valor_t"]
    if df is None or not len(df):
        return pd.DataFrame(columns=cols)
    ref = str(CONF["GRASSLAND_REF_VERSION"])
    d = df[df["versao"].astype(str) == str(ref)] if "versao" in df.columns else df
    if not len(d):
        return pd.DataFrame(columns=cols)
    out = []
    for p, grp in d.groupby("produto"):
        vc = grass_value_col(p)
        sub = grp.drop_duplicates(subset=["classe"]).copy() if vc != "anpp_t" \
            else grp.copy()
        if vc == "anpp_t" and "mes" in sub.columns:
            agg = (sub.groupby(["classe", "n0", "n1", "marcador"],
                               as_index=False, dropna=False)
                   .agg(area_ha=("area_ha", "first"),
                        anpp_t=("anpp_t", "sum"),
                        territorio=("territorio", "first"),
                        unidade=("unidade", "first")))
            sub = agg
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


# ===========================================================================
# REFERÊNCIA — dados de biomassa/carbono (catálogo CCAL + cruzes T1/T2)
# ===========================================================================
# Fonte das referências: repositório CCAL (IPAM) — Biomass_ref_maps (17 assets) +
# QCN/TCN (4ª/3ª Comunicação Nacional do Brasil), espelho das fichas em
# COLLECTION_00/docs. Unidade canônica de comparação de ESTOQUE: t C/ha
# (1 Mg = 1 t); conversão AGB → C usa CARBON_FRACTION (CONF). Referências de
# BIOMASSA (t MS/ha → AGB t/ha) comparadas sem fator (lenhoso).
#
# Pontos de atenção (documentados, não escondidos):
#   1. O produto florestal trata o `agbd` do GEDI (biomassa, Mg/ha) como
#      t C/ha ⇒ em média ~1 e ~2x os mapas de referência (AGB vs AGC). O
#      cruzamento revela esse viés via `fator_impl` (dens_prod / dens_ref).
#   2. Xu & Saatchi (2021) = carbono de biomassa VIVA (AGB+BGB), 2000–2019
#      (10 km). Ordem b1..b20 → anos 2000..2019 é PREMISSA (metadado ausente).
#   3. Avitabile Mode_K Pantanal (banda `total_1985`) tem semântica/unidade a
#      confirmar — entra no T1 (contexto), fora do T2 (candidato).
#   4. Referências AGB cobrem vegetação LENHOSA: em classes campestres a área
#      válida (~0%) invalida o cruzamento — QA por `valid_pct`.
# ---------------------------------------------------------------------------
CARBON_FRACTION = CONF["CARBON_FRACTION"]  # AGB (t) -> C (t)
REF_MIN_VALID = CONF["REF_MIN_VALID"]      # fração mínima de área válida
PANTANAL_FC = ("projects/ee-ipam/assets/ORIGINAIS/IBGE/"
               "limite_biomas_IBGE_2026")
REF_ROOT = "projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps"
QCN_ROOT = "projects/ee-ipam/assets/CCAL/public/qcn"

# Ano assumido p/ a coluna "melhor época" de referências estáticas (T1).
XU_START_YEAR = 2000
XU_END_YEAR = 2019


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


REF_CATALOG: list["Ref"] = [
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


# ---- Computação no Earth Engine (por classe C11, bioma Pantanal) -------------
def _load_ref_image(r: "Ref", key) -> "ee.Image":
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


def compute_for_biome(r: "Ref", key, lulc_year: int = 2023,
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
    ref_id, band, year, classe, area_ha, dens_native, total_native, ref_term,
    unit, factor_to_c, epoch, t2_candidate."""
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


# ---- Termos comuns: valor da referência na unidade do produto ----------------
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


# ---- Tabela 1 — cruzamento ano 2023 (todas as versões × referências) ---------
def product_lines(forest: "pd.DataFrame", grassland: "pd.DataFrame",
                  year: int = 2023) -> "pd.DataFrame":
    """Linhas produto×versão×classe com densidade e incerteza (2023).

    forest    → produto='forest'   dens = estoque_t/area_ha (t C/ha), term 'agc'
    grassland → 'grassland_carbon' dens = estoque_t/area_ha (t C/ha)
                'grassland_biomass' dens = biomassa_t/area_ha (t MS/ha)
    (ANPP fica fora — fluxo, sem referência de estoque.)
    """
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
    """Mantém 1 linha por ref×classe: banda/epoca representativa."""
    out = []
    for (rid, cls), g in refs.groupby(["ref_id", "classe"]):
        if "year" in g.columns and g["year"].notna().any():
            g = g[g["year"] == g["year"].max()]
        else:
            g = g.head(1)
        out.append(g)
    return pd.concat(out, ignore_index=True) if out else refs


# ---- Tabela 2 — melhor ano de referência (distância mínima de densidade) -----
def best_reference_year(products: "pd.DataFrame", refs: "pd.DataFrame",
                        min_valid: float = REF_MIN_VALID) -> "pd.DataFrame":
    """T2 · por produto×versão×classe: ref+época que minimiza |dens|
    entre as referências elegíveis (t2_candidate) com val_pct >= min_valid.

    Retorna também fator_impl (dens_prod/dens_ref) como diagnóstico do viés de
    unidade do produto florestal (agbd tratado como C) e top-3 candidatos.
    """
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


# ---- QA das referências ------------------------------------------------------
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


print("=" * 68)
print("statistics_gcn · cell00 · util/config carregadas "
      "(CONF + funções + referências no namespace)")
print("     DRIVE_ROOT:", CONF["DRIVE_ROOT"], "· CSV_DIR:", CONF["CSV_DIR"],
      "· OUT_DIR:", CONF["OUT_DIR"])
print("     ano:", CONF["YEAR"], "· forest:", "/".join(CONF["FOREST_VERSIONS"]),
      "· grassland ref:", CONF["GRASSLAND_REF_VERSION"])
print("     referências no catálogo:", len(REF_CATALOG))
print("     próximas: 2_3_1 (auth/drive) → 2_3_2 (consolidar/QA) → "
      "2_3_3 (figuras) → 2_3_4 (relatório) → 2_3_5 (mapas, opcional) → "
      "2_3_6 (referência)")
print("=" * 68)