"""
MAPBIOMAS-CARBONO · Pantanal Forest v08 — 2_3_0B_GCN_CELL00B_REORGANIZE.py
========================================================================
Célula 00b · Reorganização da raiz do Drive (opcional, 1×).
Rodar em Colab APÓS a célula 00 (util). Cole o conteúdo.

Move os arquivos da raiz FLAT (`MyDrive/mapbiomas_carbono/`) para subpastas de
CONTEXTO `<VERSION>_<SOURCE>` (ex.: `v08_gedi/`, `v08_ifn/`):
  - agb_matrix_<SRC>_<VER>_*.csv             → <VER>_<SRC>/
  - samples_thinned_<SRC>_<VER>(.csv|.note)  → <VER>_<SRC>/
  - figures_<SRC>/                           → <VER>_<SRC>/figures/
  - artefatos do gate (diagnostico/gate_state/champion/relatorio/f*.png)
                                             → contexto ativo (<VERSION>_<SOURCE>)
  - desconhecidos: deixados como estão

Idempotente e seguro (não sobrescreve). Use DRY_RUN=True para só ver o plano.
Depois da reorg, as células 02..06 leem/escrevem no contexto (fig_dir/matrix_dir).
"""
from __future__ import annotations

DRY_RUN = False   # True → só imprime o que faria, sem mover

print("=" * 68)
print("v08 · cell00b · reorganização da raiz por contexto")
print("=" * 68)
print("     DRIVE_ROOT:", CONF["DRIVE_ROOT"], "· VERSION:", CONF["VERSION"],
      "· SOURCE:", CONF["SOURCE"])
print("     contexto resolvido:", context_name())

stats = reorganize_root(dry_run=DRY_RUN)

print()
print("[RESUMO]", stats)
print("[PASTAS]")
for d in sorted(Path(CONF["DRIVE_ROOT"]).glob(f"{CONF['VERSION']}_*")):
    if d.is_dir():
        n = len([f for f in d.glob("*") if f.is_file()])
        print("  ", d.name, "→", n, "arquivo(s)")
print("=" * 68)
