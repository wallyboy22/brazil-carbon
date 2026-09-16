# Referência — QCN (4ª Comunicação Nacional, BR, 30 m)

QCN = **4ª Comunicação Nacional do Brasil à UNFCCC** (MCTI). Estoque de carbono
pretérito por pool IPCC (TOTAL/AGB/BGB/CDW/LITTER), em t/ha. Dois assets em
`projects/ee-ipam/assets/CCAL/public/qcn/`:

- `qcn_brazil_historical_biomass_carbon_v1` — mapa da **4ª CN** (original).
- `qcn_brazil_historical_biomass_carbon_qcn_rect_v1` — **retificação IPAM** para
  compatibilizar o grid/ano-base da QCN com o **MapBiomas 1985** (mesmo bbox,
  valores levemente ajustados).

## Dados (medidos no GEE)

Ambos: IMAGE 30 m · EPSG:4326 · bbox Brasil (~[-73.98, -33.81, -28.85, 5.29]) ·
sem properties de tempo/descrição · valid ~0.38.

### `qcn_brazil_historical_biomass_carbon_v1` (4ª CN)

| Banda | Mín | Mediana | Máx | stdDev |
|---|---|---|---|---|
| TOTAL | 0.06 | **94.1** | 674 | 61.5 |
| AGB | 0.36 | 67.5 | 223 | 47.5 |
| BGB | 0.01 | 19.0 | 465 | 15.9 |
| CDW | 0.001 | 4.19 | 22.2 | 4.2 |
| LITTER | 0.001 | 3.72 | 64.7 | 2.1 |

### `qcn_brazil_historical_biomass_carbon_qcn_rect_v1` (retificação IPAM)

| Banda | Mín | Mediana | Máx | stdDev |
|---|---|---|---|---|
| TOTAL | 0.0 | **98.8** | 657 | 64.8 |
| AGB | 0.18 | 71.7 | 237 | 50.0 |
| BGB | 0.0 | 17.5 | 493 | 15.6 |
| CDW | 0.001 | 4.28 | 22.3 | 4.5 |
| LITTER | 0.0 | 3.71 | 66.6 | 2.3 |

## Contexto

- **Ano/carbono de referência: pretérito** — baseline anterior às grandes
  conversões de uso e cobertura da terra (Estado "histórico" pré-explotacao),
  não um ano corrente.
- `qcn_rect` adapta esse baseline para o grid/ano-base **MapBiomas 1985**.
- Mesma estrutura de pools da **TCN** (3ª Comunicação Nacional): TCN
  AGC/BGC/DWC/LITTERC/TOTALC ↔ QCN AGB/BGB/CDW/LITTER/TOTAL — boa base de
  cross-check entre as duas comunicações nacionais.
- Consistentes internamente: TOTAL ≈ AGB+BGB+CDW+LITTER (v1: 94.4 ≈ 94.1;
  rect: ~97 ≈ 98.8).

## Uso planejado

- Confronto direto com `TCN_*` (~109 m) e com nossos estoques (30 m): magnitude
  e distribuição de AGB/C por pool em escala Brasil.
- `qcn_rect` é o candidato preferencial para comparar com séries iniciadas em
  1985 (MapBiomas), pois já está compatibilizado.

## A confirmar

- Ano-base exato do carbono pretérito e metodologia da 4ª CN (relatório LULUCF:
  `RR_4CN_LU_4_LULUCF_2021-01-27.pdf`); eventuais diferenças v1 vs rect (CRS,
  máscara de água/área de conversão).