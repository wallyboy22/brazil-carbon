# Pantanal Grassland — Estatísticas (módulo `require`)

Estatísticas dos **produtos campestres v01** (biomassa, ANPP, carbono) por
classe de uso e cobertura (MapBiomas **Coleção 11**), ano **2023**.

Esta pasta é uma **biblioteca `require`** — não roda sozinha. A versão dispara
suas estatísticas pelo próprio fluxo:

```
grassland/v01/7_statistics.js  →  require('...:COLLECTION_00/pantanal/grassland/statistics/stats_engine.js')
                                    engine.runForVersion('v01')  → CSVs por produto
                                    engine.compareAll()          → comparativo produtos
```

Mesmo molde do módulo florestal (herdado de
`mapbiomas_solo/collection3/statistics`): área em ha via `pixelArea`,
valor = banda × área, agregação por `Reducer.group`, CSV no Drive.

## Arquivos

| Arquivo | Papel |
|---|---|
| `0_contract_stats.js` | Contrato: produtos, unidades, LULC, território, saída |
| `stats_engine.js` | Motor: `runForVersion(versionId)` + `compareAll()` + QA de somas |
| `README.md` | Este documento |

A **legenda C11** é o módulo compartilhado
`COLLECTION_00/pantanal/module_lulc_legends.js` (marcador campestre das
classes 11/12/50).

## Produtos (assets v01, 2023)

| Produto | Asset (em `PANTANAL_GRASSLAND/V01`) | Banda | Unidade bruta | Conversão |
|---|---|---|---|---|
| biomassa | `BIOMASS/grassland_biomass_annual_v01_2023` | `biomass_annual` | kg MS/ha | ÷1000 → Mg MS |
| ANPP | `ANPP/grassland_anpp_annual_v01_2023` | `anpp_annual` | kg MS/ha/ano | ÷1000 → Mg MS/ano |
| carbono | `CARBON/grassland_carbon_stock_v01_2023` | `carbon_stock_MgC_ha` | Mg C/ha | ×1 |

## Saídas (Drive → `MAPBIOMAS_CARBONO_ESTATISTICAS`)

- `stats_grassland_<produto>_<território>_2023.csv` — colunas:

  `produto,ano,territorio,nivel,grupo,classe,n0,n1,n2,marcador,area_ha,valor_Mg,unidade`

  com `nivel` ∈ `n0 | n1 | marcador | total`.
- `compare_grassland_produtos_2023.csv` — total e por classe, por produto.

## Fórmulas

- área_ha = `pixelArea()/10000`
- valor_Mg = `banda (convertida a Mg/ha) × área_ha`

> Biomassa/ANPP não têm incerteza publicada → sem coluna de incerteza
> (diferente do módulo florestal, que carrega `±` do ensemble v07).

## Como rodar

1. Garanta que os assets dos produtos existem (etapas 3_biomass, 4_anpp,
   5_carbon_products da v01).
2. No Code Editor, abra `grassland/v01/7_statistics.js` ... Run (autoriza
   exportações).
3. (Opcional) detalhamento por UF em `0_contract_stats.js` (`UF_LIST`).

> A análise (consolidação, figuras, relatório) fica por conta do notebook
> `pantanal/statistics_gcn/`, que lê os CSVs desta etapa.