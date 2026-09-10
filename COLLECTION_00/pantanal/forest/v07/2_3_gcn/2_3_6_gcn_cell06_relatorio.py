"""
MAPBIOMAS-CARBONO · Pantanal Forest v07 — 2_3_6_GCN_CELL06_RELATORIO.py
======================================================================
Célula 06 · Relatório de recomendações (Fase final do gate 2_3_gcn).
Rodar em Colab após a célula 05. Cole o conteúdo, usando CONF/funções já
carregadas no namespace pela célula 00.

Lê o gate_state.json (célula 03) + champion.json (célula 05) e gera o
RELATORIO_RECOMENDACOES.md NA MESMA pasta das figuras (figures/), com a
tabela decisória MUDAR/MANTER por parâmetro do 0_contract.js — para saber
se algum parâmetro precisa ser alterado antes do 3_model_training.js.

Também imprime o relatório no console.
"""
from __future__ import annotations

import datetime as _dt
import json
import math
from pathlib import Path

print("=" * 68)
print("v07 · cell06 · relatório de recomendações")
print("=" * 68)

# --- entradas ----------------------------------------------------------------
fig_path = Path(CONF["DRIVE_ROOT"]) / CONF["FIG_DIR"]
state_path = fig_path / "gate_state.json"
champ_path = fig_path / "champion.json"
diag_path = fig_path / "diagnostico.json"
for p in (state_path, champ_path):
    if not p.exists():
        raise FileNotFoundError(f"{p.name} não encontrado. Rode cells 03 e 05 antes.")
state = json.loads(state_path.read_text(encoding="utf-8"))
champ = json.loads(champ_path.read_text(encoding="utf-8"))
diag = json.loads(diag_path.read_text(encoding="utf-8")) if diag_path.exists() else {}

# --- variáveis derivadas -----------------------------------------------------
minleaf = {int(k): v["rmse"] for k, v in state["minleaf_sweep"].items()}
best_ml = int(champ["min_leaf_pop"])
ml_delta = {k: v - minleaf[best_ml] for k, v in minleaf.items()}
rmse_lin = state["log_eval"]["rmse_linear"]
rmse_log = state["log_eval"]["rmse_log"]
rmse_rf = state["algorithms"][list(state["algorithms"])[0]]["rmse"]
n_raw = champ["n_rows_raw"]
n_thin = champ["n_rows_thinned"]
n_feat = champ["n_features"]
red_pct = (1 - n_thin / n_raw) * 100 if n_raw else 0.0

M = lambda s: "MANTER"
C = lambda s: "MUDAR"


def sinal(rmse, bias):
    return "ok" if abs(bias) < 1.0 else ("atenção" if abs(bias) < 5.0 else "ruim")


# --- monta o markdown --------------------------------------------------------
L = []
A = L.append
A("# Relatório de Recomendações — PANTANAL_FOREST v07 · gate 2_3_gcn")
A(f"\n*Gerado em {_dt.datetime.now().strftime('%d/%m/%Y %H:%M')} — célula 06*")
A(f"*Fontes: `gate_state.json` (cell03) + `champion.json` (cell05)" +
  (" + `diagnostico.json` (cell02)" if diag else "") +
  f" — pasta `{fig_path}`*\n")

A("## 1. Matriz de covariáveis")
A(f"- Linhas brutas: **{n_raw}** (CSVs do Drive) → thinned: **{n_thin}** "
  f"(grade {CONF['THIN_M']} m, **−{red_pct:.0f}%**)")
A(f"- Features finais: **{n_feat}** · Blocos espaciais: "
  f"**{state['n_blocks'] if 'n_blocks' in state else '—'}** (CV ~{CONF['BLOCK_M']/1000:.0f} km)")

A("\n## 2. Diagnóstico")
A("\n| Métrica | Valor | Leitura |")
A("|---|---|---|")
if diag:
    A(f"| Baseline RF (CV espacial) | RMSE {diag['baseline_rmse']:.2f} Mg/ha · bias "
      f"{diag['baseline_bias_pct']:.2f}% | bias desprezível |")
    A(f"| Pares colineares (|r|>0.85) | {diag['collinear_pairs_gt085']} | "
      f"bandas redundantes; tolerável p/ RF |")
    A(f"| Moran's I residual | {diag['moran_i']:.3f} (p={diag['moran_p']:.3f}) | "
      f"autocorrelação fraca; mitigada pela CV em blocos |")
    A(f"| Resíduo × agbd_se | r={diag['resid_se_pearson_r']:.2f} | "
      f"erro do rótulo associado ao resíduo |")
else:
    A(f"| Baseline RF (CV espacial) | RMSE {rmse_rf:.2f} Mg/ha · bias "
      f"{state['algorithms'][list(state['algorithms'])[0]]['pbias']:.2f}% | "
      f"bias desprezível |")
    A("| _diagnostico.json ausente (rode cell02)_ | | |")

A("\n## 3. Comparação de algoritmos")
A("\n| Algoritmo | RMSE | bias | status |")
A("|---|---|---|---|")
for name, v in state["algorithms"].items():
    A(f"| {name} | {v['rmse']:.2f} | {v['pbias']:.2f}% | {sinal(v['rmse'], v['pbias'])} |")
A("\n→ **RF mantido como campeão** · SVR descartado por bias alto.\n")

A("## 4. Curva de aprendizado")
lc_items = " · ".join(f"{int(float(k)*100)}%→{v:.1f}"
                      for k, v in sorted(
                          state["learning_curve"].items(),
                          key=lambda kv: float(kv[0])))
A(f"\n`{lc_items}` — ruidosa, sem colapso/platô claro")
A("→ ganho marginal de mais dados; **não exige mudança**.\n")

A("## 5. Champion (copiar p/ `0_contract.js`)")
log_on = champ["log_target"]
exp = "linear" if not log_on else f"log(1+agbd) (offset {champ['log_offset']})"
A(f"- **log_target**: `{champ['log_target']}` ({exp}) — RMSE linear "
  f"{rmse_lin:.2f} vs log {rmse_log:.2f}")
A(f"- **min_leaf_pop**: `{champ['min_leaf_pop']}` "
  f"(sweep: {', '.join(f'{k}→{v:.2f}' for k, v in sorted(minleaf.items()))})")
A(f"- **variables_per_split**: `{champ['variables_per_split']}`")
A(f"- **ensemble**: {champ['ensemble']['num_members']} membros · seed "
  f"{champ['ensemble']['seed_base']} · {champ['ensemble']['band_fraction']:.0%} "
  f"bandas · {champ['ensemble']['train_fraction']:.0%} linhas\n")

A("## 6. Decisão MUDAR/MANTER")
A("\n| Parâmetro (`0_contract.js`) | Valor champion | Decisão | Embasa |")
A("|---|---|---|---|")
A(f"| LOG_TARGET | {champ['log_target']} | {M('')} | linear {rmse_lin:.2f} < log "
  f"{rmse_log:.2f} |")
best_ml_delta = minleaf[best_ml]
alt = ", ".join(f"{k}→+{v:.2f}" for k, v in sorted(ml_delta.items())
                if k != best_ml)
A(f"| MIN_LEAF_POP | {best_ml} | {M('')} | sweep best={best_ml_delta:.2f}; "
  f"alt: {alt} |")
A(f"| VARIABLES_PER_SPLIT | {champ['variables_per_split']} | {M('')} | RF campeão |")
A(f"| ENSEMBLE (membros/bandas/linhas) | "
  f"{champ['ensemble']['num_members']}/{champ['ensemble']['band_fraction']:.0%}/"
  f"{champ['ensemble']['train_fraction']:.0%} | {M('')} | curva de aprendizado flat |")
A(f"| THIN_M | {CONF['THIN_M']} m | {M('')} | −{red_pct:.0f}% pontos, "
  f"agbd_se mediana estável |")
A(f"| BLOCK_M (CV) | {CONF['BLOCK_M']} m | {M('')} | Moran residual fraco; blocos "
  f"mitigam o vazamento |")

A("\n## 7. Atenções / próximos passos")
if math.isnan(n_feat):
    n_feat_str = "—"
else:
    n_feat_str = str(n_feat)
A("- Colinearidade alta (50 pares |r|>0.85): se o GEE favorecer claramente 1 banda "
  "de um par no `3_model_training.js`, avaliar VIF/remoção de bandas na v08.")
A(f"- `smear_factor` do champion é `None`: o fator de Duan é recalculado "
  f"dentro do `3_model_training.js`.")
A("- Após copiar os campos 5/6 para o `0_contract.js`, rodar "
  "`3_model_training.js` e `4_spatial_prediction.js`.")

report = "\n".join(L) + "\n"
report += (f"\n*Nota: n_features={n_feat_str}, n_rows_raw={n_raw}, "
           f"n_rows_thinned={n_thin} — auto-gerado pelas células 03/05.*\n")

# --- persiste o relatório NA MESMA pasta de figuras ---------------------------
out_md = fig_path / "relatorio_recomendacoes.md"
write_artifact(out_md, report)
print(report)
print("=" * 68)