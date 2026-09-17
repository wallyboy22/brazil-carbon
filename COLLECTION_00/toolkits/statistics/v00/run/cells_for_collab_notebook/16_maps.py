"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — 16_maps.py
================================================================
Etapa 16 (OPCIONAL) · Mapas espaciais das estatísticas. Rode após 14_report —
somente se CONF["FAZER_MAPAS"] for True.

Diferente das demais etapas, ESTA consulta o Earth Engine: calcula a MÉDIA da
predição florestal (versão `CONF["MAP_FOREST_VERSION"]`) e a FRAÇÃO campestre
(C11: 11/12/50) por grade de GRID_M (default 10 km), recortadas no bioma, e
salva dois PNG em FIG_DIR. Requer EE autenticado e os assets existentes.

Configurável por CONF: `MAP_FOREST_VERSION` (ex.: 'v07'), `MAP_ASSET`
(override do asset) e `MAP_BAND` (override da banda). Para v08+ o prefixo do
asset é `agb_pred_*` (ver docs/BAND_NAMING.md); v03–v07 usam `agc_pred_*`.
"""
print("=" * 68)
print("statistics · 16_maps · mapas (opcional)")
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

_FV = CONF.get("MAP_FOREST_VERSION", "v07")
_prefix = "agb_pred" if int(_FV.lstrip("v")) >= 8 else "agc_pred"
ASSET = CONF.get("MAP_ASSET") or (
    "projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/"
    f"PANTANAL_FOREST/{_FV.upper()}/PREDICTIONS/"
    f"{_prefix}_{_FV}_merged_{CONF['YEAR']}")
BAND = CONF.get("MAP_BAND", f"prediction_{CONF['YEAR']}")
print(f"[EE] asset: {ASSET} · banda: {BAND}")

MOSAIC = ee.Image(ASSET).select(BAND)
LULC = ee.Image(
    "projects/mapbiomas-public/assets/brazil/lulc/collection11/"
    "mapbiomas_brazil_collection11_coverage_v3").select(
    f"classification_{CONF['YEAR']}")


def thumb(img, params, name):
    url = img.getThumbURL(params)
    pil = Image.open(io.BytesIO(requests.get(url).content))
    out = fig_dir() / name
    pil.save(out)
    print(f"[FIG] {out}")


g = CONF["GRID_M"]
agc = MOSAIC.reduceResolution(ee.Reducer.mean(), maxPixels=1024)\
    .reproject("EPSG:4326", None, g).clip(BIOME)
camp = LULC.remap([11, 12, 50], [1], 0)\
    .reduceResolution(ee.Reducer.mean(), maxPixels=1024)\
    .reproject("EPSG:4326", None, g).clip(BIOME)

thumb(agc, {"min": 0, "max": 350, "palette": ["#0b4463", "#1a9850", "#fee08b"]},
      f"mapa_agb_{_FV}_grid_{g // 1000}km.png")
thumb(camp, {"min": 0, "max": 1, "palette": ["#ffffff", "#2b83ba"]},
      f"mapa_campestre_grid_{g // 1000}km.png")
print(f"[OK] grid de {g // 1000} km — mapas salvos em {fig_dir()}")
print("=" * 68)
