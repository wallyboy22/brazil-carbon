"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — 10_auth_drive.py
===============================================================================
Etapa 10 · monta o Google Drive e configura CONF (paths de CSV/figuras/saída).

Rode APÓS 00_config..06_references. As estatísticas (produtos E referências)
são computadas NO GEE (run/run_pantanal.js / run/run_references.js) e apenas
LIDAS aqui — este notebook NÃO autentica nem inicializa o Earth Engine
(exceção: a etapa opcional 16_maps).
"""
print("=" * 68)
print("statistics · 10_auth_drive · autenticação Drive (sem Earth Engine)")
print("=" * 68)

# 1) Montagem do Google Drive
from google.colab import drive  # noqa: E402

drive.mount("/content/drive")
print("[DRIVE] montado em /content/drive")

# 2) Configuração da pasta de output (CSVs + figuras + relatório)
DRIVE_ROOT = "/content/drive/MyDrive/mapbiomas_carbono/pantanal"

import sys  # noqa: E402
from pathlib import Path  # noqa: E402

# A pasta das células é adicionada ao sys.path para rodar as etapas com %run
# apontando para os .py (os componentes já estão no namespace — 00..06).
GCN_DIR = Path(DRIVE_ROOT) / "cells_for_collab_notebook"
if str(GCN_DIR) not in sys.path:
    sys.path.insert(0, str(GCN_DIR))
if str(DRIVE_ROOT) not in sys.path:
    sys.path.insert(0, DRIVE_ROOT)
print(f"[PATH] sys.path += {GCN_DIR} / {DRIVE_ROOT}")

CONF["DRIVE_ROOT"] = DRIVE_ROOT
CONF["CSV_DIR"] = "estatisticas"      # CSVs do run/run_pantanal.js / run_references.js
CONF["FIG_DIR"] = "figures"           # biblioteca de figuras
CONF["OUT_DIR"] = "relatorio"         # XLSX + .md + consolidados

print()
print("[OK] Preparado. Pasta de output:", CONF["DRIVE_ROOT"])
print("     Próximas: 11_consolidate → 12_join_largo → 13_figures → "
      "14_report → 15_references → 16_maps (opcional).")
print("=" * 68)