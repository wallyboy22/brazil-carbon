# Referência — TCN (3ª CN, versão MAPBIOMAS-CARBONO, `comAgua`, BR, ~109 m)

Família TCN de estoques de carbono (5 assets, todos `wgs84`, `comAgua` = inclui
área de água): AGC, BGC, DWC, LITTERC e TOTALC. Assets empacotados no projeto
`CCAL` para uso do MAPBIOMAS-CARBONO.

> **TCN = 3ª Comunicação Nacional do Brasil à UNFCCC (MCTI).** Parente direto do
> QCN (4ª CN): mesma estrutura de pools — TCN AGC/BGC/DWC/LITTERC/TOTALC ↔ QCN
> AGB/BGB/CDW/LITTER/TOTAL (ver ficha QCN).

## Dados (medidos no GEE)

| Asset | Variável | Escala | CRS | b1 med/max | valid |
|---|---|---|---|---|---|
| `.../TCN_AGC_comAgua_wgs84` | Carbono acima do solo | ~109 m | EPSG:4326 | 13.6 / 160 | 0.41 |
| `.../TCN_BGC_comAgua_wgs84` | Carbono abaixo do solo | ~109 m | EPSG:4326 | 15.5 / 45 | 0.41 |
| `.../TCN_DWC_comAgua_wgs84` | Madeira morta | ~109 m | EPSG:4326 | 0.28 / 22 | 0.37 |
| `.../TCN_LITTERC_comAgua_wgs84` | Serrapilheira | ~109 m | EPSG:4326 | 3.4 / 14 | 0.41 |
| `.../TCN_TOTALC_comAgua_wgs84` | Carbono total | ~109 m | EPSG:4326 | 39.9 / 225 | 0.41 |

- **Asset base:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/`
- **Cobertura:** bbox ~[-60.1, -24.7, -41.5, -2.3] (região centro-oeste/sudeste → Amazônia leste)
- **Consistência interna:** AGC+BGC+DWC+LITTER ≈ mediana do TOTALC (32.8 ≈ 39.9) →
  unidades coerentes (t C/ha presumido); `comAgua` indica inclusão de corpos d'água.

## Contexto científico

- Família de **estoques por pool de carbono** da 3ª Comunicação Nacional — base
  para emissões/remissões por classe de uso (referência da cadeia de LULUCF).
- Dados de apoio/limitações: `EBA.pdf` e `RR_4CN_LU_4_LULUCF_2021-01-27.pdf`
  (relatórios das Comunicações Nacionais) em `docs/Referências de mapeamento/`.

## Uso planejado

- Comparar **TOTALC (t C/ha)** com a soma dos nossos pools e com o **QCN/TOTAL**
  (mesma estrutura de pools, cross-check entre 3ª e 4ª CN); AGC vs
  `agc_pred_v07/v08` como referência de magnitude em ~109 m (até pantanal/cerrado).
- DWC/LITTERC/BGC dão contexto de outros pools para as tabelas-resumo
  (esquema padrão com "abaixo do solo (t)" quando aplicável).

## A confirmar

- Ano de referência (carbono pretérito, como o QCN?) e detalhes de `comAgua`;
  eventual divergência de domínio vs QCN (~78°L vs centro-oeste/sudeste).