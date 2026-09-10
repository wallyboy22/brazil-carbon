"""
MAPBIOMAS-CARBONO · Pantanal Forest v07 — 2_3_0_GCN_CELL00_AUTENTICATION_DRIVE.py
==================================================================================
Célula 00 do Google Colab (gcn = google collab notebook).

Fica NA EXPECTATIVA de rodar em um Colab qualquer:
  1. autentica o Google Earth Engine (ee.Authenticate + ee.Initialize)
  2. monta o Google Drive (from google.colab import drive)
  3. configura 2_3_util.CONF apontando para a pasta de OUTPUT no Drive
     (a mesma pasta onde estão os CSVs da matriz e onde serão salvas as figuras)
  4. adiciona a pasta do 2_3_gcn ao sys.path (para importar 2_3_util e rodar
     as demais células com %run apontando para o .py do fluxo)
"""
print("=" * 68)
print("v07 · cell00 · autenticação Earth Engine + montagem do Drive")
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

# 3) Configuração da pasta de OUTPUT (a MESMA onde ficam figuras e CSVs)
DRIVE_ROOT = "/content/drive/MyDrive/mapbiomas_carbono/pantanal_forest/v07"

import sys  # noqa: E402
from pathlib import Path  # noqa: E402

# A pasta do 2_3_gcn é adicionada ao sys.path para importar o 2_3_util.
# Dica: deixe os .py do fluxo na mesma pasta de output no Drive
# (gcn) OU faça upload deles para o runtime.
GCN_DIR = Path(DRIVE_ROOT) / "gcn"
if str(GCN_DIR) not in sys.path:
    sys.path.insert(0, str(GCN_DIR))
sys.path.insert(0, DRIVE_ROOT)
print(f"[PATH] sys.path += {GCN_DIR} / {DRIVE_ROOT}")

import 2_3_util as util  # noqa: E402

util.CONF["DRIVE_ROOT"] = DRIVE_ROOT
util.CONF["MATRIX_DIR"] = "matriz"
util.CONF["FIG_DIR"] = "figures"

print()
print("[OK] Preparado. Pasta de output:", DRIVE_ROOT)
print("     Próximo passo: rode as células 2_3_1 (diagnóstico), 2_3_2 (CV/" +
      "regularização), 2_3_3 (thinning/figuras) e 2_3_4 (champion) apontando " +
      "para o .py do fluxo — %run '<caminho>' ou cole o conteúdo.")
print("=" * 68)