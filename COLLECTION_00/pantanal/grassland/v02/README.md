# pantanal/grassland/v02 — Biomassa, ANPP e carbono (todo o Pantanal)

Segunda versão da pipeline de campos do Pantanal. Herda a v01 (mesma interface
de sensor Landsat/MODIS) e implementa as decisões de `reflexao_v02.md`.

## O que muda vs v01

| Aspecto | v01 | v02 |
|---|---|---|
| Domínio dos produtos | máscara C11 {11,12,50} | **todo o Pantanal** (água permanente fora) |
| Modelo de biomassa | Fonseca herdado de Pampa | Fonseca **reestimado em parcelas de campo** (2_1 + gate `2_3_gcn`); enquanto não há fit → Pampa com **clamp [0.3, 12] Mg/ha** |
| Água | nada | **máscara de água permanente** (`getWaterMask`: C11=33 ou NDWI seco > 0,15) |
| fPAR QC | não | **Fpar_QC** (MODLAND_QC ≤ 1) via `USE_QC` |
| Estatística | só classes campestres | **bioma inteiro** (Floresta/Campestre/Outros via legendas C11) |
| Carbono | só AGC | AGC (`ROOT_SHOOT_K=0`) + **banda `elig_carbon` ativa** (estabilidade C11 em 2021–2023) |
| Infra | copy local | `ensureFolder`/`assetExists` em **`pantanal/module_infra.js`** (sem dependência do forest) |
| εCA | Pampa | Pampa (provisório) + **`2_5_eca_observada`** p/ substituir (diagnóstico B6) |
| fPAR sem dado | — | **`INTERP_MISSING_FPAR`** (gate): mês sem fPAR válido = média dos adjacentes (reflexão C11) |
| Cheia | nada | água permanente fixa + **`MASK_FLOOD`** (gate): NDWI mensal > 0,15 (reflexão C9) |

## Caso de uso

A predição é **treinada com dados próprios de campo** (parcelas com
`biomass_kg_ha`), mas roda sobre **todo o território do Pantanal** — a
estatística também olha essas partes (classes florestais e demais usos), não
somente as áreas amostradas.

## Método

| Componente | Sensor/método |
|---|---|
| Biomassa seca | Landsat harmonizado L5/L7/L8/L9 + Fonseca log-linear reestimado |
| fPAR | MODIS MCD15A3H (+ `Fpar_QC`) |
| Radiação DSR | MODIS MCD18A1 |
| ANPP | Monteith com εCA do Pampa (provisório; gate de modulação CWD) |
| LULC | MapBiomas Coleção 11 (rotula, não mascara) |
| Ano inicial | 2023 |

HLS não é usado nesta versão (série 2000–2023 só Landsat).

## Produtos

```text
PANTANAL_GRASSLAND/V02/
  BIOMASS/grassland_biomass_monthly_v02_2023      → kg MS/ha (12 bandas)
  BIOMASS/grassland_biomass_annual_v02_2023       → kg MS/ha
  ANPP/grassland_anpp_monthly_v02_2023            → kg MS/ha/mês
  ANPP/grassland_anpp_annual_v02_2023             → kg MS/ha/ano
  CARBON/grassland_carbon_stock_v02_2023          → Mg C/ha (AGC) + banda `elig_carbon` (C11 estável 2021–2023)
```

Estoque e fluxo são grandezas separadas e não são somados.

## Execução

1. `1_check_inputs` — entradas + máscaras (campestre C11 e água).
2. `2_mask_grassland` — análise de cobertura; confirma que a produção sai
   para todo o bioma.
3. `2_1_amostras_campo_toAsset` — amostra covariáveis nas parcelas e gera a
   **matriz de calibração** (asset + Drive).
4. `2_3_gcn/*` (offline) — diagnostica a matriz e ajusta o modelo
   (`biomass_model.json`); copiar coefficients para o contrato.
5. `2_5_eca_observada` — ε aparente mensal por classe (MOD17 GPP/ΣPARa);
   decide se a εCA do Pampa é substituída (reflexão B6).
6. `3_biomass`, `4_anpp`, `5_carbon_products` — produtos em todo o bioma.
7. `6_qa` — comparativo v01/v02, faixas, clamp, cobertura e `elig_carbon`.
8. `7_statistics` — CSVs por classe LULC em todo o bioma.

> Sem `FIELD.ASSET`, os steps seguem com os coeficientes provisórios do Pampa
> (clamp ativo) e avisam no console — a pipeline continua executável enquanto
> a calibração de campo não existe.