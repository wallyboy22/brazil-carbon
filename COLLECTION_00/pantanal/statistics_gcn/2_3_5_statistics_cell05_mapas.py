"""
MAPBIOMAS-CARBONO · Pantanal — 2_3_5_STATISTICS_CELL05_MAPAS.py
================================================================
Célula 05 (OPCIONAL) · Mapas espaciais das estatísticas (usa CONF + fig_dir
da cell00). Rodar em Colab após a cell04 — somente se CONF["FAZER_MAPAS"]
estiver True.

Diferente das células 02–04, ESTA célula consulta o Earth Engine: calcula a
MÉDIA de AGC 2023 (v07) e a FRAÇÃO campestre (C11: 11/12/50) por grade de
GRID_M (default 10 km), recortados no bioma, e salva dois PNG em FIG_DIR.
Requer EE autenticado (cell01) e os assets v07/LULC existentes.

Para desligar por completo, deixe CONF["FAZER_MAPAS"]=False (padrão).
"""
print("=" * 68)
print("statistics_gcn · cell05 · mapas (opcional)")
print("=" * 68)

if not CONF["FAZER_MAPAS"]:
    print("[OFF] FAZER_MAPAS=False (padrão). Nada a fazer.")
    print("      Para ativar: CONF['FAZER_MAPAS'] = True acima desta célula")
    print("      e rode novamente (custa uma redução no EE).")
    print("=" * 68)
    raise SystemExit(0)

import io  # noqa: E402

import ee  # noqa: E402
import requests  # noqa: E402
from PIL import Image  # noqa: E402

BIOME = ee.FeatureCollection(
    "projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026")\
    .filter(ee.Filter.eq("Bioma", "Pantanal")).first().geometry()
MOSAIC = ee.Image("projects/mapbiomas-brazil/assets/CARBON/MAPPING/"
                  "COLLECTION_00/PANTANAL_FOREST/V07/PREDICTIONS/"
                  "agc_pred_v07_merged_2023").select("prediction_2023")
LULC = ee.Image("projects/mapbiomas-public/assets/brazil/lulc/collection11/"
                "mapbiomas_brazil_collection11_coverage_v3").select(
    "classification_2023")


def thumb(img, params, name):
    url = img.getThumbURL(params)
    pil = Image.open(io.BytesIO(requests.get(url).content))
    out = fig_dir() / name
    pil.save(out)
    print(f"[FIG] {out}")


g = CONF["GRID_M"]
coarse = (ee.Image.pixelArea().multiply(0).add(1).reproject("EPSG:4326", None,
           800).reduceResolution(ee.Reducer.mean(), maxPixels=1024)
          .reproject("EPSG:4326", None, g).clip(BIOME))

agc = MOSAIC.reduceResolution(ee.Reducer.mean(), maxPixels=1024)\
    .reproject("EPSG:4326", None, g).clip(BIOME)
camp = LULC.remap([11, 12, 50], [1], 0)\
    .reduceResolution(ee.Reducer.mean(), maxPixels=1024)\
    .reproject("EPSG:4326", None, g).clip(BIOME)

thumb(agc, {"min": 0, "max": 350, "palette": ["#0b4463", "#1a9850", "#fee08b"]},
      f"mapa_agc_v07_grid_{g // 1000}km.png")
thumb(camp, {"min": 0, "max": 1, "palette": ["#ffffff", "#2b83ba"]},
      f"mapa_campestre_v01_grid_{g // 1000}km.png")
print(f"[OK] grid de {g // 1000} km — mapas salvos em {fig_dir()}")
print("=" * 68)