"""
MAPBIOMAS-CARBONO · Pantanal Forest v08 — 2_3_5_GCN_CELL05_CHAMPION.py
======================================================================
Célula 05 · Champion (configuração final do modelo v08) — Fase 2 da consulta.
Rodar em Colab após a célula 04. Cole o conteúdo, usando CONF/funções já
carregadas no namespace pela célula 00.

Consome o gate_state.json escrito pela célula 03 e:
  1. decide log_target (linear vs log(1+agbd) + fator de Duan — B7)
  2. escolhe minLeafPopulation (regularização direta da varredura)
  3. fixa o ENSEMBLE (N=5, seed_base, ~80% bandas, ~80% linhas)
  4. mede a importância de permutação do champion
  5. escreve champion.json NA MESMA pasta das figuras — com esses valores,
     copie os campos para o 0_contract.js e rode o 3_model_training.js
"""
from __future__ import annotations

import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance

print("=" * 68)
print("v08 · cell05 · champion")
print("=" * 68)

state_path = Path(CONF["DRIVE_ROOT"]) / CONF["FIG_DIR"] / "gate_state.json"
if not state_path.exists():
    raise FileNotFoundError(
        "gate_state.json não encontrado. Rode 2_3_3 (cell03) antes.")
state = json.loads(state_path.read_text(encoding="utf-8"))
print(f"[ESTADO] carregado de {state_path}")

df = load_matrix()
df, _ = clean_features(df)
df = grid_thin(df)  # champion é medido sobre a matriz THINNED (cell04)
FEATS = [c for c in df.columns if c not in
         (CONF["TARGET"], CONF["WEIGHT_COL"], CONF["LON"], CONF["LAT"],
          CONF["AGBD_SE"], "geometry", "cell_id", "year")]
X = df[FEATS].fillna(df[FEATS].median())
y = df[CONF["TARGET"]].values

# --- decisões ----------------------------------------------------------------
# v08: alvo LINEAR (sem log-target) — não há decisão de log.
min_leaf = state["min_leaf_best"]

champion = {
    "version": "v08",
    "log_target": False,
    "min_leaf_pop": int(min_leaf),
    "variables_per_split": "sqrt(n_features)",
    "ensemble": {
        "num_members": CONF["N_MEMBERS"],
        "seed_base": CONF["SEED_BASE"],
        "band_fraction": CONF["BAND_FRACTION"],
        "train_fraction": CONF["TRAIN_FRACTION"],
    },
    "metrics": {
        "rmse_cv_linear": state["log_eval"]["rmse_linear"],
        "bias_cv_linear": state["log_eval"]["bias_linear"],
        "rmse_cv_minleaf_best": state["minleaf_sweep"][str(min_leaf)]["rmse"],
    },
    "n_features": int(X.shape[1]),
    "n_rows_thinned": int(len(y)),
    "n_rows_raw": state["n_rows"],
}
print(f"[DECISÃO] log_target=False (v08 linear) · minLeafPopulation={min_leaf}")

# --- importância de permutação do champion ----------------------------------
m = RandomForestRegressor(n_estimators=CONF["N_ESTIMATORS"],
                          max_features="sqrt", min_samples_leaf=min_leaf,
                          random_state=CONF["RANDOM_STATE"])
yt = y   # v08: alvo linear
m.fit(X, yt)
imp = permutation_importance(m, X, yt, n_repeats=5,
                             random_state=CONF["RANDOM_STATE"])
order = np.argsort(imp.importances_mean)[::-1][:15]
fig, ax = plt.subplots(figsize=(7, 6))
ax.barh([FEATS[i][:24] for i in order[::-1]],
        imp.importances_mean[order[::-1]], color="#2b83ba")
ax.set(xlabel="importância de permutação (ΔRMSE)",
       title="f11 · importância de permutação — champion")
save_fig(fig, "f11_importancia_permutacao.png")

# --- persiste champion.json (mesma pasta das figuras/output) -----------------
out_json = Path(CONF["DRIVE_ROOT"]) / CONF["FIG_DIR"] / "champion.json"
write_artifact(out_json, champion)

print()
print("[CHAMPION] campeão configurado — copie para o 0_contract.js:")
print()
for k, v in champion.items():
    print(f"  {k}: {json.dumps(v, ensure_ascii=False) if isinstance(v, dict) else v}")
print()
print("    → após copiar, rode no GEE: 3_model_training.js e 4_spatial_prediction.js")
print("=" * 68)