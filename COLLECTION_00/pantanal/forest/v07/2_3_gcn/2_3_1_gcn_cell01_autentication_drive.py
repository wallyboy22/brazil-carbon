"""
MAPBIOMAS-CARBONO · Pantanal Forest v07 — 2_3_1_GCN_CELL01_AUTENTICATION_DRIVE.py
==================================================================================
Célula 01 do Google Colab (gcn = google collab notebook).

Rode em um Colab após a célula 00 (util/config):
  1. autentica o Google Earth Engine (ee.Authenticate + ee.Initialize)
  2. monta o Google Drive (from google.colab import drive)

A célula 00 já deixou CONF e funções no namespace; nada a configurar aqui.
"""
print("=" * 68)
print("v07 · cell01 · autenticação Earth Engine + montagem do Drive")
print("=" * 68)

# 1) Autenticação do Earth Engine
import ee  # noqa: E402

try:
    ee.Initialize(project="mapbiomas-carbono")
    print("[EE] já inicializado (project=mapbiomas-carbono)")
except Exception:
    ee.Authenticate()
    ee.Initialize(project="mapbiomas-carbono")
    print("[EE] autenticado e inicializado")

# 2) Montagem do Google Drive
from google.colab import drive  # noqa: E402

drive.mount("/content/drive")
print("[DRIVE] montado em /content/drive")

if "DRIVE_ROOT" not in globals():
    print("[AVISO] CONF ainda não está no namespace — rode a célula 00 (util) " +
          "antes desta.")
else:
    print("[OK] Preparado. Pasta de output (balde):", CONF["DRIVE_ROOT"])
    print("     Próximo passo: rode a célula 02 (diagnóstico)")
    print("=" * 68)