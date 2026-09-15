# MODIS MOD17A2H — Gross Primary Productivity (8 dias)

Produtividade primária bruta (GPP), composição de 8 dias — usada para estimar a
eficiência de uso da radiação (εCA) observada.

## Dados

- **Asset GEE:** `MODIS/061/MOD17A2H`
- **Produtor:** NASA LP DAAC
- **Versão:** Collection 6.1 (`061`)
- **Disponibilidade:** 2001–presente
- **Link oficial:** https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD17A2H

## Uso no projeto

- **Papel:** estimar a eficiência de uso da radiação (εCA) por classe/território.
- **Banda:** `Gpp` (kg C/m² por período · escala `×0.0001`).
- **Onde entra:** `grassland/v02/2_5_eca_observada.js` —
  `ε_aparente (gC/MJ) = Σ GPP_MOD17 / Σ PARa`, mensal e por classe.

## Notas do projeto

- O MOD17 é tratado como **tendência, não verdade** (assinatura própria do
  produto) — decisão registrada na reflexão B6.
- Destina-se a substituir, quando validado, a εCA provisória do Pampa.