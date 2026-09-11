"""Cell 01 — Autenticação (opcional; só necessária p/ re-sincronizar a matriz
com o Earth Engine em vez do CSV local)."""
import subprocess
import sys

try:
    import ee
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "earthengine-api"])
    import ee

try:
    ee.Initialize(project="ee-ipam")
    print("EE inicializado (project=ee-ipam).")
except Exception as exc:  # noqa: BLE001
    print("Autentique primeiro: earthengine authenticate")
    print("Erro:", str(exc)[:200])
    print("(O fit do cell03 não requer EE — usa o CSV da matriz no Drive.)")