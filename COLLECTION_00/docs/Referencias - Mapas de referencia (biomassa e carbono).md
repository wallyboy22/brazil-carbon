# Referências — Mapas de referência de biomassa/carbono (validação)

Benchmarks publicados de biomassa/carbono usados para calibrar ou validar os
produtos do projeto — **17 assets** em `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/`.
Inclui também o **QCN** (4ª Comunicação Nacional + retificação IPAM), em
`CCAL/public/qcn/` (seção própria ao final).

## Catálogo de assets (17)

Valores medidos via `diag_reference_assets.py` (banda `b1`, regra ~adaptada à
escala nativa). `med/max` = mediana/máximo no domínio do asset (Pantanal no
caso de asset global).

| Asset | Grupo | Variável | Tipo | Escala | CRS | b1 med/max | Unidade provável | Ficha |
|---|---|---|---|---|---|---|---|---|
| `Avitabile_AGB_Map` | Avitabile | AGB pan-tropical | IMAGE | ~928 m | 4326 | 279 / 378 | t/ha | [ficha](Referencia%20-%20Avitabile%202016%20%28pan-tropical%29.md) |
| `Avitabile_AGB_Map_Mode_K_2_2` | Avitabile | AGB mode K (série p/ biomas BR) | IMAGE_COLLECTION | ~1 km | 4326 | 111 / 501 (`total_1985`) | t/ha | [ficha](Referencia%20-%20Avitabile%202016%20%28pan-tropical%29.md) |
| `Avitabile_Carbon_AGB_Cerr` | Avitabile | AGB→C Cerrado | IMAGE | ~928 m | 4326 | 17 / 435 | t C/ha | [ficha](Referencia%20-%20Avitabile%202016%20%28pan-tropical%29.md) |
| `Avitabile_Carbon_AGB_amaz` | Avitabile | AGB→C Amazônia | IMAGE | ~928 m | 4326 | 231 / 505 | t C/ha | [ficha](Referencia%20-%20Avitabile%202016%20%28pan-tropical%29.md) |
| `Saatchi_2011_america_agb_1km` | Saatchi 2011 | AGB | IMAGE | ~928 m | 4326 | 43 / 443 | t/ha | [ficha](Referencia%20-%20Saatchi%202011%20%28Americas%2C%201km%29.md) |
| `Saatchi_2011_america_bgb_1km` | Saatchi 2011 | BGB | IMAGE | ~928 m | 4326 | 14 / 111 | t/ha | [ficha](Referencia%20-%20Saatchi%202011%20%28Americas%2C%201km%29.md) |
| `Saatchi_2011_america_carbon_1km` | Saatchi 2011 | Carbono (AGC) | IMAGE | ~928 m | 4326 | 29 / 277 | t C/ha | [ficha](Referencia%20-%20Saatchi%202011%20%28Americas%2C%201km%29.md) |
| `Saatchi_2011_america_carbon_error_1km` | Saatchi 2011 | Erro do carbono | IMAGE | ~928 m | 4326 | 20 / 57 | t C/ha (erro) | [ficha](Referencia%20-%20Saatchi%202011%20%28Americas%2C%201km%29.md) |
| `Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2` | Xu & Saatchi 2021 | Série 2000–2019 (20 bandas) | IMAGE | ~11.1 km (0.1°) | 4326 | 17 / 121 (Pantanal) | AGB/C (a conf.) | [ficha](Referencia%20-%20Xu%20Saatchi%202021%20%28tropical%2C%202000-2019%29.md) |
| `TCN_AGC_comAgua_wgs84` | TCN | AGC (acima do solo, com água) | IMAGE | ~109 m | 4326 | 14 / 160 | t C/ha | [ficha](Referencia%20-%20TCN%20%283a%20CN%2C%20MAPBIOMAS-CARBONO%2C%20comAgua%2C%20BR%29.md) |
| `TCN_BGC_comAgua_wgs84` | TCN | BGC (abaixo do solo) | IMAGE | ~109 m | 4326 | 15 / 45 | t C/ha | [ficha](Referencia%20-%20TCN%20%283a%20CN%2C%20MAPBIOMAS-CARBONO%2C%20comAgua%2C%20BR%29.md) |
| `TCN_DWC_comAgua_wgs84` | TCN | DWC (madeira morta) | IMAGE | ~109 m | 4326 | 0.3 / 22 | t C/ha | [ficha](Referencia%20-%20TCN%20%283a%20CN%2C%20MAPBIOMAS-CARBONO%2C%20comAgua%2C%20BR%29.md) |
| `TCN_LITTERC_comAgua_wgs84` | TCN | LITTERC (serrapilheira) | IMAGE | ~109 m | 4326 | 3.4 / 14 | t C/ha | [ficha](Referencia%20-%20TCN%20%283a%20CN%2C%20MAPBIOMAS-CARBONO%2C%20comAgua%2C%20BR%29.md) |
| `TCN_TOTALC_comAgua_wgs84` | TCN | TOTALC (soma) | IMAGE | ~109 m | 4326 | 40 / 225 | t C/ha | [ficha](Referencia%20-%20TCN%20%283a%20CN%2C%20MAPBIOMAS-CARBONO%2C%20comAgua%2C%20BR%29.md) |
| `Z_baccini_30_agb` | Baccini | AGB | IMAGE | ~27.8 m | 4326 | 76 / 255 | t/ha (a conf.*) | [ficha](Referencia%20-%20Baccini%202012%20%28tropical%2C%2030m%29.md) |
| `Zimbres_2021_AGB_NVmasked_RF_cog-v1` | Zimbres | AGB Cerrado (NV) | IMAGE | ~30 m | 4326 | 49 / 162 | t/ha (a conf.) | [ficha](Referencia%20-%20Zimbres%202021%20%28Cerrado%2C%2030m%29.md) |
| `fund_amz_sem_quil_para_v02` | misc | Amazônia `sem quila` → v02 | IMAGE | ~31.9 m | (sem EPSG) | 125 / 700 | a definir | [ficha](Referencia%20-%20fund_amz%20%28amazonia%20v02%29.md) |

\* `Z_baccini_30_agb`: máx. exatamente **255** → armazenamento em byte (teto de 8 bits); unidade exata
(AGB t/ha vs carbono) a confirmar nas fontes disponíveis em `docs/Referências de mapeamento/` (Baccini 2012/2017).

## QCN — 4ª Comunicação Nacional (MCTI) + retificação IPAM

Produto interno em `projects/ee-ipam/assets/CCAL/public/qcn/` (fora do
`Biomass_ref_maps`). Mesma estrutura de pools IPCC da TCN (3ª CN): TOTAL/AGB/
BGB/CDW/LITTER. **Ano de referência = carbono pretérito** (baseline anterior às
grandes conversões de uso/cobertura).

| Asset | Origem | Escala | CRS | b1 (TOTAL) med/max | Unidade | Ficha |
|---|---|---|---|---|---|---|
| `qcn_brazil_historical_biomass_carbon_v1` | 4ª CN (MCTI) | 30 m | 4326 | 94 / 674 | t/ha (C) | [ficha](Referencia%20-%20QCN%20%284a%20Comunicacao%20Nacional%2C%20BR%2C%2030m%29.md) |
| `qcn_brazil_historical_biomass_carbon_qcn_rect_v1` | retificação IPAM → MapBiomas 1985 | 30 m | 4326 | 99 / 657 | t/ha (C) | [ficha](Referencia%20-%20QCN%20%284a%20Comunicacao%20Nacional%2C%20BR%2C%2030m%29.md) |

`qcn_rect` compatibiliza o grid/ano-base da QCN com o **MapBiomas 1985**.

## Notas de leitura GEE

- Nenhum asset tem `system:time_start`/descrição — **ano-base vem do nome/paper**, não do metadata.
- Bandas genéricas `b1` (exceto Xu `b1..b20` e collection `total_YYYY`): sem descrição/unidade no asset.
- `Avitabile_AGB_Map_Mode_K_2_2` = collection com **12 imagens** (6 biomas BR × v1/v2), banda `total_1985` +
  série `total_YYYY`; sem `system:time_start`.
- Xu 2021: banda→ano/variável ainda **não mapeado** (20 bandas, `cd`/`ab` prováveis) — ver `xu_saatchi2021.pdf`.
- `Avitabile_AGB_Map` traz sentinel 2 `-3.4e38` sem máscara (tratada por `> -1e30` no diag); valid fraction
  não confiável nesse bbox largo.
- `TCN_*` = **3ª Comunicação Nacional** e `qcn_*` = **4ª Comunicação Nacional**
  (MCTI/UNFCCC); `qcn_rect_v1` = retificação IPAM para compatibilizar com o
  **MapBiomas 1985**. Mesma estrutura de pools IPCC — carbono de referência
  pretérito (pré grandes conversões de uso/cobertura).
- `fund_amz...`: imagens com valor 1–700 (med ~125) — modelagem de campo de biomassa/domínio; significado
  do nome (`sem_quil` = sem quilombolas?) a confirmar com a equipe.

## Tabela (papers)

| Paper | Ano | Cobertura | Papel no projeto |
|---|---|---|---|
| Saatchi et al., PNAS | 2011 | Trópicos (3 continentes) | benchmark de carbono florestal (AGB/BGB/C/erro) |
| Baccini et al., Science | 2012 | Trópicos | mapas de densidade de carbono / emissões por desmatamento |
| Avitabile et al., Global Change Biology | 2016 | Pan-tropical | mapa integrado de biomassa (múltiplas referências) |
| Zimbres et al., Forest Ecology and Management | 2021 | Cerrado (BR) | biomassa lenhosa acima do solo — vegetação nativa do Cerrado |
| Xu & Saatchi, 2021 | 2021 | Tropicais | série 2000–2019 — **paper a confirmar** (`xu_saatchi2021.pdf`) |
| TCN (3ª Comunicação Nacional, MCTI) | 3ª CN | BR | AGC/BGC/DWC/LITTERC/TOTALC (~109 m, `comAgua`) |
| QCN (4ª Comunicação Nacional, MCTI) + retificação IPAM | 4ª CN | BR | TOTAL/AGB/BGB/CDW/LITTER (30 m; `qcn_rect_v1` → MapBiomas 1985) |

## Citações completas

1. **Saatchi, S. S.; Harris, N. L.; Brown, S.; Lefsky, M.; Mitchard, E. T. A.; Salas, W.; Zutta, B. R.; Buermann, W.; Lewis, S. L.; Hagen, S.; Petrova, S.; White, L.; Silman, M.; Morel, A.** Benchmark map of forest carbon stocks in tropical regions across three continents. *Proceedings of the National Academy of Sciences*, v. 108, n. 24, p. 9899–9904, 2011. https://doi.org/10.1073/pnas.1019576108

2. **Baccini, A.; Goetz, S. J.; Walker, W. S.; Laporte, N. T.; Sun, M.; Sulla-Menashe, D.; Hackler, J.; Beck, P. S. A.; Dubayah, R.; Friedl, M. A.; Samanta, S.; Houghton, R. A.** Estimated carbon dioxide emissions from tropical deforestation improved by carbon-density maps. *Science*, v. 338, n. 6110, p. 84–87, 2012. https://doi.org/10.1126/science.1227962 (espelho: https://www.researchgate.net/publication/230720042)

3. **Avitabile, V.; Herold, M.; et al.** An integrated pan-tropical biomass map using multiple reference datasets. *Global Change Biology*, v. 22, n. 4, p. 1406–1420, 2016. https://doi.org/10.1111/gcb.13139

4. **Zimbres, B.; Rodríguez-Veiga, P.; Shimbo, J. Z.; Bispo, P. C.; Balzter, H.; Bustamante, M.; Roitman, I.; Haidar, R.; Miranda, S.; Gomes, L.; et al.** Mapping the stock and spatial distribution of aboveground woody biomass in the native vegetation of the Brazilian Cerrado biome. *Forest Ecology and Management*, v. 499, art. 119615, 2021. https://doi.org/10.1016/j.foreco.2021.119615 (Repository Manchester: https://research.manchester.ac.uk/en/publications/mapping-the-stock-and-spatial-distribution-of-aboveground-woody-b/)

## PDFs de apoio

`docs/Referências de mapeamento/`: Saatchi 2011 · Avitabile 2016 · Baccini 2012 · baccini2017 · Zimbres 2021 ·
xu_saatchi2021 · EBA · RR_4CN_LU_4_LULUCF_2021-01-27.