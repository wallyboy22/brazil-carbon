# ATBD v08 — Pantanal Forest · Densidade de biomassa acima do solo (AGBD)

> Algorithm Theoretical Basis Document — versão inicial e concisa.
> Cadeia: MAPBIOMAS-CARBONO · COLLECTION_00 · pantanal/forest · v08.

---

## 1. Identificação e escopo

| Item | Valor |
|---|---|
| Produto | Densidade de biomassa acima do solo (AGBD); o carbono acima do solo é derivado no estágio de estatística |
| Alvo do modelo | `agbd` (t/ha) |
| Domínio / ano | Bacia do Alto Paraguai (BAP = Pantanal + Planalto) / 2023 (`YEAR=2023`, `YEARS=[2023]`) |
| Resolução / projeção | 30 m / EPSG:4326 (export) |
| Versão | v08 — sub-versões por fonte: `V08_GEDI` e `V08_IFN` |
| Raiz de assets | `.../PANTANAL_FOREST/V08_GEDI` · `.../PANTANAL_FOREST/V08_IFN` |
| Fontes de amostra | `SOURCE ∈ {gedi, ifn}` — GEDI L4A v2.1 (footprints BAP) · IFN `IFN_2026_BR_PLOTS-v13` |
| Delta vs v07 | Domínio BAP (substitui o bioma Pantanal) + multi-fonte (GEDI/IFN); PALSAR global por mediana; filtro de treino (floresta + notNull) no `2_2`; champion re-avaliado no gate v08 (`minLeafPopulation` por fonte) |

Fonte: `v08/0_contract.js`.

## 2. Motivação e histórico

- **v00→v03**: cadeia tipada base (36 bandas de covariáveis) com modelo RF global.
- **v04**: covariáveis congeladas em cache (incluindo o PALSAR amostrado por célula).
- **v05–v07**: recomputação ao vivo; introdução de regularização (`minLeafPopulation`),
  ensemble de predições N=5, máscara LULC aplicada **apenas no treino** e gate offline
  (Google Colab / `2_3_gcn`).
- **Sintoma pós-v07**: excesso localizado de carbono com `agbd_std` alto, em platôs
  alinhados à grade de células (marcas de chunk).
- **Hipótese confirmada** (`v08/0_diagnose_tiles.js`):
  `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH` filtrado pelo AOI da célula e combinado com
  `.first()` escolhe uma *strip* SAR arbitrária por célula → platôs de `HV_db`/`HH_db`
  alinhados à grade, ampliados pelo `focal_mean(3)`.
- **Correção v08**: PALSAR reconstruído como **mosaico global determinístico por
  mediana**; `DN <= 0` mascarado como nodata. O filtro de treino passou a ser
  feito no `2_2` (por célula), eliminando a máscara de imagem `palsar_nodata`.

## 3. Base teórica

### 3.1 Rótulo observado — GEDI L4A v2.1 (fonte `gedi`)

- Fonte: `LARSE/GEDI/GEDI04_A_002`; pegadas de laser de ~25 m espaçadas ~60 m ao
  longo da trilha.
- Propriedades carregadas na matriz (fonte `gedi` → `SOURCE_CFG.sampleProps`):
  `agbd`, `agbd_se`, `pft_class`, `shot_number`, `lon_lowestmode`, `lat_lowestmode`.
- `agbd_se` é preservado para o peso `w = 1/agbd_se²` (recomendação A4 da consulta v07);
  a API de treino do GEE atual não aceita `weightProperty`, então a coluna fica
  disponível para uso offline.
- O alvo é **biomassa** (`agbd`); a conversão para carbono ocorre na estatística.

### 3.1b Rótulo observado — IFN (fonte `ifn`)

- Fonte: `projects/ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13` (parcelas de campo).
- Na BAP: 1.040 parcelas (759 com `AGB_Mg_ha > 0`; 560 em floresta C11).
- Normalização: `AGB_Mg_ha` (t/ha) → `agbd`; geometria reduzida ao **centroide**;
  sem `agbd_se` (peso `w = 1`).
- Atenção ao *support mismatch* (parcela × pixel 30 m) — ver consulta v07, B10.

### 3.2 Modelo — Random Forest

- `ee.Classifier.smileRandomForest`, modo `REGRESSION`, `numberOfTrees = 300`.
- Regularização: `minLeafPopulation` **por fonte** (champion do gate v08):
  GEDI 5 · IFN 10, `variablesPerSplit = 6` (~sqrt(36)).
- Alvo **linear** (sem log-target): `classify` devolve AGBD (t/ha) direto.
- `bagFraction = 0.8` (~80% das linhas por árvore, via bootstrap).

### 3.3 Ensemble de predições

- N = 5 membros; `SEED_BASE = 2021` (`seed = 2021 + i`).
- Cada membro usa ~80% das bandas (`BAND_FRACTION = 0.8`), selecionadas por hash
  determinístico `hashString(banda + '::' + i)` (`covariate/_ensemble.js`).
- Agregação entre membros: **mediana** (`prediction_<ano>`) e **desvio padrão**
  (`agbd_std_<ano>`).
- Há **um modelo global único por membro** (não um modelo por célula): a matriz de
  treino agrega todas as células.

### 3.4 Covariáveis (36 bandas)

| Grupo | Bandas | Derivação |
|---|---|---|
| HLS (24) | NDVI/EVI/NDMI/BAI/SAVI/BSI × P10/P50/P90/AMP | Compósito anual por percentis sobre `NASA/HLS/HLSL30/v002` + `HLSS30/v002`, máscara Fmask |
| PALSAR-2 (4) | `HH_db`, `HV_db`, `HV_HH_ratio`, `RVI` | v08: mediana global das observações válidas; dB (`pow²·log10·10−83`); speckle `focal_mean(3)` |
| HAND (2) | `HAND_m`, `geomorph_class` | `users/gena/global-hand/hand-100`; classes 1–4 por limiares 5/15/45 m |
| ERA5/CWD (5) | `CWD_current`, `CWD_clim`, `CWD_3yr`, `Tmean_C`, `Prec_mm` | `ECMWF/ERA5_LAND/MONTHLY_AGGR`; CWD = Σ max(ETP−P, 0) |
| MapBiomas C11 (1) | `mapbiomas_lulc` | `classification_<ano>` da coverage C11 v3 |

## 4. Dados de entrada

- **Amostras**: dependem de `SOURCE` (ver `0_contract.js` → `SOURCES`):
  - `gedi` — footprints GEDI L4A v2.1 sobre a BAP (`V08_GEDI/SAMPLES/gedi_footprint_bap_<ano>`,
    gerados por `2_0_gedi_export_footprint.js`, multi-ano 2019–2024);
  - `ifn` — parcelas `IFN_2026_BR_PLOTS-v13` na BAP (floresta, centroide).
- **Filtro de treino**, aplicado no `2_2` por célula:
  - floresta — `mapbiomas_lulc ∈ {3,4,6,7,49}`;
  - válidos — `notNull(FEATURE_BANDS)` (descarta nodata do PALSAR etc.).
  - Não é aplicado à saída da predição.
- **Peso do rótulo**: coluna `w = 1/max(agbd_se, 1)²` (fonte `gedi`; `w = 1` na `ifn`).

## 5. Algoritmo (passo a passo)

| Passo | Arquivo | Função |
|---|---|---|
| 0 | `0_contract.js` · `0_covariate_source.js` | Contrato (bandas, grade, domínio BAP, fonte, champion) + PALSAR global (`buildPalsarGlobal`) |
| 1 | `1_check.js` | Diagnóstico único: fonte/domínio, contagem de footprints, floresta C11 + stack (célula-amostra) |
| 2 | `2_0_gedi_export_footprint.js` | (só `gedi`) footprints GEDI L4A sobre a BAP → `V08_GEDI/SAMPLES/gedi_footprint_bap_<ANO>` |
| 2 | `2_0_ifn_export_footprint.js` | (só `ifn`) parcelas IFN normalizadas (centroide + `agbd`) → `V08_IFN/SAMPLES/ifn_footprint_<ANO>` |
| 2 | `2_1_gedi_toAsset_samples_treino.js` · `2_1_ifn_toAsset_samples_treino.js` | Amostras normalizadas por fonte (1 task por recorte) → `SAMPLES/forest_footprint_<SOURCE>_<ANO>_<cell>` |
| 2 | `2_2_gedi_toDrive_matrix.js` · `2_2_ifn_toDrive_matrix.js` | Matriz por fonte/célula × ano (filtro floresta + notNull) → ASSET + Drive CSV (`lon`, `lat`, `w`) |
| 2 | `2_3_gcn/*` | Gate offline (Colab): diagnóstico, CV espacial, thinning (validação), champion |
| 3 | `3_0_model_training.js` | Ensemble RF global (champion por fonte: minLeaf GEDI 5 · IFN 10) → `MODELS/rf_agb_v08_m1..m5` |
| 4 | `4_0_spatial_prediction.js` | Ensemble global (grade de saída comum, sem costura) → `PREDICTIONS/COL` (mediana + std) |
| 5 | `5_0_quality.js` | QA visual v03–v08 |

**Notas de arquitetura**
- A grade é `CELL_SPLIT = 4` (até ~256 células por `makeCellDefinitions`).
- A extração de covariáveis por célula (`sampleRegions`) é uma **partição espacial
  determinística** do mesmo conjunto global de pontos — não há sorteio por chunk.
- O PALSAR global (`buildPalsarGlobal`) é injetado em todas as células; as demais
  covariáveis (HLS, HAND, ERA5, LULC) são recortadas pelo AOI da célula.
- `4_0_spatial_prediction.js` (D3 GLOBAL) prediz 1× no domínio e fatia na grade
  comum (sem costura) → a `PREDICTIONS/COL` já é o mosaico final (**sem** passo de
  merge) — ver `proposta_predicao_sem_costura.md`.
- **Multi-fonte**: o pipeline é único e parametrizado por `SOURCE` (`0_contract.js`).
  Rodar com `SOURCE='gedi'` e `SOURCE='ifn'` gera duas sub-versões
  (`V08_GEDI`, `V08_IFN`) com as **mesmas covariáveis e hiperparâmetros**, permitindo
  comparação direta (treino GEDI × treino IFN) e validação cruzada entre fontes.

## 6. Incerteza

- **Incerteza do modelo**: `agbd_std_<ano>` = desvio padrão das predições dos 5 membros
  do ensemble (incerteza epistêmica).
- Limitação conhecida: subestima a incerteza total quando todos os membros compartilham
  o mesmo viés estrutural (ex.: viés do GEDI L4A).
- **Planejado**: calibração por estrato (RMSE do hold-out espacial por classe/bioma) e
  uso das camadas de erro das referências (ex.: Saatchi 2011).

## 7. Validação

- **Gate offline** (`2_3_gcn`): CV espacial em blocos (~3 km), varredura de
  `minLeafPopulation` (5/10/20/30), avaliação log vs linear com fator de Duan,
  Moran's I + variograma dos resíduos, thinning espacial (grade 60–90 m).
- **Critérios de aceite** (consulta v07): RMSE espacial ~25–35% do RMSE médio de
  `agbd`; |%Bias| < 10%; Moran's I residual próximo de 0.
- **Lacuna**: validação independente (IFN e mapas de referência) ainda não implementada.

## 8. Limitações e riscos conhecidos

1. **Descontinuidade de borda (marcas de chunk)** — predição por célula + `mosaic()` de
   corte seco e export por célula sem grade comum. Tratada em
   `proposta_predicao_sem_costura.md`.
2. **Extrapolação de domínio** — treino restrito a classes florestais C11, mas a
   predição cobre savana/campo, que dominam o Pantanal.
3. **Saturação do GEDI** em biomassa alta; ausência de calibração de campo.
4. **Sem covariável explícita de inundação/água**, apesar da natureza sazonalmente
   alagável do bioma.
5. **Sem validação externa** (IFN / referências) nesta versão.

## 9. Proveniência e reprodutibilidade

- Registry de covariáveis (`covariate/_metadata.js`) anexado ao modelo como
  propriedade (`covariates_registry`, `covariate_version`).
- Ensemble determinístico: seeds fixas (`SEED_BASE + i`) e seleção de bandas por hash.
- Ordem de execução em `v08/README.md` §5.
- Assets e modelos versionados sob `.../PANTANAL_FOREST/V08`.

## 10. Referências

- `v07/mapbiomas-carbono-v07-consulta-estrategica.md` — regularização, ensemble,
  thinning, CV espacial, D18/E22 (descontinuidade de borda).
- `docs/Covariável - JAXA ALOS PALSAR-2 SAR Composite (SAR_EPOCH).md`.
- `docs/Amostra - GEDI L4A Aboveground Biomass Density, Version 2.1.md`.
- `docs/README.md` — catálogo de datasets e padrões.
- Dubayah et al. (2022), GEDI L4A v2.1, ORNL DAAC, doi:10.3334/ORNLDAAC/2056.
