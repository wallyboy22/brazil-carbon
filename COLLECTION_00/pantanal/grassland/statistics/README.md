# Pantanal Grassland — Estatísticas (módulo `require`)

Estatísticas dos **produtos campestres v01 e v02** (biomassa, ANPP, carbono)
por classe de uso e cobertura (MapBiomas **Coleção 11**), ano **2023**.

Esta pasta é uma **biblioteca `require`** — não roda sozinha. A versão dispara
suas estatísticas pelo próprio fluxo:

```
grassland/v01/7_statistics.js  →  engine.runForVersion('v01')  → CSV único por produto (v01)
grassland/v02/7_statistics.js  →  engine.runForVersion('v02')  → CSV único por produto (v02)
```

> O **comparativo de produtos** (referência: v02) não é mais exportado no GEE:
> é montado **offline** no Colab (`statistics_gcn` →
> `build_compare_grassland`) a partir dos `stats_grassland_*_2023.csv`
> consolidados.

## Arquivos

| Arquivo | Papel |
|---|---|
| `0_contract_stats.js` | Contrato: produtos v01/v02, unidades, LULC, território, saída |
| `stats_engine.js` | Motor: `runForVersion(versionId)` + QA de somas |

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
| biomassa | `BIOMASS/grassland_biomass_annual_v01_2023` | `biomass_annual` | kg MS/ha | ÷1000 → t MS |
| ANPP | `ANPP/grassland_anpp_annual_v01_2023` | `anpp_annual` | kg MS/ha/ano | ÷1000 → t MS/ano |
| carbono | `CARBON/grassland_carbon_stock_v01_2023` | `carbon_stock_MgC_ha` | t C/ha | ×1 |

### v02 (em `PANTANAL_GRASSLAND/V02`)

| Produto | Asset | Banda | Unidade bruta | Conversão |
|---|---|---|---|---|
| biomassa | `BIOMASS/grassland_biomass_annual_v02_2023` | `biomass_annual` | kg MS/ha | ÷1000 → t MS |
| ANPP | `ANPP/grassland_anpp_annual_v02_2023` | `anpp_annual` | kg MS/ha/ano | ÷1000 → t MS/ano |
| carbono | `CARBON/grassland_carbon_stock_v02_2023` | `carbon_stock_MgC_ha` | t C/ha | ×1 |

## Saídas (Drive → `MAPBIOMAS_CARBONO_ESTATISTICAS`)

- `stats_grassland_<versão>_<território>_2023.csv` — **principal/ANUAL**,
  formato "gráfico-ready": **uma linha por COMBINAÇÃO (classe LULC × def_sec)**,
  colunas:

  `produto,versao,ano,territorio,unidade,classe,cobertura (n0..n4),
  Desmatamento e vegetação secundária,Área (ha),Biomassa (t),Estoque de carbono (t)`

  (`produto` = `grassland` em todas as linhas).
- `stats_grassland_<versão>_biomassa_mensal_<território>_2023.csv` e
  `stats_grassland_<versão>_anpp_mensal_<território>_2023.csv` — **mensais
  LONGOS**, 1 linha por combinação × mês, com a coluna `período`
  (`YYYY_MM`, ex. `2023_01`) + `Área (ha)` e o valor do produto
  (`Biomassa (t)` / `ANPP (t MS/ano)`).
- A estratificação def_sec é rotulada por extenso (`DEF_SEC_VEG_LEGEND`);
  `natureza`/`marcador`/produto semântico e as agregações são derivadas
  OFF-LINE no Colab (`expand_grass_product`/`por_classe`). O export usa
  `selectors` → **sem `.geometry`/`system:index`** no CSV.
- Comparativo de produtos: montado offline no Colab (ver `statistics_gcn`).

## Fórmulas

- área_ha = `pixelArea()/10000`
- valor_t = `banda (convertida a t/ha) × área_ha`

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