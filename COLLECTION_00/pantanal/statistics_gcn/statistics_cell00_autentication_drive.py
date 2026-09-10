"""
MAPBIOMAS-CARBONO · Pantanal — STATISTICS_CELL00_AUTENTICATION_DRIVE.py
========================================================================
Célula 00 do Google Colab (gcn = google collab notebook).

Fica NA EXPECTATIVA de rodar em um Colab qualquer:
  1. autentica o Google Earth Engine (ee.Authenticate + ee.Initialize)
  2. monta o Google Drive (from google.colab import drive)
  3. configura statistics_util.CONF apontando para a pasta de output no Drive
     (a pasta onde ficam os CSVs das estatísticas, as figuras e o relatório)
  4. adiciona a pasta do statistics_gcn ao sys.path (para importar
     statistics_util e rodar as demais células com %run apontando para o .py)
"""
print("=" * 68)
print("statistics_gcn · cell00 · autenticação Earth Engine + Drive")
print("=" * 68)

# 1) Autenticação do Earth Engine (opcional nesta etapa — só os MAPAS o usam)
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

# 3) Configuração da pasta de output (CSVs das estatísticas + figuras + relatório)
DRIVE_ROOT = "/content/drive/MyDrive/mapbiomas_carbono/pantanal"

import sys  # noqa: E402
from pathlib import Path  # noqa: E402

# A pasta do statistics_gcn é adicionada ao sys.path para importar o util.
GCN_DIR = Path(DRIVE_ROOT) / "gcn" / "statistics"
if str(GCN_DIR) not in sys.path:
    sys.path.insert(0, str(GCN_DIR))
if str(DRIVE_ROOT) not in sys.path:
    sys.path.insert(0, DRIVE_ROOT)
print(f"[PATH] sys.path += {GCN_DIR} / {DRIVE_ROOT}")

import statistics_util as util  # noqa: E402

util.CONF["DRIVE_ROOT"] = DRIVE_ROOT
util.CONF["CSV_DIR"] = "estatisticas"      # CSVs do 7_statistics.js (GEE)
util.CONF["FIG_DIR"] = "figures"           # biblioteca de figuras
util.CONF["OUT_DIR"] = "relatorio"         # XLSX + .md

print()
print("[OK] Preparado. Pasta de output:", DRIVE_ROOT)
print("     Próximo passo: statistics_cell01_consolidar_qa.py — consolida os")
print("     CSVs e valida somas; depois cell02 (figuras), cell03 (relatório),")
print("     cell04 (mapas, opcional). Rode com %run '<caminho>' ou cole o")
print("     conteúdo das células.")
print("=" * 68)