# pantanal/grassland/v01 — Biomassa, ANPP e carbono

Primeira pipeline de campos/grassland do Pantanal. Aplica a decisão
metodológica do Pampa, adaptada ao Pantanal.

## Método v01

| Componente | Sensor/método |
|---|---|
| Biomassa seca | Landsat harmonizado L5/L7/L8/L9 |
| fPAR | MODIS MCD15A3H |
| Radiação DSR | MODIS MCD18A1 |
| ANPP | Monteith com eficiência εCA do Pampa |
| LULC | MapBiomas Coleção 11 |
| Ano inicial | 2023 |

O HLS não é usado nesta versão. O módulo sensor está isolado em
`0_sensor_landsat_modis`; uma futura implementação HLS deve preservar a mesma
interface pública.

## Classes e máscara

```text
Pantanal ∩ classification_2023 ∈ {11, 12, 50}
```

## Produtos

Os produtos são separados porque representam grandezas diferentes:

```text
biomass_annual_2023       → kg MS/ha
anpp_monthly_v01_2023     → kg MS/ha/mês
anpp_annual_v01_2023      → kg MS/ha/ano
carbon_stock_v01_2023     → Mg C/ha
```

ANPP é fluxo anual; estoque de carbono é quantidade armazenada. Eles não são
somados.

O estoque usa inicialmente:

```text
carbon_stock = biomass_dry_matter × 0.47 / 1000
```

A fração e os coeficientes do Pampa são hipóteses provisórias e precisam de
calibração específica do Pantanal antes de uma publicação definitiva.

## Execução

1. Execute `1_check_inputs`.
2. Execute `2_mask_grassland`.
3. Execute `3_biomass` e rode os exports.
4. Execute `4_anpp` e rode os exports.
5. Execute `5_carbon_products` após a biomassa concluir.
6. Execute `6_qa`.

O ano está concentrado em `0_contract` (`YEAR`/`YEARS`), facilitando a extensão
para uma série temporal posterior.
