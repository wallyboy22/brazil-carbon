# Padronização de nomes de bandas (recomendação)

> Recomendação de nomenclatura das **bandas** dos produtos (inglês, sem siglas e
> sem unidades) alinhada às **colunas** das estatísticas (português). Aplica-se
> às **próximas versões** (a partir da v08 no forest; futuras do grassland).
> O que já foi exportado permanece com os nomes legados (ver o fim do doc).

## Regra
- **Bandas em inglês**, sem unidades e sem siglas.
- Predição: `prediction_<YYYY>` · incerteza: `prediction_stdev_<YYYY>`.
- Séries mensais: sufixo `_<MM>` (ex.: `prediction_<YYYY>_01`).
- Colunas das estatísticas: `<Material> <compartimento> (<unidade>)`, com `*`
  quando a métrica é derivada **no estágio de estatística** (fora do algoritmo
  da versão). Métrica já presente em banda de entrada **não** leva `*`.

## Forest (AGB — above-ground biomass)
O alvo do modelo é `agbd` (biomassa acima do solo, Mg/ha). A predição é
**biomassa**; o carbono é derivado nas estatísticas (`× CARBON_FRACTION`).

| Coluna (estatística) | Banda recomendada |
|---|---|
| `v0X Biomassa acima do solo (t MS)` | `prediction_<YYYY>` |
| `v0X Carbono acima do solo (t C)*` | *(derivada no stats — sem banda)* |
| `v0X Incerteza (t MS)` | `prediction_stdev_<YYYY>` |
| `v0X Incerteza (t C)*` | *(derivada no stats — sem banda)* |

Renomeação de assets/modelos/matrizes (misnomer `agc` → `agb`):
- `agc_pred_v0X_*` → `agb_pred_v0X_*`
- `agc_pred_v0X_merged_<YYYY>` → `agb_pred_v0X_merged_<YYYY>`
- `agc_matrix_v0X_*` → `agb_matrix_v0X_*`
- `rf_agc_v0X_*` → `rf_agb_v0X_*`

## Grassland
| Coluna (estatística) | Banda recomendada |
|---|---|
| `Biomassa acima do solo (t MS)` | `aboveground_biomass_<YYYY>` (+ `_<MM>` mensal) |
| `Produtividade primária líquida acima do solo (t MS/ano)` | `aboveground_net_primary_productivity_<YYYY>` (+ `_<MM>` mensal) |
| `Carbono acima do solo (t C)` | `aboveground_carbon_<YYYY>` |
| *(elegibilidade)* | `carbon_eligibility` |

## Legado (mantido como está)
- **Forest v03–v07**: assets `agc_pred_*`; banda de incerteza `agbd_std_<YYYY>`.
- **Grassland v01–v02**: bandas `biomass_annual`, `biomass_<m>`, `anpp_annual`,
  `anpp_<m>`, `carbon_stock_MgC_ha`, `elig_carbon`.

## Mapeamento legado → recomendado (grassland)
| Legado | Recomendado |
|---|---|
| `biomass_annual` | `aboveground_biomass_<YYYY>` |
| `biomass_<m>` | `aboveground_biomass_<YYYY>_<MM>` |
| `anpp_annual` | `aboveground_net_primary_productivity_<YYYY>` |
| `anpp_<m>` | `aboveground_net_primary_productivity_<YYYY>_<MM>` |
| `carbon_stock_MgC_ha` | `aboveground_carbon_<YYYY>` |
| `elig_carbon` | `carbon_eligibility` |
