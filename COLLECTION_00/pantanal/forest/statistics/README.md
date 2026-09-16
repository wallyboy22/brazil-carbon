# Pantanal Forest — Estatísticas (módulo `require`)

Estatísticas de **AGC (agbd, t/ha)** por classe de uso e cobertura (MapBiomas
**Coleção 11**) para as versões V03–V08 da cadeia florestal, ano **2023**
(único ano previsto por todas as versões).

Esta pasta é uma **biblioteca `require`** — não roda sozinha. Cada versão
dispara suas estatísticas pelo próprio fluxo:

```
v0X/7_statistics.js  →  require('...:COLLECTION_00/pantanal/forest/statistics/stats_engine.js')
                         engine.runForVersion('v0X')      → CSV único da versão
                                                           (1 arquivo por versão)
```

> O **comparativo entre versões** (V03–V08) não é mais exportado no GEE: é
> montado **offline** no Colab (`statistics_gcn` → `build_compare_forest`) a
> partir dos `stats_forest_*_2023.csv` consolidados.

## Arquivos

| Arquivo | Papel |
|---|---|
| `0_contract_stats.js` | Contrato: versões, mosaicos, LULC, território, saída |
| `stats_engine.js` | Motor: `runForVersion(versionId)` + QA de somas |

A **legenda C11** é o módulo compartilhado
`COLLECTION_00/pantanal/module_lulc_legends.js` (n0/n1/n2 + marcador
florestal/campestre).

## Entradas (assets GEE)

- Mosaicos finais por versão: `<V0X>/PREDICTIONS/agc_pred_v0X_merged_2023`
  (banda `prediction_2023`; v07/v08 também `agbd_std_2023`).
- LULC: `.../collection11/mapbiomas_brazil_collection11_coverage_v3`, banda
  `classification_2023`.
- Bioma: `ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026`.

## Saídas (Drive → `MAPBIOMAS_CARBONO_ESTATISTICAS`)

- `stats_forest_<versão>_<território>_2023.csv` — **1 arquivo por versão**
  (sem particionamento), formato "gráfico-ready": **uma linha por COMBINAÇÃO
  (classe LULC × def_sec)**, colunas:

  `version,ano,territorio,classe,cobertura (n0..n4),Desmatamento e vegetação
  secundária,Área (ha),Estoque de carbono (t),Incerteza do estoque (t)`

  A estratificação def_sec é rotulada por extenso (ver `DEF_SEC_VEG_LEGEND`);
  `natureza`/`marcador` e as agregações (classe/marcador/total) são derivadas
  OFF-LINE no Colab (`por_classe`). QA de somas impresso pelo motor.
  O export usa `selectors` → **sem `.geometry`/`system:index`** no CSV.
- Comparativo entre versões: montado offline no Colab (ver `statistics_gcn`).

## Fórmulas

- área_ha = `pixelArea()/10000`
- estoque_t = `prediction_2023 (t/ha) × área_ha`
- incerteza_t (v07/v08, ensemble) = `√( Σ (agbd_std_2023 × área_ha)² )` por
  combinação (quadratura); versões sem banda `agbd_std` saem com incerteza `0`.

> Agregação por combinação `combo = lulc*10 + def_sec`: stack `[área_ha,
> estoque, w2, combo]` com `ee.Reducer.sum().repeat(3).group({groupField:3})`
> — a banda `combo` na última posição; o `sum` do `.repeat(3)` chega como lista
> e é normalizado pelo motor.

## Como rodar

1. Garanta que o mosaico `agc_pred_v0X_merged_2023` existe no Asset.
2. No Code Editor, abra a versão (`v0X/7_statistics.js`) ... Run (autoriza
   exportações).
3. (Opcional) detalhamento por UF: em `0_contract_stats.js`, preencha
   `UF_LIST` (ex. `['MS','MT']`), `UF_ASSET` e `UF_PROP`.

> A análise (consolidação, figuras, relatório) fica por conta do notebook
> `pantanal/statistics_gcn/`, que lê os CSVs desta etapa.