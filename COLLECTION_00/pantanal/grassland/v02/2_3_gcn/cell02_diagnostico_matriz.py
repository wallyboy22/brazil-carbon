"""Cell 02 — Diagnóstico da MATRIZ DE CAMPO (saída do 2_1_amostras_campo_toAsset).

Carrega o CSV exportado no Drive (pasta MAPBIOMAS_CARBONO_CAMPO,
matriz_campo_<ano>.csv) e confere distribuições antes de ajustar o modelo.

Critérios de saída desta fase:
  · n ≥ 30 parcelas úteis (aceitável 20–30 só para calibração provisória);
  · biomassa com faixa plausível (0.1–15 kg/ha ?) e > 20% de espectro de valores;
  · nenhuma banda de reflectância inteiramente constante (indicaria join ruim);
  · estratos representados: secos × úmidos/aluviais.
"""
import os

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from cell00_util import GATE

CSV = os.path.join(GATE, "matriz_campo.csv")

if not os.path.exists(CSV):
    print("Coloque o CSV da matriz (Drive: MAPBIOMAS_CARBONO_CAMPO) em:")
    print(" ", CSV)
    raise SystemExit(1)

df = pd.read_csv(CSV)
B = "biomass_kg_ha"
bands = ["red_mean", "green_mean", "nir_mean", "swir1_mean", "swir2_mean",
         "ndvi_mean", "ndwi_mean"]
df = df[df[B] > 0].dropna(subset=[B] + bands).reset_index(drop=True)

print(f"N parcelas úteis: {len(df)}")
print(df[[B, "swir1_mean", "ndvi_mean", "ndwi_mean"]].describe().round(3).to_string())
print("\n% >0.1 e % >10:", (df[B] > 0.1).mean().round(3),
      (df[B] > 10).mean().round(3))
print("Faixa biomass (kg/ha):", df[B].min(), "-", df[B].max())

fig, axes = plt.subplots(1, 2, figsize=(11, 4))
axes[0].hist(np.log10(df[B]), bins=30, color="#2c7fb8")
axes[0].set_title("log10(biomassa_kg_ha)")
axes[1].scatter(df["ndwi_mean"], df[B], s=12, color="#31a354", alpha=0.7)
axes[1].set_title("NDWI médio × biomassa (estrato úmido)")
axes[1].set_xlabel("ndwi_mean")
fig.tight_layout()
fig.savefig(os.path.join(GATE, "fig_diagnostico_matriz.png"), dpi=150)
print("Figura:", os.path.join(GATE, "fig_diagnostico_matriz.png"))