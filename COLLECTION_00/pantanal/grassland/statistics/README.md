# Pantanal Grassland — Estatísticas (módulo `require`)

Estatísticas dos **produtos campestres v01 e v02** (biomassa, ANPP, carbono)
por classe de uso e cobertura (MapBiomas **Coleção 11**), ano **2023**.

Esta pasta é uma **biblioteca `require`** — não roda sozinha. A versão dispara
suas estatísticas pelo próprio fluxo:

```
grassland/v01/7_statistics.js  →  engine.runForVersion('v01')  → CSVs por produto
grassland/v02/7_statistics.js  →  engine.runForVersion('v02')  → CSVs por produto
                                  engine.compareAll()          → comparativo (v02)
```

Mesmo molde do módulo florestal (herdado de
`mapbiomas_solo/collection3/statistics`): área em ha via `pixelArea`,
valor = banda × área, agregação por `Reducer.group`, CSV no Drive.

## Arquivos

| Arquivo | Papel |
|---|---|
| `0_contract_stats.js` | Contrato: produtos v01/v02, unidades, LULC, território, saída |
| `stats_engine.js` | Motor: `runForVersion(versionId)` + `compareAll()` + QA de somas |

A **legenda C11** é o módulo compartilhado
`COLLECTION_00/pantanal/module_lulc_legends.js`.

## v01 × v02 — o que muda na estatística

- **v01**: produtos **mascarados para campos** — a redução só enxerga classes
  {11,12,50} (na prática).
- **v02**: produtos cobrem **TODO o bioma** (full-biome). A estatística agrega
  **todas** as classes LULC presentes (n0) e resume em **n1
  Floresta/Campestre/Outros** e marcador — cobrindo também as partes não
  campestres do Pantanal, conforme decisão da v02 (ver `v02/reflexao_v02.md`).

## Produtos (assets)

### v01 (em `PANTANAL_GRASSLAND/V01`)

| Produto | Asset | Banda | Unidade bruta | Conversão |
|---|---|---|---|---|
| biomassa | `BIOMASS/grassland_biomass_annual_v01_2023` | `biomass_annual` | kg MS/ha | ÷1000 → Mg MS |
| ANPP | `ANPP/grassland_anpp_annual_v01_2023` | `anpp_annual` | kg MS/ha/ano | ÷1000 → Mg MS/ano |
| carbono | `CARBON/grassland_carbon_stock_v01_2023` | `carbon_stock_MgC_ha` | Mg C/ha | ×1 |

### v02 (em `PANTANAL_GRASSLAND/V02`)

| Produto | Asset | Banda | Unidade bruta | Conversão |
|---|---|---|---|---|
| biomassa | `BIOMASS/grassland_biomass_annual_v02_2023` | `biomass_annual` | kg MS/ha | ÷1000 → Mg MS |
| ANPP | `ANPP/grassland_anpp_annual_v02_2023` | `anpp_annual` | kg MS/ha/ano | ÷1000 → Mg MS/ano |
| carbono | `CARBON/grassland_carbon_stock_v02_2023` | `carbon_stock_MgC_ha` | Mg C/ha | ×1 |

## Saídas (Drive → `MAPBIOMAS_CARBONO_ESTATISTICAS`)

- `stats_grassland_<versão>_<produto>_<território>_2023.csv` — colunas:

  `produto,versao,ano,territorio,nivel,grupo,classe,n0,n1,n2,marcador,area_ha,valor_Mg,unidade`

  com `nivel` ∈ `n0 | n1 | marcador | total`.
- `compare_grassland_produtos_v02_2023.csv` — total e por classe, na v02.

## Fórmulas

- área_ha = `pixelArea()/10000`
- valor_Mg = `banda (convertida a Mg/ha) × área_ha`

> Biomassa/ANPP não têm incerteza publicada → sem coluna de incerteza
> (diferente do módulo florestal, que carrega `±` do ensemble v07).

## Como rodar

1. Garanta que os assets dos produtos existem (3_biomass, 4_anpp,
   5_carbon_products da versão).
2. No Code Editor, abra `grassland/v0X/7_statistics.js` → Run (autoriza
   exportações). Espere `[FIM] versão ... completa.` no Console.
3. (Opcional) detalhamento por UF em `0_contract_stats.js` (`UF_LIST`).

> A análise (consolidação, figuras, relatório) fica por conta do notebook
> `pantanal/statistics_gcn/`, que lê os CSVs desta etapa.