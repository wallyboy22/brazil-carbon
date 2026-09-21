"""
MAPBIOMAS-CARBONO · Pantanal Forest v08 — 2_3_0_GCN_CELL00_UTIL.py
==================================================================
Célula 00 do Google Colab (gcn = google collab notebook). FUNÇÕES E
CONFIGURAÇÃO COMPARTILHADAS — rode ANTES das células 2_3_1..2_3_5.

Não faz import de nada próprio: cole o conteúdo desta célula na PRIMEIRA
célula do notebook (ou use %run) para que CONF e as funções abaixo fiquem
disponíveis no namespace do runtime para as células seguintes.

Papel do 2_3_gcn (gate offline da v08):
  - lê as matrizes de covariáveis exportadas para o DRIVE pelo 2_2_toDrive_matrix.js
  - gera a BIBLIOTECA DE FIGURAS (salvas NA MESMA PASTA do output no Drive)
  - faz o thinning espacial (grade 60-90 m, mantém o footprint de menor agbd_se)
  - decide o champion (parametrização do RF + ensemble) → champion.json
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
# CONFIG (ajustável a cada execução — ajuste DRIVE_ROOT se necessário)
# ---------------------------------------------------------------------------
CONF = {
    # Raiz do "balde" no Drive: pasta única do 2_2_<fonte>_toDrive_matrix.js
    # (folder=). O GEE não cria subpastas; os CSVs caem direto aqui (flat).
    # A subetapa 2_3_0b (reorganize_root) move para subpastas de contexto
    # <VERSION>_<SOURCE> (ex.: v08_gedi / v08_ifn).
    "DRIVE_ROOT": "/content/drive/MyDrive/mapbiomas_carbono",
    # Versão do produto (prefixo do contexto): <VERSION>_<SOURCE>.
    "VERSION": "v08",
    # Fonte: 'gedi' | 'ifn' (fixa UMA) ou None = AUTO (roda TODAS as disponíveis,
    # em sequência, nas células 02..06).
    "SOURCE": None,
    "MATRIX_DIR": "",           # (legado) CSVs da matriz na própria raiz do balde
    "FIG_DIR": "figures",       # (legado) base; fig_dir() prefixa com a fonte
    # --- dados ---
    "TARGET": "agbd",
    "WEIGHT_COL": "w",
    "LON": "lon",
    "LAT": "lat",
    "AGBD_SE": "agbd_se",
    "MIN_FEAT_NULL_RATE": 0.05,   # descarta banda com >5% de ausente
    # --- escala do gate offline (a matriz GEDI tem ~1,6M linhas) ---
    "SAMPLE_N": 150_000,          # máx. de linhas usadas no gate (None = todas)
    # --- CV espacial ---
    "BLOCK_M": 3000,              # blocos espaciais ~3 km (testes 1-5 km)
    # --- thinning ---
    "THIN_M": 75,                 # grade do thinning (60-90 m recomendado)
    # --- modelagem ---
    "N_ESTIMATORS": 300,          # champion (cell05)
    "N_ESTIMATORS_DIAG": 150,     # análises do gate (cell02/03) — mais leve
    "BAG_FRACTION": 0.632,
    "SEED_BASE": 2021,
    "MIN_LEAF_CANDIDATES": [5, 10, 20, 30],
    "N_MEMBERS": 5,
    "BAND_FRACTION": 0.8,
    "TRAIN_FRACTION": 0.8,
    "CV_FOLDS": 5,
    "RANDOM_STATE": 2021,
    "SVR_N": 20_000,              # SVR é O(n²): roda só numa subamostra (cell03)
}
_MANIFEST: list[str] = []  # registro de artefatos gerados nesta rodada


# ---------------------------------------------------------------------------
# Contexto (<VERSION>_<SOURCE>) e descoberta de arquivos
# ---------------------------------------------------------------------------
def _matrix_files_in(d: Path) -> list[Path]:
    """CSVs de matriz (agb_matrix_*_v*.csv) numa pasta."""
    return sorted(d.glob("agb_matrix_*_v*.csv"))


def _scan_matrix_files() -> list[Path]:
    """CSVs de matriz na raiz flat E nas subpastas (para detecção de fontes)."""
    root = Path(CONF["DRIVE_ROOT"])
    files = set(_matrix_files_in(root))
    for d in root.iterdir():
        if d.is_dir():
            files.update(_matrix_files_in(d))
    return sorted(files)


def _file_source(f: Path) -> str:
    """Fonte a partir do nome `agb_matrix_<SRC>_<VER>_...`."""
    return f.name.split("_")[2]


def detect_sources() -> list[str]:
    """Fontes presentes (dos nomes dos CSVs de matriz)."""
    return sorted({_file_source(f) for f in _scan_matrix_files()})


def resolve_source():
    """Fonte corrente: `CONF['SOURCE']` (None = não fixada)."""
    return CONF.get("SOURCE") or None


def sources_to_run() -> list:
    """Fontes a processar: a fixada em `CONF['SOURCE']` ou TODAS as disponíveis.

    A escolha do usuário é capturada UMA vez (`CONF['_USER_SOURCE']`) — o loop
    das células grava `CONF['SOURCE']` (fonte corrente) e isso não deve mudar a
    seleção nas células seguintes.

    Com `CONF['SOURCE']=None` (auto), as células 02..06 rodam cada fonte
    disponível (gedi/ifn), individualmente, em sequência.
    """
    if "_USER_SOURCE" not in CONF:
        CONF["_USER_SOURCE"] = CONF.get("SOURCE")
    choice = CONF["_USER_SOURCE"]
    if choice:
        return [choice]
    srcs = detect_sources()
    if not srcs:
        print("[AVISO] nenhuma fonte detectada — defina CONF['SOURCE'] ou " +
              "exporte os CSVs (2_2_<fonte>_toDrive_matrix.js).")
        return [None]
    if len(srcs) > 1:
        print(f"[AUTO] fontes disponíveis {srcs} — rodando em sequência.")
    return srcs


def files_for_source(source: str) -> list[Path]:
    """CSVs de uma fonte: contexto ativo (`<VERSION>_<SOURCE>`) + raiz flat."""
    dirs = []
    ctx = context_dir()
    if ctx is not None:
        dirs.append(ctx)
    dirs.append(Path(CONF["DRIVE_ROOT"]))
    out = set()
    for d in dirs:
        for f in _matrix_files_in(d):
            if _file_source(f) == source:
                out.add(f)
    return sorted(out)


def context_name():
    """Nome do contexto ativo: `<VERSION>_<SOURCE>` (ou None)."""
    src = resolve_source()
    return f"{CONF.get('VERSION', 'v08')}_{src}" if src else None


def context_dir():
    """Pasta do contexto ativo (`DRIVE_ROOT/<CONTEXT>`); None se não resolvível."""
    ctx = context_name()
    return Path(CONF["DRIVE_ROOT"]) / ctx if ctx else None


def fig_dir() -> Path:
    """Figuras: `<CONTEXT>/figures` (contexto) ou `figures_<SOURCE>` (flat/legado)."""
    d = context_dir()
    if d is not None:
        d = d / "figures"
    else:
        src = CONF.get("SOURCE")
        d = Path(CONF["DRIVE_ROOT"]) / (
            f"{CONF['FIG_DIR']}_{src}" if src else CONF["FIG_DIR"])
    d.mkdir(parents=True, exist_ok=True)
    return d


def matrix_dir() -> Path:
    """Matriz: `<CONTEXT>` (contexto) ou a raiz flat (legado)."""
    d = context_dir()
    if d is None:
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
def load_matrix(source=None) -> pd.DataFrame:
    """Concatena os CSVs `agb_matrix_<SOURCE>_v*.csv` da fonte alvo.

    `source` (ou `CONF['SOURCE']`) seleciona a fonte; lê o contexto ativo
    (`<VERSION>_<SOURCE>`) + a raiz flat — nunca quebra por fontes mistas.
    """
    chosen = source or resolve_source()
    if chosen is None:
        raise FileNotFoundError(
            f"Nenhum CSV de matriz em {CONF['DRIVE_ROOT']} (raiz ou subpastas). "
            "Rode 2_2_<fonte>_toDrive_matrix.js no GEE e exporte o CSV ao Drive."
        )
    CONF["SOURCE"] = chosen
    files = files_for_source(chosen)
    if not files:
        raise FileNotFoundError(
            f"Nenhum CSV da fonte '{chosen}' em {context_dir() or CONF['DRIVE_ROOT']} " +
            f"/ {CONF['DRIVE_ROOT']}."
        )
    print(f"[FONTE] {chosen} · {len(files)} CSV(s) · contexto {context_name()}")
    frames = []
    for f in files:
        df = pd.read_csv(f)
        df["_file"] = f.name
        frames.append(df)
    df = pd.concat(frames, ignore_index=True).drop(columns=["_file"])
    print(f"[DADOS] {len(df)} linhas · {len(files)} CSVs")
    return df


def subsample(df: pd.DataFrame, n=None, seed=None) -> pd.DataFrame:
    """Subamostra determinística (`SAMPLE_N`) — mantém o gate leve em matrizes grandes.

    O gate é validação/decisão (o treino de produção usa a matriz completa no GEE);
    com `SAMPLE_N=None` usa todas as linhas.
    """
    n = n if n is not None else CONF.get("SAMPLE_N")
    if not n or len(df) <= n:
        return df
    seed = seed if seed is not None else CONF["RANDOM_STATE"]
    rng = np.random.default_rng(seed)
    idx = np.sort(rng.choice(len(df), size=n, replace=False))
    out = df.iloc[idx].reset_index(drop=True)
    print(f"[AMOSTRA] gate: {len(df)} → {len(out)} linhas (SAMPLE_N={n})")
    return out


def clean_features(df: pd.DataFrame) -> pd.DataFrame:
    """Remove colunas de metadados, bandas quase vazias e linhas com alvo/geo ausentes.

    Ao final aplica `subsample()` (SAMPLE_N) para escalar o gate.
    """
    for col in ("system:index", "geometry", ".geo", "decimal", "_file"):
        if col in df.columns:
            df = df.drop(columns=col)
    feat_cols = [x for x in df.columns if x not in
                 (CONF["TARGET"], CONF["WEIGHT_COL"], CONF["LON"], CONF["LAT"],
                  CONF["AGBD_SE"], "cell_id", "year")]
    null_rate = df[feat_cols].isna().mean()
    drop_feats = list(null_rate[null_rate > CONF["MIN_FEAT_NULL_RATE"]].index)
    df = df.drop(columns=drop_feats, errors="ignore")
    keep = df.dropna(subset=[CONF["TARGET"], CONF["LON"], CONF["LAT"]])
    keep = subsample(keep)
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


# ---------------------------------------------------------------------------
# Thinning espacial (grade; mantém o footprint de menor agbd_se por célula)
# ---------------------------------------------------------------------------
def grid_thin(df: pd.DataFrame, cell_m: float = None) -> pd.DataFrame:
    """Mantém, por célula de grade ~cell_m, 1 ponto.

    Com `agbd_se` (GEDI): o de MENOR agbd_se. Sem (IFN): a 1ª ocorrência.
    Objetivo (resposta B6): quebrar autocorrelação espacial e excesso de
    pontos redundantes antes do treino/validação."""
    cell_m = cell_m or CONF["THIN_M"]
    lat0 = df[CONF["LAT"]].median()
    gx = ((df[CONF["LON"]] * 111320.0 * np.cos(np.deg2rad(lat0))) // cell_m).astype(int)
    gy = ((df[CONF["LAT"]] * 110574.0) // cell_m).astype(int)
    g = gx * 1_000_000 + gy
    df = df.copy()
    df["_g"] = g
    se = CONF["AGBD_SE"]
    if se in df.columns:
        keep = df.loc[df.groupby("_g")[se].idxmin()].drop(columns="_g")
    else:
        print(f"[THIN] sem '{se}' (fonte {CONF.get('SOURCE')}) → 1ª ocorrência por célula")
        keep = df.drop_duplicates("_g", keep="first").drop(columns="_g")
    return keep.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Estatística espacial (Moran's I + variograma) — numpy/scipy
# ---------------------------------------------------------------------------
def _pairs_within(coords_m: np.ndarray, band_m: float) -> np.ndarray:
    """Pares de vizinhos (i<j) a menos de `band_m` metros (KDTree). O(n_pares)."""
    from scipy.spatial import cKDTree
    tree = cKDTree(coords_m)
    return np.array(list(tree.query_pairs(r=band_m)), dtype=int)


def moran_i(resids: np.ndarray, coords_m: np.ndarray, band_m: float = 90.0,
            permutations: int = 199) -> tuple:
    """Moran's I global (autocorrelação residual) — O(n_pares), SEM matriz densa.

    W binário (1 p/ vizinhos a < `band_m`). Retorna (I, pseudo-p, n_pares).
    """
    n = len(resids)
    z = resids - resids.mean()
    zs = np.sum(z ** 2)
    if zs == 0 or n < 2:
        return 0.0, 1.0, 0
    pairs = _pairs_within(coords_m, band_m)
    if len(pairs) == 0:
        return 0.0, 1.0, 0
    i0, j0 = pairs[:, 0], pairs[:, 1]
    S0 = 2.0 * len(pairs)                 # soma dos pesos (simétrico)
    I = float((n / S0) * (2.0 * np.sum(z[i0] * z[j0])) / zs)
    rng = np.random.default_rng(CONF["RANDOM_STATE"])
    count = 0
    for _ in range(permutations):
        zp = rng.permutation(z)
        Ip = (n / S0) * (2.0 * np.sum(zp[i0] * zp[j0])) / np.sum(zp ** 2)
        if Ip >= I:
            count += 1
    p = (count + 1) / (permutations + 1)
    return I, p, int(len(pairs))


def variogram(resids: np.ndarray, coords_m: np.ndarray, max_dist_m: float = 1500.0,
              nbins: int = 15, max_pairs: int = 2_000_000):
    """Variograma de nuvem (semivariância média por faixa de distância).

    Limita o nº de pares a `max_pairs` (amostragem determinística) para escalar.
    """
    from scipy.spatial import cKDTree
    tree = cKDTree(coords_m)
    pairs = np.array(list(tree.query_pairs(r=max_dist_m)), dtype=int)
    if len(pairs) == 0:
        return np.array([]), np.array([])
    if max_pairs and len(pairs) > max_pairs:
        rng = np.random.default_rng(CONF["RANDOM_STATE"])
        pairs = pairs[rng.choice(len(pairs), size=max_pairs, replace=False)]
        print(f"[VARIO] pares limitados a {max_pairs} (de {len(pairs)})")
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


# ---------------------------------------------------------------------------
# Reorganização da raiz (subetapa 2_3_0b) — separa por contexto <VERSION>_<SOURCE>
# ---------------------------------------------------------------------------
def _contexts_on_disk() -> list[Path]:
    ver = CONF.get("VERSION", "v08")
    return sorted(d for d in Path(CONF["DRIVE_ROOT"]).glob(f"{ver}_*") if d.is_dir())


def _active_context_dir():
    d = context_dir()
    if d is not None:
        return d
    ctxs = _contexts_on_disk()
    return ctxs[0] if len(ctxs) == 1 else None


def reorganize_root(dry_run: bool = False) -> dict:
    """Move os arquivos da raiz FLAT para subpastas de contexto <VERSION>_<SOURCE>.

    - `agb_matrix_<SRC>_<VER>_*.csv` → `<VER>_<SRC>/`
    - `samples_thinned_<SRC>_<VER>(.csv|.note.txt)` → `<VER>_<SRC>/`
    - `figures_<SRC>/` → `<VER>_<SRC>/figures/`
    - artefatos do gate (`diagnostico.json`, `gate_state.json`, `champion.json`,
      `relatorio_recomendacoes.md`, `f*.png`) → contexto ativo
    - desconhecidos: deixados como estão
    Idempotente (não sobrescreve) e com `dry_run` (só imprime o que faria).
    """
    root = Path(CONF["DRIVE_ROOT"])
    ver = CONF.get("VERSION", "v08")
    stats = {"matrix": 0, "thinned": 0, "figures": 0, "artifacts": 0,
             "skipped": 0, "dedup": 0, "left": 0}

    def move(src: Path, dst_dir: Path, key: str):
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / src.name
        if dst.exists():
            try:
                same = src.read_bytes() == dst.read_bytes()
            except OSError:
                same = False
            if same:   # já está no contexto (duplicado na raiz) → remove a cópia
                print(f"[{'DRY ' if dry_run else 'DEDUP'}] {src.relative_to(root)} " +
                      f"(idêntico a {dst.relative_to(root)})")
                if not dry_run:
                    src.unlink()
                stats["dedup"] += 1
                return
            dst = dst.with_name(f"{dst.stem}_dup{dst.suffix}")
        print(f"[{'DRY ' if dry_run else 'MOVE'}] {src.relative_to(root)} → " +
              f"{dst_dir.relative_to(root)}/")
        if not dry_run:
            src.rename(dst)
        stats[key] += 1

    # 1) matrizes: agb_matrix_<SRC>_<VER>_*.csv
    for f in sorted(root.glob("agb_matrix_*_v*.csv")):
        parts = f.name.split("_")
        if len(parts) < 4:
            stats["left"] += 1
            continue
        move(f, root / f"{parts[3]}_{parts[2]}", "matrix")

    # 2) thinned: samples_thinned_<SRC>_<VER>(.csv|.note.txt)
    for f in sorted(root.glob("samples_thinned_*")):
        if f.is_dir():
            continue
        parts = f.name.split("_")
        if len(parts) < 4:
            stats["left"] += 1
            continue
        src, v = parts[2], parts[3].split(".")[0]
        move(f, root / f"{v}_{src}", "thinned")

    # 3) figuras: figures_<SRC>/ → <VER>_<SRC>/figures/
    for d in sorted(root.glob("figures_*")):
        if not d.is_dir():
            continue
        src = d.name[len("figures_"):]
        ctx_fig = root / f"{ver}_{src}" / "figures"
        for f in sorted(d.iterdir()):
            if f.is_file():
                move(f, ctx_fig, "figures")
        if not dry_run:
            try:
                d.rmdir()  # só remove se ficou vazia
            except OSError:
                pass

    # 4) artefatos do gate na raiz → contexto ativo
    ctx = _active_context_dir()
    art_names = ["diagnostico.json", "gate_state.json", "champion.json",
                 "relatorio_recomendacoes.md"]
    if ctx is None:
        stats["left"] += sum((root / n).exists() for n in art_names)
        stats["left"] += len(list(root.glob("f*.png")))
    else:
        for n in art_names:
            f = root / n
            if f.exists():
                move(f, ctx, "artifacts")
        for f in sorted(root.glob("f*.png")):
            move(f, ctx / "figures", "artifacts")

    print(f"[REORG] matrizes={stats['matrix']} · thinned={stats['thinned']} · " +
          f"figuras={stats['figures']} · artefatos={stats['artifacts']} · " +
          f"duplicados(removidos)={stats['dedup']} · deixados={stats['left']}")
    if ctx is None and stats["artifacts"] == 0:
        print("[REORG] contexto não resolvido — defina CONF['SOURCE'] ('gedi'|'ifn') " +
              "e rode de novo para mover os artefatos do gate.")
    return stats


def diagnose_drive(max_items: int = 40) -> None:
    """Imprime o estado do Drive: raiz, conteúdo, CSVs, fontes e contexto.

    Rode `diagnose_drive()` na célula 00 (após montar o Drive) para ver o que o
    gate está enxergando quando algo "não é encontrado".
    """
    root = Path(CONF["DRIVE_ROOT"])
    print("=" * 68)
    print("[DIAG] DRIVE_ROOT:", root, "· existe:", root.exists())
    if not root.exists():
        print("  → pasta inexistente: confira CONF['DRIVE_ROOT'] e a montagem do Drive.")
        print("=" * 68)
        return
    print("[DIAG] conteúdo da raiz:")
    for p in sorted(root.iterdir())[:max_items]:
        print(f"   [{'DIR ' if p.is_dir() else 'file'}] {p.name}")
    files = _scan_matrix_files()
    print(f"[DIAG] CSVs de matriz encontrados: {len(files)}")
    for f in files[:max_items]:
        print("   ", f.relative_to(root))
    print("[DIAG] fontes detectadas:", detect_sources())
    print("[DIAG] SOURCE (CONF):", CONF.get("SOURCE"),
          "· contexto resolvido:", context_name(), "· dir:", context_dir())
    print("=" * 68)


print("=" * 68)
print("v08 · cell00 · util/config carregadas (CONF + funções no namespace)")
print("     DRIVE_ROOT:", CONF["DRIVE_ROOT"], "· MATRIX_DIR:", CONF["MATRIX_DIR"],
      "· FIG_DIR:", CONF["FIG_DIR"])
print("     próximas: 2_3_1 (auth/drive) → 2_3_2 (diagnóstico) → 2_3_3 (CV) → " +
      "2_3_4 (thinning) → 2_3_5 (champion)")
print("=" * 68)