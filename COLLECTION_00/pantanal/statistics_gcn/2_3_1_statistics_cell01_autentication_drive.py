"""
MAPBIOMAS-CARBONO · Pantanal — 2_3_1_STATISTICS_CELL01_AUTHENTICATION_DRIVE.py
===============================================================================
Célula 01 do Google Colab (gcn = google collab notebook).
Rode APÓS a 2_3_0 (que carregou CONF + funções no namespace):

  1. autentica o Google Earth Engine (ee.Authenticate + ee.Initialize)
  2. monta o Google Drive (from google.colab import drive)
  3. configura CONF["DRIVE_ROOT"] apontando para a pasta de output no Drive
     (a pasta onde ficam os CSVs das estatísticas, as figuras e o relatório)
  4. adiciona a pasta do statistics_gcn ao sys.path (para rodar as demais
     células com %run apontando para o .py no Drive)
"""
print("=" * 68)
print("statistics_gcn · cell01 · autenticação Earth Engine + Drive")
print("=" * 68)

# 1) Autenticação do Earth Engine (opcional nesta etapa — só os MAPAS/REF o usam)
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

# A pasta do statistics_gcn é adicionada ao sys.path para rodar as células
# com %run apontando para os .py (os componentes já estão no namespace — cell00).
GCN_DIR = Path(DRIVE_ROOT) / "gcn" / "statistics"
if str(GCN_DIR) not in sys.path:
    sys.path.insert(0, str(GCN_DIR))
if str(DRIVE_ROOT) not in sys.path:
    sys.path.insert(0, DRIVE_ROOT)
print(f"[PATH] sys.path += {GCN_DIR} / {DRIVE_ROOT}")

CONF["DRIVE_ROOT"] = DRIVE_ROOT
CONF["CSV_DIR"] = "estatisticas"      # CSVs do 7_statistics.js (GEE)
CONF["FIG_DIR"] = "figures"           # biblioteca de figuras
CONF["OUT_DIR"] = "relatorio"         # XLSX + .md

print()
print("[OK] Preparado. Pasta de output:", CONF["DRIVE_ROOT"])
print("     Próximo passo: 2_3_2_statistics_cell02_consolidar_qa.py — consolida")
print("     os CSVs e valida somas; depois 2_3_3 (figuras), 2_3_4 (relatório),")
print("     2_3_5 (mapas, opcional), 2_3_6 (referência). Rode com %run "
      "'<caminho>' ou cole o conteúdo das células.")
print("=" * 68)