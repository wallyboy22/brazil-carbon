"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — cells_for_collab_notebook
========================================================================
00_config.py · CONFIGURAÇÃO + paths/artefatos.

Primeira célula do notebook (rode ANTES de todas as outras). Não faz import de
nada próprio: cole o conteúdo como a PRIMEIRA célula (ou use %run) para deixar
`CONF`, os paths e helpers no namespace do runtime.

Pipeline (ver README.md): 00_config → 01_legends → 02_schema → 03_loaders →
04_qa → 05_aggregations → 06_references → 10_auth_drive → 11_consolidate →
12_join_largo → 13_figures → 14_report → 15_references → 16_maps.
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
# CONFIG (ajustável a cada execução — a 10_auth_drive preenche via DRIVE_ROOT)
# ---------------------------------------------------------------------------
CONF = {
    "DRIVE_ROOT": "/content/drive/MyDrive/mapbiomas_carbono/pantanal",
    "CSV_DIR": "estatisticas",  # CSVs exportados pelo GEE (run/*)
    "FIG_DIR": "figures",       # biblioteca de figuras (espelha o repo figures/)
    "OUT_DIR": "relatorio",     # XLSX + .md + consolidados
    "YEAR": 2023,
    # --- escopo esperado dos arquivos ---
    "FOREST_VERSIONS": ["v03", "v04", "v05", "v06", "v07", "v08"],
    "GRASSLAND_PRODUCTS": ["biomass", "anpp", "carbon"],
    "GRASSLAND_REF_VERSION": "v02",
    "MISSING_TOL": 1.0,     # t (QA de somas)
    "DENSITY_MAX": 400.0,   # t/ha (QA de densidade implícita)
    # --- dados de REFERÊNCIA (15_references) ---
    "CARBON_FRACTION": 0.47,  # AGB (t) -> C (t), IPCC default
    "REF_MIN_VALID": 0.05,    # mín. fração de área válida p/ comparar ref
    "REF_TERRITORIO": "Pantanal (bioma)",  # território filtrado nos CSVs
    # --- figuras ---
    "FIGURE_DPI": 120,
    # --- mapas OPCIONAIS (off por padrão — recomputam no Earth Engine) ---
    "FAZER_MAPAS": False,
    "GRID_M": 10000,    # grade de agregação do mapa de médias (10 km)
    "MAP_FOREST_VERSION": "v07",  # versão do forest usada no mapa (16_maps)
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


print("=" * 68)
print("statistics · 00_config · CONF + paths carregados")
print("     DRIVE_ROOT:", CONF["DRIVE_ROOT"], "· CSV_DIR:", CONF["CSV_DIR"],
      "· OUT_DIR:", CONF["OUT_DIR"])
print("=" * 68)
