"""Utilidades compartilhadas do gate de calibração grassland v02 (2_3_gcn)."""
import json
import os

GATE = os.path.dirname(os.path.abspath(__file__))
MODEL_JSON = os.path.join(GATE, "biomass_model.json")

CLAMP = dict(min=0.3, max=12.0)  # suporte do modelo (clamp) — deve bater com o contrato


def save_model(coef, metrics, n):
    model = {
        "type": "fonseca_loglinear",
        "coefficients": {
            "intercept": float(coef["intercept"]),
            "red": float(coef["red"]),
            "swir1": float(coef["swir1"]),
            "swir2": float(coef["swir2"]),
        },
        "source": "campo_pantanal_v02",
        "n_parcelas": int(n),
        "metrics": {k: float(v) for k, v in metrics.items()},
        "clampMgHa": CLAMP,
    }
    with open(MODEL_JSON, "w", encoding="utf-8") as fh:
        json.dump(model, fh, ensure_ascii=False, indent=2)
    print("MODELO SALVO:", MODEL_JSON)
    print(json.dumps(model, ensure_ascii=False, indent=2))
    return model


def load_model():
    with open(MODEL_JSON, encoding="utf-8") as fh:
        return json.load(fh)