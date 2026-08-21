# -*- coding: utf-8 -*-
"""
MAPBIOMAS-CARBONO — Análise offline AGC (fora do GEE)
======================================================
Estágio intermediário entre 2_data_matrix (Drive) e 3_modelling (GEE).

O que faz:
  1. Lê o universo de amostras exportado para o Google Drive (CSVs em batches);
  2. EDA leve;
  3. Diagnóstico de REDUNDÂNCIA:
       - variáveis  : correlação + clustering hierárquico + VIF;
       - amostras   : duplicatas de pixel, spatial thinning, balanço por estrato;
       - IsolationForest (anomalias) + por estrato;
  4. Split ESPACIAL (anti-vazamento por autocorrelação);
  5. Modelos espelhando o GEE: RandomForest / GradientBoosting / SVR;
  6. Comparativo de métricas + feature importance;
  7. Subversões candidatas (drop / thin / iso) avaliadas de forma medida;
  8. Gera analysis_summary.md com a recomendação (modelo, params, tag).

USO: abrir no Colab (células separadas por '# %%') e executar em ordem.
Referência: ANALYSIS/README.md e ANALYSIS/EXPERIMENTS.md.
"""

# %% [markdown]
# ## 0. Setup

# %%
import glob
import json
import os
import warnings

import numpy as np
import pandas as pd
from scipy import cluster, stats
from scipy.spatial.distance import squareform
from sklearn.ensemble import (GradientBoostingRegressor, IsolationForest,
                              RandomForestRegressor)
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

warnings.filterwarnings("ignore")

# %% [markdown]
# ## 1. Config

# %%
# Ajuste conforme a execução que gerou o universo no Drive
DRIVE_FOLDER = "/content/drive/MyDrive/GEE_Exports_AGC-v01"   # montar o Drive antes
GRID = "pantanal"
YEAR = 2023
VERSION = "v01"

TARGET = "agbd"
META_PROPS = ["agbd_se", "pft_class", "shot_number", "lon_lowestmode", "lat_lowestmode"]

# Modelos offline (espelham o GEE — ver ANALYSIS/README.md)
SEED = 2021
RF_PARAMS = dict(n_estimators=300, max_samples=0.632, random_state=SEED, n_jobs=-1)
GBM_PARAMS = dict(n_estimators=300, learning_rate=0.1, subsample=0.9,
                  random_state=SEED)
SVM_PARAMS = dict(kernel="rbf", C=100, gamma=0.01, epsilon=0.1)
SVM_MAX_SAMPLES = 5000            # SVR é O(n²) — subsample para viabilizar
IF_CONTAMINATION = 0.02           # fração esperada de anômalos (1–5%)
CORR_THRESHOLD = 0.85             # limiar p/ agrupar bandas redundantes

# %% [markdown]
# ## 2. Carregar e concatenar o universo (Drive)

# %%
pattern = os.path.join(DRIVE_FOLDER, f"AGC_samples_{GRID}_{YEAR}_batch*.csv")
files = sorted(glob.glob(pattern))
if not files:
    raise SystemExit(f"Nenhum batch encontrado em {pattern}. "
                     "Ligue EXPORT_TO_DRIVE=true no 2_data_matrix e rode de novo.")

dfs = [pd.read_csv(f) for f in files]
df = pd.concat(dfs, ignore_index=True).drop_duplicates(subset="shot_number")
print(f"[OK] {len(df)} amostras únicas ({len(files)} batches)")

cov_bands = [c for c in df.columns if c not in [TARGET] + META_PROPS]
print(f"[OK] {len(cov_bands)} covariáveis")

# %% [markdown]
# ## 2a. EDA leve

# %%
print(df[TARGET].describe())
print("\nNaN por coluna:\n", df[cov_bands].isna().sum().sum())
print("\nPor pft_class:\n", df["pft_class"].value_counts())

# %%
df = df.dropna(subset=cov_bands + [TARGET]).reset_index(drop=True)
print(f"[OK] Após dropna: {len(df)} amostras")

# %% [markdown]
# ## 2b. Redundância — VARIÁVEIS (correlação + clusters + VIF)

# %%
X = df[cov_bands].values
Xc = X.copy()
corr = np.corrcoef(Xc, rowvar=False)
corr_abs = np.abs(corr)
np.fill_diagonal(corr_abs, 0)

# Clustering hierárquico sobre 1 - |corr|  → grupos de bandas redundantes
link = cluster.hierarchy.linkage(squareform(1 - corr_abs), method="average")
groups = cluster.hierarchy.fcluster(link, t=1 - CORR_THRESHOLD, criterion="distance")
for g in np.unique(groups):
    members = np.where(groups == g)[0]
    if len(members) > 1:
        bandas = [cov_bands[i] for i in members]
        corr_max = max(corr_abs[i][j] for i in members for j in members if i != j)
        print(f"[GRUPO {g}] {len(members)} bandas (|r|max={corr_max:.2f}): {bandas}")

# VIF (regressão de cada banda contra as demais)
# Nota: bandas dummy (bioma/Köppen) inflam o VIF — usar como sinal, não regra.
def vif(col, X):
    r2 = np.linalg.lstsq(np.c_[X[:, ~np.arange(X.shape[1]) == col], np.ones(len(X))],
                         X[:, col], rcond=None)[1]
    return 1 / (1 - r2) if r2 < 1 else np.inf

vifs = {b: vif(i, X) for i, b in enumerate(cov_bands)}
vif_high = {b: v for b, v in sorted(vifs.items(), key=lambda kv: -kv[1])[:10]}
print("\nTop VIF (suspeitos de multicolinearidade):\n", vif_high)

# %% [markdown]
# ## 2c. Redundância — AMOSTRAS (pixel + thinning + balanço)

# %%
# Duplicatas de pixel ~30 m (aprox.): arredonda lat a ~0.00027° e lon por cos(lat)
lat0, lon0 = df["lat_lowestmode"], df["lon_lowestmode"]
dlat = 0.00027
pixel_key = pd.DataFrame({
    "lat": (lat0 / dlat).round(),
    "lon": (lon0 / (dlat * np.cos(np.radians(lat0)))).round(),
}).astype(int)
dup = pixel_key.duplicated().sum()
print(f"[OK] {dup} tiros em pixels duplicados ({dup / len(df) * 100:.1f}%) — "
      "candidatos a spatial thinning")

# Thinning guloso: 1 amostra por pixel
keep_idx = ~pixel_key.duplicated()
df_thin = df[keep_idx].reset_index(drop=True)
print(f"[OK] thin1px → {len(df_thin)} amostras")

# %%
print("Balanço por pft_class:\n", df["pft_class"].value_counts(normalize=True))

# %% [markdown]
# ## 2d. IsolationForest — anomalias (+ por estrato)

# %%
scaler = StandardScaler()
Xs = scaler.fit_transform(X)

iso = IsolationForest(contamination=IF_CONTAMINATION, random_state=SEED, n_jobs=-1)
iso.fit(Xs)
score = iso.decision_function(Xs)
flag = iso.predict(Xs) == -1
print(f"[OK] {flag.sum()} anômalos ({flag.mean() * 100:.1f}%)")

# Diagnóstico: anômalos concentrados em estrato raro? (sinal x ruído)
anom_by_pft = pd.crosstab(df["pft_class"], flag, normalize="columns")
print("\nAnômalos por pft_class (coluna True = fração anômala):\n", anom_by_pft)

# IF por estrato (evita eliminar bioma/classe raro inteiro)
flag_per = np.zeros(len(df), dtype=bool)
for cls in df["pft_class"].unique():
    m = df["pft_class"] == cls
    iso_c = IsolationForest(contamination=IF_CONTAMINATION, random_state=SEED, n_jobs=-1)
    flag_per[m] = iso_c.fit_predict(Xs[m]) == -1
print(f"[OK] Anômalos por estrato: {flag_per.sum()} ({flag_per.mean() * 100:.1f}%)")

# %% [markdown]
# ## 3. Split ESPACIAL (anti-vazamento)

# %%
# Blocos espaciais: grid 3x3 sobre as coordenadas → treino/teste por bloco.
lon_q = pd.qcut(df["lon_lowestmode"], 3, labels=False)
lat_q = pd.qcut(df["lat_lowestmode"], 3, labels=False)
block = (lon_q * 3 + lat_q).astype(int)
n_blocks = block.nunique()
print(f"[OK] {n_blocks} blocos espaciais")
test_block = 0   # bloco reservado p/ teste final
tr, te = block != test_block, block == test_block
print(f"[OK] treino {tr.sum()} · teste espacial {te.sum()}")

# %% [markdown]
# ## 4. Modelos (RF / GBM / SVR) com métricas no teste espacial

# %%
def metrics(y, p):
    return dict(rmse=float(np.sqrt(mean_squared_error(y, p))),
                mae=float(mean_absolute_error(y, p)),
                r2=float(r2_score(y, p)),
                bias=float(np.mean(p - y)))

def fit_eval(model, Xtr, ytr, Xte, yte, name):
    model.fit(Xtr, ytr)
    p = model.predict(Xte)
    print(f"{name:5s} -> {metrics(yte, p)}")
    return model, metrics(yte, p)

Xtr, Xte = Xs[tr], Xs[te]
ytr, yte = df[TARGET].values[tr], df[TARGET].values[te]

results = {}
m_rf, results["rf"] = fit_eval(RandomForestRegressor(**RF_PARAMS), Xtr, ytr, Xte, yte, "RF")
m_gbm, results["gbm"] = fit_eval(GradientBoostingRegressor(**GBM_PARAMS), Xtr, ytr, Xte, yte, "GBM")

# SVR: subsample p/ viabilizar (O(n²))
rng = np.random.RandomState(SEED)
idx_svm = rng.choice(len(Xtr), min(SVM_MAX_SAMPLES, len(Xtr)), replace=False)
_, results["svm"] = fit_eval(SVR(**SVM_PARAMS), Xtr[idx_svm], ytr[idx_svm],
                             Xte[:min(len(Xte), 3000)], yte[:min(len(yte), 3000)], "SVM")

# %% [markdown]
# ## 5. Feature importance (RF)

# %%
imp = pd.Series(m_rf.feature_importances_, index=cov_bands).sort_values(ascending=False)
print(imp.head(20))

# %% [markdown]
# ## 6. Subversões candidatas (medidas no split espacial, modelo RF)

# %%
candidates = {}

def eval_sub(name, mask_or_subset):
    """Avalia uma subversão: mascara de amostras ou subconjunto de bandas."""
    if isinstance(mask_or_subset, np.ndarray) and mask_or_subset.dtype == bool:
        mtr = tr & mask_or_subset
        mte = te & mask_or_subset
        Xa, ya = Xs[mtr], df[TARGET].values[mtr]
        Xe, ye = Xs[mte], df[TARGET].values[mte]
    else:
        cols = [cov_bands.index(b) for b in mask_or_subset]
        Xa, ya = Xs[tr][:, cols], ytr
        Xe, ye = Xs[te][:, cols], yte
    m = RandomForestRegressor(**RF_PARAMS).fit(Xa, ya)
    p = m.predict(Xe)
    candidates[name] = metrics(ye, p)
    print(f"{name:12s} -> {candidates[name]}")

# Referência (baseline)
candidates["baseline"] = results["rf"]
print("baseline     ->", results["rf"])

eval_sub("thin1px", keep_idx.values)
eval_sub("drop_iso", ~flag)
eval_sub("drop_iso_stratum", ~flag_per)
eval_sub("no_palsar", [b for b in cov_bands
                       if not b.startswith(("HH_db", "HV_db", "HV_HH_ratio", "RVI"))])
eval_sub("no_clima", [b for b in cov_bands
                      if not b.startswith(("CWD", "Tmean_C", "Prec_mm"))])

# %% [markdown]
# ## 7. Decisão — analysis_summary

# %%
best = min(candidates, key=lambda k: candidates[k]["rmse"])
summary = {
    "versao": VERSION, "ano": YEAR, "grid": GRID,
    "n_amostras": len(df), "n_covariaveis": len(cov_bands),
    "resultados": results,
    "subversoes_candidatas": candidates,
    "melhor": best,
    "melhor_metricas": candidates[best],
    "recomendacao": f"Rodar v01_{best} no 3_modelling "
                    f"(MODEL_TYPE e hiperparâmetros conforme analysis/README).",
}
out_path = os.path.join(DRIVE_FOLDER, "analysis_summary.json")
with open(out_path, "w", encoding="utf-8") as fh:
    json.dump(summary, fh, indent=2, ensure_ascii=False)
print("[OK] Resumo salvo:", out_path)
print(json.dumps({k: v for k, v in summary.items() if k != "resultados"}, indent=2, ensure_ascii=False))
print("\n>>> Cole o bloco JSON acima no ANALYSIS/EXPERIMENTS.md (linha do experimento).")
