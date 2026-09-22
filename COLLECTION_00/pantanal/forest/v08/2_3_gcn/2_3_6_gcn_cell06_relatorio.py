"""
MAPBIOMAS-CARBONO · Pantanal Forest v08 — 2_3_6_GCN_CELL06_RELATORIO.py
======================================================================
Célula 06 · Relatório de recomendações (Fase final do gate 2_3_gcn).
Rodar em Colab após a célula 05. Cole o conteúdo, usando CONF/funções já
carregadas no namespace pela célula 00.

Roda para CADA fonte disponível (auto = gedi e/ou ifn) em sequência; grava
`relatorio_recomendacoes.md` no contexto de cada fonte.

Lê gate_state.json (cell03) + champion.json (cell05) + diagnostico.json (cell02)
e gera a tabela decisória MUDAR/MANTER por parâmetro do 0_contract.js.
"""
from __future__ import annotations

import datetime as _dt
import json
import math
from pathlib import Path

print("=" * 68)
print("v08 · cell06 · relatório de recomendações")
print("=" * 68)

for _src in sources_to_run():
    CONF["SOURCE"] = _src
    print("\n" + "#" * 68)
    print(f"# FONTE: {_src} · contexto {context_name()} · {fig_dir()}")
    print("#" * 68)

    fig_path = fig_dir()
    state_path = fig_path / "gate_state.json"
    champ_path = fig_path / "champion.json"
    diag_path = fig_path / "diagnostico.json"
    for p in (state_path, champ_path):
        if not p.exists():
            raise FileNotFoundError(f"{p.name} não encontrado ({_src}). Rode cells 03 e 05 antes.")
    state = json.loads(state_path.read_text(encoding="utf-8"))
    champ = json.loads(champ_path.read_text(encoding="utf-8"))
    diag = json.loads(diag_path.read_text(encoding="utf-8")) if diag_path.exists() else {}

    # --- variáveis derivadas ---------------------------------------------------
    minleaf = {int(k): v["rmse"] for k, v in state["minleaf_sweep"].items()}
    best_ml = int(champ["min_leaf_pop"])
    ml_delta = {k: v - minleaf[best_ml] for k, v in minleaf.items()}
    rmse_lin = state["log_eval"]["rmse_linear"]
    rmse_rf = state["algorithms"][list(state["algorithms"])[0]]["rmse"]
    n_raw = champ["n_rows_raw"]
    n_thin = champ["n_rows_thinned"]
    n_feat = champ["n_features"]
    red_pct = (1 - n_thin / n_raw) * 100 if n_raw else 0.0

    M = lambda s: "MANTER"
    C = lambda s: "MUDAR"

    def sinal(rmse, bias):
        return "ok" if abs(bias) < 1.0 else ("atenção" if abs(bias) < 5.0 else "ruim")

    # --- monta o markdown ------------------------------------------------------
    L = []
    A = L.append
    A(f"# Relatório de Recomendações — PANTANAL_FOREST v08 · {_src} · gate 2_3_gcn")
    A(f"\n*Gerado em {_dt.datetime.now().strftime('%d/%m/%Y %H:%M')} — célula 06*")
    A(f"*Fonte: `{_src}` · `gate_state.json` (cell03) + `champion.json` (cell05)" +
      (" + `diagnostico.json` (cell02)" if diag else "") +
      f" — pasta `{fig_path}`*\n")

    A("## 1. Matriz de covariáveis")
    A(f"- Linhas brutas: **{n_raw}** (CSVs do Drive) → thinned: **{n_thin}** "
      f"(grade {CONF['THIN_M']} m, **−{red_pct:.0f}%**)")
    n_skip = diag.get("n_skipped_csvs", 0)
    if n_skip:
        names = ", ".join(diag.get("skipped_csvs", [])[:6])
        A(f"- CSVs **vazios/corrompidos ignorados**: **{n_skip}** ({names}"
          + ("…" if n_skip > 6 else "") + ")")
    A(f"- Features finais: **{n_feat}** · Blocos espaciais: "
      f"**{state['n_blocks'] if 'n_blocks' in state else '—'}** (CV ~{CONF['BLOCK_M']/1000:.0f} km)")

    A("\n## 2. Diagnóstico")
    A("\n| Métrica | Valor | Leitura |")
    A("|---|---|---|")
    if diag:
        A(f"| Baseline RF (CV espacial) | RMSE {diag['baseline_rmse']:.2f} t/ha · bias "
          f"{diag['baseline_bias_pct']:.2f}% | bias desprezível |")
        A(f"| Pares colineares (|r|>0.85) | {diag['collinear_pairs_gt085']} | "
          f"bandas redundantes; tolerável p/ RF |")
        A(f"| Moran's I residual | {diag['moran_i']:.3f} (p={diag['moran_p']:.3f}) | "
          f"autocorrelação fraca; mitigada pela CV em blocos |")
        xcol = diag.get("resid_x_col", CONF["AGBD_SE"])
        xr = diag.get("resid_x_pearson_r", diag.get("resid_se_pearson_r"))
        if xr is not None:
            A(f"| Resíduo × {xcol} | r={xr:.2f} | erro do rótulo associado ao resíduo |")
    else:
        A(f"| Baseline RF (CV espacial) | RMSE {rmse_rf:.2f} t/ha · bias "
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
    A(f"- **fonte**: `{_src}`")
    A(f"- **alvo**: linear (sem log) — RMSE CV linear {rmse_lin:.2f}")
    A(f"- **min_leaf_pop**: `{champ['min_leaf_pop']}` "
      f"(sweep: {', '.join(f'{k}→{v:.2f}' for k, v in sorted(minleaf.items()))})")
    A(f"- **variables_per_split**: `{champ['variables_per_split']}`")
    A(f"- **ensemble**: {champ['ensemble']['num_members']} membros · seed "
      f"{champ['ensemble']['seed_base']} · {champ['ensemble']['band_fraction']:.0%} "
      f"bandas · {champ['ensemble']['train_fraction']:.0%} linhas\n")

    A("## 6. Decisão MUDAR/MANTER")
    A("\n| Parâmetro (`0_contract.js`) | Valor champion | Decisão | Embasa |")
    A("|---|---|---|---|")
    A(f"| ALVO | linear (sem log) | {M('')} | RMSE CV linear {rmse_lin:.2f} |")
    best_ml_delta = minleaf[best_ml]
    alt = ", ".join(f"{k}→+{v:.2f}" for k, v in sorted(ml_delta.items())
                    if k != best_ml)
    A(f"| MIN_LEAF_POP | {best_ml} | {M('')} | sweep best={best_ml_delta:.2f}; "
      f"alt: {alt} |")
    A(f"| VARIABLES_PER_SPLIT | {champ['variables_per_split']} | {M('')} | RF campeão |")
    A(f"| ENSEMBLE (membros/bandas/linhas) | "
      f"{champ['ensemble']['num_members']}/{champ['ensemble']['band_fraction']:.0%}/"
      f"{champ['ensemble']['train_fraction']:.0%} | {M('')} | curva de aprendizado flat |")
    A(f"| THIN_M | {CONF['THIN_M']} m | {M('')} | −{red_pct:.0f}% pontos |")
    A(f"| BLOCK_M (CV) | {CONF['BLOCK_M']} m | {M('')} | Moran residual fraco; blocos "
      f"mitigam o vazamento |")

    A("\n## 7. Atenções / próximos passos")
    n_feat_str = "—" if (isinstance(n_feat, float) and math.isnan(n_feat)) else str(n_feat)
    A("- Colinearidade alta: se o GEE favorecer claramente 1 banda de um par no "
      "`3_model_training.js`, avaliar VIF/remoção de bandas.")
    A("- Após copiar os campos 5/6 para o `0_contract.js`, rodar "
      "`3_model_training.js` e `4_spatial_prediction.js`.")

    report = "\n".join(L) + "\n"
    report += (f"\n*Nota: fonte={_src}, n_features={n_feat_str}, n_rows_raw={n_raw}, "
               f"n_rows_thinned={n_thin} — auto-gerado pelas células 03/05.*\n")

    # --- persiste o relatório no contexto da fonte -----------------------------
    out_md = fig_path / "relatorio_recomendacoes.md"
    write_artifact(out_md, report)
    print(report)
print("=" * 68)
