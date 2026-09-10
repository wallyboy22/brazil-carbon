"""
MAPBIOMAS-CARBONO — Pantanal Forest v07 · 2_3_util.py
=====================================================
Funções compartilhadas pelas células do Google Colab (2_3_gcn_cellNN_*.py).

Papel do 2_3_gcn (gate offline da v07):
  - lê as matrizes de covariáveis exportadas para o DRIVE pelo 2_2_toDrive_matrix.js
  - gera a BIBLIOTECA DE FIGURAS (salvas NA MESMA PASTA do output no Drive)
  - faz o thinning espacial (grade 60-90 m, mantém o footprint de menor agbd_se)
  - decide o champion (parametrização do RF + ensemble) → champion.json

Modo de uso (ver README do 2_3_gcn):
  1. Abra QUALQUER notebook do Google Colab.
  2. Rode 2_3_0_gcn_cell00_autentication_drive.py (autentica EE + monta o Drive).
  3. Coloque este arquivo (e os demais cellNN) na pasta de output do Drive
     (ou faça upload para o runtime) — o cell00 já adiciona a pasta ao sys.path.
  4. Rode as células seguintes apontando para o .py do fluxo (%run ou cole).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

# ---------------------------------------------------------------------------
# CONFIG (ajustável a cada execução — o cell00 preenche via DRIVE_ROOT)
# ---------------------------------------------------------------------------
CONF = {
    # Pasta de OUTPUT no Drive — as figuras são salvas NA MESMA pasta de output
    "DRIVE_ROOT": "/content/drive/MyDrive/mapbiomas_carbono/pantanal/forest/v07",
    "MATRIX_DIR": "matriz",   # subpasta com os CSVs do 2_2_toDrive_matrix
    "FIG_DIR": "figures",     # biblioteca de figuras (espelha o repo 2_3_gcn/figures)
    # --- dados ---
    "TARGET": "agbd",
    "WEIGHT_COL": "w",
    "LON": "lon",
    "LAT": "lat",
    "AGBD_SE": "agbd_se",
    "MIN_FEAT_NULL_RATE": 0.05,   # descarta banda com >5% de ausente
    # --- CV espacial ---
    "BLOCK_M": 3000,              # blocos espaciais ~3 km (testes 1-5 km)
    # --- thinning ---
    "THIN_M": 75,                 # grade do thinning (60-90 m recomendado)
    # --- modelagem ---
    "N_ESTIMATORS": 300,
    "BAG_FRACTION": 0.632,
    "SEED_BASE": 2021,
    "MIN_LEAF_CANDIDATES": [5, 10, 20, 30],
    "LOG_OFFSET": 1,              # 1 → target ln(1+agbd); 0 → ln(agbd)
    "N_MEMBERS": 5,
    "BAND_FRACTION": 0.8,
    "TRAIN_FRACTION": 0.8,
    "CV_FOLDS": 5,
    "RANDOM_STATE": 2021,
}
_MANIFEST: list[str] = []  # registro de artefatos gerados nesta rodada


# ---------------------------------------------------------------------------
# Paths / figures
# ---------------------------------------------------------------------------
def fig_dir() -> Path:
    d = Path(CONF["DRIVE_ROOT"]) / CONF["FIG_DIR"]
    d.mkdir(parents=True, exist_ok=True)
    return d


def matrix_dir() -> Path:
    d = Path(CONF["DRIVE_ROOT"]) / CONF["MATRIX_DIR"]
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_fig(fig, name: str) -> str:
    import datetime as _dt
    path = fig_dir() / name
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    _MANIFEST.append(str(path))
    print(f"[FIG] {path}  ({_dt.datetime.now().strftime('%H:%M:%S')})")
    return str(path)


def write_artifact(path: Path, content) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, str):
        path.write_text(content, encoding="utf-8")
    else:
        path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    _MANIFEST.append(str(path))
    print(f"[OUT] {path}")


def manifest() -> list[str]:
    return list(_MANIFEST)


# ---------------------------------------------------------------------------
# Dados: leitura / limpeza da matriz (CSVs do Drive)
# ---------------------------------------------------------------------------
def load_matrix() -> pd.DataFrame:
    """Concatena todos os agc_matrix_v07_*.csv da pasta MATRIX_DIR."""
    files = sorted(matrix_dir().glob("agc_matrix_v07_*.csv"))
    if not files:
        raise FileNotFoundError(
            f"Nenhum CSV de matriz em {matrix_dir()}. Rode 2_2_toDrive_matrix.js "
            "no GEE e baixe/exporte o CSV para o Drive."
        )
    frames = []
    for f in files:
        df = pd.read_csv(f)
        df["_file"] = f.name
        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    df = df.drop(columns=["_file"])
    print(f"[DADOS] {len(df)} linhas · {files[0].parent} ({len(files)} CSVs)")
    return df


def clean_features(df: pd.DataFrame) -> pd.DataFrame:
    """Remove bandas quase vazias e linhas com alvo/geo ausentes."""
    feat_cols = [x for x in df.columns if x not in
                 (CONF["TARGET"], CONF["WEIGHT_COL"], CONF["LON"], CONF["LAT"],
                  CONF["AGBD_SE"], "geometry", "system:index", "cell_id", "year")]
    null_rate = df[feat_cols].isna().mean()
    drop_feats = list(null_rate[null_rate > CONF["MIN_FEAT_NULL_RATE"]].index)
    df = df.drop(columns=drop_feats, errors="ignore")
    keep = df.dropna(subset=[CONF["TARGET"], CONF["LON"], CONF["LAT"]])
    return keep, drop_feats


def coordinates_meters(df: pd.DataFrame) -> np.ndarray:
    """lon/lat → metros (aproximação local para thinning/distâncias)."""
    lat0 = np.deg2rad(df[CONF["LAT"]].median())
    x = df[CONF["LON"]] * 111320.0 * np.cos(lat0)
    y = df[CONF["LAT"]] * 110574.0
    return np.column_stack([x, y])


def spatial_blocks(df: pd.DataFrame, block_m: float = None) -> np.ndarray:
    """Blocos espaciais ~BLOCK_M (para GroupKFold espacial, sem leakage)."""
    block_m = block_m or CONF["BLOCK_M"]
    lat0 = df[CONF["LAT"]].median()
    gx = ((df[CONF["LON"]] * 111320.0 * np.cos(np.deg2rad(lat0))) // block_m).astype(int)
    gy = ((df[CONF["LAT"]] * 110574.0) // block_m).astype(int)
    return gx * 1_000_000 + gy


def transform_target(y: np.ndarray, log_on: bool, offset: float = None):
    offset = CONF["LOG_OFFSET"] if offset is None else offset
    if log_on:
        return np.log1p(y) if offset == 1 else np.log(y)
    return y


def inverse_target(pred_log: np.ndarray, smear: float, log_on: bool,
                   offset: float = None):
    offset = CONF["LOG_OFFSET"] if offset is None else offset
    if log_on:
        return np.exp(pred_log) * smear - (offset if offset == 1 else 0)
    return pred_log


# ---------------------------------------------------------------------------
# Thinning espacial (grade; mantém o footprint de menor agbd_se por célula)
# ---------------------------------------------------------------------------
def grid_thin(df: pd.DataFrame, cell_m: float = None) -> pd.DataFrame:
    """Mantém, por célula de grade ~cell_m, o ponto de MENOR agbd_se.
    Objetivo (resposta B6): quebrar autocorrelação espacial e excesso de
    pontos redundantes antes do treino/validação."""
    cell_m = cell_m or CONF["THIN_M"]
    lat0 = df[CONF["LAT"]].median()
    gx = ((df[CONF["LON"]] * 111320.0 * np.cos(np.deg2rad(lat0))) // cell_m).astype(int)
    gy = ((df[CONF["LAT"]] * 110574.0) // cell_m).astype(int)
    g = gx * 1_000_000 + gy
    df = df.copy()
    df["_g"] = g
    keep = df.loc[df.groupby("_g")[CONF["AGBD_SE"]].idxmin()].drop(columns="_g")
    return keep.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Estatística espacial (Moran's I + variograma) — numpy/scipy
# ---------------------------------------------------------------------------
def _weights(coords_m: np.ndarray, band_m: float):
    from scipy.spatial import cKDTree
    tree = cKDTree(coords_m)
    pairs = np.array(tree.query_pairs(r=band_m), dtype=int)
    n = len(coords_m)
    wij = np.zeros((n, n))
    for i, j in pairs:
        wij[i, j] = 1.0
        wij[j, i] = 1.0
    return wij, pairs


def moran_i(resids: np.ndarray, coords_m: np.ndarray, band_m: float = 90.0,
            permutations: int = 199) -> tuple:
    """Moran's I global (autocorrelação residual). Retorna (I, pseudo-p, n_pares)."""
    n = len(resids)
    z = resids - resids.mean()
    zs = np.sum(z ** 2)
    if zs == 0:
        return 0.0, 1.0, 0
    W, pairs = _weights(coords_m, band_m)
    S0 = float(W.sum())
    if S0 == 0:
        return 0.0, 1.0, 0
    I = float((n / S0) * (z @ W @ z) / zs)
    # permutação
    rng = np.random.default_rng(CONF["RANDOM_STATE"])
    count = 0
    for _ in range(permutations):
        z_perm = rng.permutation(z)
        Ip = (n / S0) * (z_perm @ W @ z_perm) / np.sum(z_perm ** 2)
        if Ip >= I:
            count += 1
    p = (count + 1) / (permutations + 1)
    return I, p, int(len(pairs) / 2)


def variogram(resids: np.ndarray, coords_m: np.ndarray, max_dist_m: float = 1500.0,
              nbins: int = 15):
    """Variograma de nuvem (semivariância média por faixa de distância)."""
    from scipy.spatial import cKDTree
    tree = cKDTree(coords_m)
    pairs = np.array(tree.query_pairs(r=max_dist_m, output_type="ndarray"))
    if len(pairs) == 0:
        return np.array([]), np.array([])
    d = np.sqrt(((coords_m[pairs[:, 0]] - coords_m[pairs[:, 1]]) ** 2).sum(axis=1))
    g = 0.5 * (resids[pairs[:, 0]] - resids[pairs[:, 1]]) ** 2
    bins = np.linspace(0, max_dist_m, nbins + 1)
    mid = (bins[:-1] + bins[1:]) / 2
    gamma = [g[(d >= b) & (d < b2)].mean() if np.any((d >= b) & (d < b2)) else np.nan
             for b, b2 in zip(bins[:-1], bins[1:])]
    return mid, np.array(gamma)


# ---------------------------------------------------------------------------
# Ramo do treino: pesos por erro do rótulo (recomendação A4)
# ---------------------------------------------------------------------------
def weights_1_se2(agbd_se: np.ndarray) -> np.ndarray:
    return 1.0 / np.maximum(agbd_se, 1.0) ** 2