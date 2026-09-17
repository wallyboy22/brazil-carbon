"""
MAPBIOMAS-CARBONO · toolkit statistics/v00 — cells_for_collab_notebook
========================================================================
01_legends.py · LEGENDAS (LULC Coleção 11 + def_sec) e helpers de rótulo.

Espelho do módulo GEE `engine/module_legends.js`. Rode após 00_config.
"""
# ---------------------------------------------------------------------------
# Assets oficiais (MapBiomas C11)
# ---------------------------------------------------------------------------
C11_ASSET = (
    "projects/mapbiomas-public/assets/brazil/lulc/collection11/"
    "mapbiomas_brazil_collection11_coverage_v3"
)
DEF_SEC_ASSET = (
    "projects/mapbiomas-public/assets/brazil/lulc/collection11/"
    "mapbiomas_brazil_collection11_deforestation_secondary_vegetation_v5"
)


def defsec_band(year: int) -> str:
    return f"classification_{year}"


# ---- Legenda def_sec (0..7) --------------------------------------------------
DEF_SEC_VEG_LEGEND = {
    0: "Não Observado",
    1: "Antrópico",
    2: "Vegetação Primária",
    3: "Vegetação Secundária",
    4: "Desmatamento Primário",
    5: "Recrescimento",
    6: "Desmatamento Secundário",
    7: "Outras Transições",
}
DEFSEC_MODS = [0, 1, 2, 3, 4, 5, 6, 7]
DEFSEC_TIPOS = {
    0: "nao_observado",
    1: "antropico",
    2: "primaria",
    3: "secundaria",
    4: "desmatamento",
    5: "recrescimento",
    6: "desmatamento",
    7: "transicao",
}


def defsec_label(mod) -> str:
    return DEF_SEC_VEG_LEGEND.get(int(mod), f"Mod {int(mod)}")


def defsec_tipo(mod) -> str:
    return DEFSEC_TIPOS.get(int(mod), "outro")


DEF_SEC_CODE = {v: k for k, v in DEF_SEC_VEG_LEGEND.items()}


def defsec_code(label):
    """Rótulo da legenda def_sec (por extenso) → código 0..7 (-1 se fora)."""
    if pd.isna(label):
        return -1
    if isinstance(label, (int, float, np.integer, np.floating)):
        return int(label)
    return DEF_SEC_CODE.get(str(label).strip(), -1)


# ---- Legendas oficiais por nível (código → nome) -----------------------------
LULC_NIVEIS = {
    0: "Não observado", 1: "Nível 1", 3: "Nível 2", 4: "Nível 2",
    5: "Nível 2", 6: "Nível 2", 7: "Nível 2", 49: "Nível 2", 10: "Nível 1",
    11: "Nível 2", 12: "Nível 2", 77: "Nível 2", 32: "Nível 2",
    29: "Nível 2", 50: "Nível 2", 13: "Nível 2", 84: "Nível 2",
    14: "Nível 1", 15: "Nível 2", 18: "Nível 2", 19: "Nível 3",
    39: "Nível 4", 20: "Nível 4", 40: "Nível 4", 62: "Nível 4",
    41: "Nível 4", 36: "Nível 3", 46: "Nível 4", 47: "Nível 4",
    35: "Nível 4", 48: "Nível 4", 9: "Nível 2", 21: "Nível 2",
    22: "Nível 1", 23: "Nível 2", 24: "Nível 2", 30: "Nível 2",
    75: "Nível 2", 91: "Nível 2", 25: "Nível 2", 26: "Nível 1",
    33: "Nível 2", 31: "Nível 3", 27: "Não observado",
}

LULC_NIVEL_0 = {
    0: "Não observado", 1: "Natural", 3: "Natural", 4: "Natural",
    5: "Natural", 6: "Natural", 7: "Natural", 49: "Natural", 10: "Natural",
    11: "Natural", 12: "Natural", 77: "Natural", 32: "Natural",
    29: "Antrópico", 50: "Natural", 13: "Natural", 84: "Natural",
    14: "Antrópico", 15: "Antrópico", 18: "Antrópico", 19: "Antrópico",
    39: "Antrópico", 20: "Antrópico", 40: "Antrópico", 62: "Antrópico",
    41: "Antrópico", 36: "Antrópico", 46: "Antrópico", 47: "Antrópico",
    35: "Antrópico", 48: "Antrópico", 9: "Antrópico", 21: "Antrópico",
    22: "Antrópico", 23: "Antrópico", 24: "Antrópico", 30: "Antrópico",
    75: "Antrópico", 91: "Antrópico", 25: "Antrópico", 26: "Antrópico",
    33: "Antrópico", 31: "Antrópico", 27: "Não observado",
}

LULC_NIVEL_1 = {
    0: "Não observado", 1: "Floresta", 3: "Floresta", 4: "Floresta",
    5: "Floresta", 6: "Floresta", 7: "Floresta", 49: "Floresta",
    10: "Vegetação Herbácea e Arbustiva", 11: "Vegetação Herbácea e Arbustiva",
    12: "Vegetação Herbácea e Arbustiva", 77: "Vegetação Herbácea e Arbustiva",
    32: "Vegetação Herbácea e Arbustiva", 29: "Área não vegetada",
    50: "Vegetação Herbácea e Arbustiva",
    13: "Vegetação Herbácea e Arbustiva", 84: "Vegetação Herbácea e Arbustiva",
    14: "Agropecuária", 15: "Agropecuária", 18: "Agropecuária",
    19: "Agropecuária", 39: "Agropecuária", 20: "Agropecuária",
    40: "Agropecuária", 62: "Agropecuária", 41: "Agropecuária",
    36: "Agropecuária", 46: "Agropecuária", 47: "Agropecuária",
    35: "Agropecuária", 48: "Agropecuária", 9: "Agropecuária",
    21: "Agropecuária", 22: "Área não vegetada", 23: "Área não vegetada",
    24: "Área não vegetada", 30: "Área não vegetada",
    75: "Área não vegetada", 91: "Área não vegetada",
    25: "Área não vegetada", 26: "Corpos D´água", 33: "Corpos D´água",
    31: "Corpos D´água", 27: "Não observado",
}

LULC_NIVEL_1_1 = {
    0: "Não observado", 1: "Formação Florestal", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Formação Florestal",
    6: "Formação Florestal", 7: "Formação Florestal", 49: "Formação Savânica",
    10: "Formação Campestre", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Campestre", 32: "Formação Campestre",
    29: "Outros", 50: "Formação Campestre", 13: "Formação Campestre",
    84: "Formação Campestre", 14: "Agropecuária", 15: "Pastagem",
    18: "Agricultura", 19: "Agricultura", 39: "Agricultura",
    20: "Agricultura", 40: "Agricultura", 62: "Agricultura",
    41: "Agricultura", 36: "Agricultura", 46: "Agricultura",
    47: "Agricultura", 35: "Agricultura", 48: "Agricultura",
    9: "Silvicultura", 21: "Mosaico de Usos", 22: "Outros", 23: "Outros",
    24: "Outros", 30: "Outros", 75: "Outros", 91: "Outros", 25: "Outros",
    26: "Outros", 33: "Outros", 31: "Outros", 27: "Não observado",
}

LULC_NIVEL_2 = {
    0: "Não observado", 1: "Floresta", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Mangue", 6: "Floresta Alagável",
    7: "Savana Alagada", 49: "Restinga Arbórea",
    10: "Vegetação Herbácea e Arbustiva", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Herbáceo Arbustiva",
    32: "Apicum", 29: "Afloramento Rochoso", 50: "Restinga herbácea",
    13: "Outras Formações não Florestais", 84: "Marisma",
    14: "Agropecuária", 15: "Pastagem", 18: "Agricultura",
    19: "Agricultura", 39: "Agricultura", 20: "Agricultura",
    40: "Agricultura", 62: "Agricultura", 41: "Agricultura",
    36: "Agricultura", 46: "Agricultura", 47: "Agricultura",
    35: "Agricultura", 48: "Agricultura", 9: "Silvicultura",
    21: "Mosaico de Usos", 22: "Área não vegetada", 23: "Praia, Duna e Areal",
    24: "Área Urbanizada", 30: "Mineração", 75: "Usina Fotovoltaica",
    91: "Energia Eólica", 25: "Outras Áreas não Vegetadas",
    26: "Corpos D´água", 33: "Rio, Lago e Oceano", 31: "Aquicultura",
    27: "Não observado",
}

LULC_NIVEL_3 = {
    0: "Não observado", 1: "Floresta", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Mangue", 6: "Floresta Alagável",
    7: "Savana Alagada", 49: "Restinga Arbórea",
    10: "Formação Natural não Florestal", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Herbáceo Arbustiva",
    32: "Apicum", 29: "Afloramento Rochoso", 50: "Restinga herbácea",
    13: "Outras Formações não Florestais", 84: "Marisma",
    14: "Agropecuária", 15: "Pastagem", 18: "Agricultura",
    19: "Lavoura Temporária", 39: "Lavoura Temporária", 20: "Lavoura Temporária",
    40: "Lavoura Temporária", 62: "Lavoura Temporária",
    41: "Lavoura Temporária", 36: "Lavoura Perene", 46: "Lavoura Perene",
    47: "Lavoura Perene", 35: "Lavoura Perene", 48: "Lavoura Perene",
    9: "Silvicultura", 21: "Mosaico de Usos", 22: "Área não vegetada",
    23: "Praia, Duna e Areal", 24: "Área Urbanizada", 30: "Mineração",
    75: "Usina Fotovoltaica", 91: "Energia Eólica",
    25: "Outras Áreas não Vegetadas", 26: "Corpos D´água",
    33: "Rio, Lago e Oceano", 31: "Aquicultura", 27: "Não observado",
}

LULC_NIVEL_4 = {
    0: "Não observado", 1: "Floresta", 3: "Formação Florestal",
    4: "Formação Savânica", 5: "Mangue", 6: "Floresta Alagável",
    7: "Savana Alagada", 49: "Restinga Arbórea",
    10: "Formação Natural não Florestal", 11: "Campo Alagado e Área Pantanosa",
    12: "Formação Campestre", 77: "Formação Herbáceo Arbustiva",
    32: "Apicum", 29: "Afloramento Rochoso", 50: "Restinga herbácea",
    13: "Outras Formações não Florestais", 84: "Marisma",
    14: "Agropecuária", 15: "Pastagem", 18: "Agricultura",
    19: "Lavoura Temporária", 39: "Soja", 20: "Cana", 40: "Arroz",
    62: "Algodão", 41: "Outras Lavouras Temporárias", 36: "Lavoura Perene",
    46: "Café", 47: "Citrus", 35: "Dendê", 48: "Outras Lavouras Perenes",
    9: "Silvicultura", 21: "Mosaico de Usos", 22: "Área não Vegetada",
    23: "Praia, Duna e Areal", 24: "Área Urbanizada", 30: "Mineração",
    75: "Usina Fotovoltaica", 91: "Energia Eólica",
    25: "Outras Áreas não Vegetadas", 26: "Corpos D´água",
    33: "Rio, Lago e Oceano", 31: "Aquicultura", 27: "Não observado",
}

# Códigos de lavoura com nome específico no nível 4 (n0 usará nível 4).
LAVOURA_N4_CODES = [19, 20, 35, 36, 39, 40, 41, 46, 47, 48, 62]


def _clamp(d: dict, code) -> str:
    try:
        return d[int(code)]
    except (KeyError, TypeError, ValueError):
        return f"Classe {int(code)}"


def n0_label(code) -> str:
    c = int(code)
    if c in LAVOURA_N4_CODES and c in LULC_NIVEL_4:
        return LULC_NIVEL_4[c]
    return _clamp(LULC_NIVEL_2, c)


def n1_of(code) -> str:
    return _clamp(LULC_NIVEL_1, code)


def n2_of(code) -> str:
    return _clamp(LULC_NIVEL_2, code)


def natureza_of(code) -> str:
    return _clamp(LULC_NIVEL_0, code)


def marcador_from_n1(n1: str) -> str:
    if n1 == "Floresta":
        return "florestal"
    if n1 == "Vegetação Herbácea e Arbustiva":
        return "campestre"
    return "outros"


def marcador_of(code) -> str:
    return marcador_from_n1(n1_of(code))


def info(code):
    n1 = n1_of(code)
    return {
        "n0": n0_label(code),
        "n1": n1,
        "n2": n2_of(code),
        "natureza": natureza_of(code),
        "marcador": marcador_from_n1(n1),
    }

print("[OK] 01_legends · legendas LULC C11 + def_sec carregadas")
