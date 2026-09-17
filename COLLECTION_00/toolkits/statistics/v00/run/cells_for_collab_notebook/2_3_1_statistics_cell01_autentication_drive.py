"""
MAPBIOMAS-CARBONO · Pantanal — 2_3_1_STATISTICS_CELL01_AUTHENTICATION_DRIVE.py
===============================================================================
Célula 01 do Google Colab (gcn = google collab notebook).
Rode APÓS a 2_3_0 (que carregou CONF + funções no namespace):

  1. monta o Google Drive (from google.colab import drive)
  2. configura CONF["DRIVE_ROOT"] apontando para a pasta de output no Drive
     (a pasta onde ficam os CSVs das estatísticas, as figuras e o relatório)
  3. adiciona a pasta do statistics_gcn ao sys.path (para rodar as demais
     células com %run apontando para o .py no Drive)

As estatísticas (produtos E referências) são computadas NO GEE (steps
`7_statistics.js` / `7_references.js`) e apenas LIDAS daqui — este notebook
NÃO autentica nem inicializa o Earth Engine.
"""
print("=" * 68)
print("statistics_gcn · cell01 · autenticação Drive (sem Earth Engine)")
print("=" * 68)

# 1) Montagem do Google Drive
from google.colab import drive  # noqa: E402

drive.mount("/content/drive")
print("[DRIVE] montado em /content/drive")

# 2) Configuração da pasta de output (CSVs das estatísticas + figuras + relatório)
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
CONF["CSV_DIR"] = "estatisticas"      # CSVs do 7_statistics.js / 7_references.js
CONF["FIG_DIR"] = "figures"           # biblioteca de figuras
CONF["OUT_DIR"] = "relatorio"         # XLSX + .md

print()
print("[OK] Preparado. Pasta de output:", CONF["DRIVE_ROOT"])
print("     Próximo passo: 2_3_2_statistics_cell02_consolidar_qa.py — consolida")
print("     os CSVs e valida somas; depois 2_3_3 (figuras), 2_3_4 (relatório),")
print("     2_3_5 (mapas, opcional), 2_3_6 (referência). Rode com %run "
      "'<caminho>' ou cole o conteúdo das células.")
print("=" * 68)