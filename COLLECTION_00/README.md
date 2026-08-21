# COLLECTION_00 — Cofre de conhecimento

> Organização dos scripts da Coleção 0 (amostras GEDI para AGC) do MAPBIOMAS-CARBONO.
>
> **Convenção de pastas:** `<cobertura>_forest/v<NN>/<script>` — o nome da pasta
> espelha o balde de asset GEE correspondente (`CERRADO_FOREST`,
> `PANTANAL_FOREST`, …), abrindo espaço para novas coberturas/projetos.
> Cada pasta evolui no seu ritmo; versões anteriores ficam congeladas como referência.

## Scripts por região/bioma (v00)

Os scripts v00 foram **subdivididos por bioma** para o Pantanal divergir do
Cerrado sem quebrá-lo — **cada um evolui no seu ritmo**. O trade-off aceito:
~490 linhas do núcleo duplicadas de propósito (independência > DRY).

| Script | Região | Asset base (GEE) | Grids |
|---|---|---|---|
| `cerrado_forest/v00/mb_carbon_agc_gedi.js` | **Cerrado** | `.../COLLECTION_00/CERRADO_FOREST/SAMPLES` | 14 tiles (`t0_0` … `t3_3`) |
| `cerrado_forest/v00/mb_carbon_agc_ifn.js` | **Cerrado** | `.../COLLECTION_00/CERRADO_FOREST/SAMPLES` | loop de anos, polígonos IFN |
| `pantanal_forest/v00/mb_carbon_agc.js` | **Pantanal** | `.../COLLECTION_00/PANTANAL_FOREST/SAMPLES` | 1 grid (bioma completo) |
| `cerrado_forest/v00/mb_carbon_agc_points.js` | **Cerrado (exemplo)** | `.../COLLECTION_00/CERRADO_FOREST/SAMPLES` | pontos genéricos (`POINTS_FC`) |
| `cerrado_forest/v00/ifn_vs_gedi.js` | **Cerrado (comparação)** | — | diagnóstico IFN × GEDI |

`mb_carbon_agc_points.js` é um **exemplo de extração de covariáveis para pontos
genéricos** (não aleatórios): dado um asset `POINTS_FC`, exporta `id/lon/lat`
+ as 36 bandas do stack para Asset e Drive. Serve de referência para outras
coberturas (carbono azul, campestres, agropecuária).

## Convenções compartilhadas

- **Estratégia `evaluate()` (sem `getInfo`)**: os exports (`runMain`) só são
  criados depois de baixar, via `evaluate()`, granules (`EVALUATE #1`) e total
  de pegadas filtradas (`EVALUATE #2`). Cada `Export.*` tem `.start()` explícito.
- **Descoberta de granules**: o índice `LARSE/GEDI/GEDI04_A_002_INDEX` não tem
  `system:time_start`; filtra-se a propriedade `time_start` **em millis**
  (`ee.Filter.gte/lt` com `ee.Date().millis()`), janela `[inicio, fim)`.
- **Intervalo `[inicio, fim)`**: fim **exclusivo** — `(YEAR+1)-01-01`, não
  `YYYY-12-31` (senão o último dia do ano é perdido).
- **Export duplicado**: Drive (CSV) + Assets GEE (FC).
- **Fallback de ano**: se o ano configurado não tiver granules, tenta `YEAR-1`.
- **LULC Coleção 11**: `projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3`
  (banda `classification_<ano>`).
- **Viz de bioma**: camada de diagnóstico do limite do bioma (IBGE/IPAM)
  `projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026` filtrada por
  `ee.Filter.eq('Bioma', BIOME_NAME)` — `Cerrado` (cerrado + points) e `Pantanal`
  (pantanal). Nota: conferir o valor exato do atributo `Bioma` no asset.
- **Só saídas**: sem EDA/gráficos (ver `mb_carbon_flow_map.md` na raiz).

## Pipeline modular v01 (Pantanal)

O Pantanal ganhou uma **v01 modular** (`pantanal_forest/v01/`) seguindo o
padrão do MapBiomas Solo (`collection3/carbon`): pipeline em etapas numeradas
com módulo de covariáveis compartilhado via `require()`. O Cerrado permanece
só com v00.

| Etapa | Papel | Saídas |
|---|---|---|
| `0_covariate_source` | Módulo `require()`: stack HLS/PALSAR/HAND/ERA5-CWD/LULC C11, filtros GEDI, `ensureFolder()` | — |
| `1_check_covariates` | Diagnóstico: bandas, teste `sampleRegions(3)`, camadas viz | — |
| `2_data_matrix` | Matriz de treino (GEDI + covariáveis) | Drive CSV (batches) + Asset |
| `3_modelling` | RF regressão (`agbd`) + predição anual multibanda | Drive GeoTIFF + Asset (+ modelo opcional) |
| `4_merge` | Stub documentado — integração futura a definir | — |

### Baldes de assets GEE

Base: `projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/`

| Balde | Status | Conteúdo |
|---|---|---|
| `SAMPLES/` | ✅ existente | footprints GEDI filtrados |
| `MATRIX/` | 🆕 v01 | matrizes de treino consolidadas |
| `PREDICTIONS/` | 🆕 v01 | imagens anuais AGC preditas |
| `MODELS/` | 🆕 v01 (toggle **off**) | modelos RF via `Export.classifier.toAsset()` |

> Sobre `MODELS`: o GEE suporta salvar/recarregar classificadores
> (`Export.classifier.toAsset()` + `ee.Classifier.load()`), mas o time não usa
> essa prática internamente (o Solo retreina a cada run). Por isso o toggle
> `SAVE_MODEL_TO_ASSET` nasce desligado — fácil de ligar sem inventar padrão.

Convenções mantidas na v01: flags pessoais `WS_CARBONO_toDrive-` /
`WS_CARBONO_toAsset-` nas descriptions, export duplicado Drive + Asset,
estratégia `evaluate()` (sem `getInfo`), janela `[inicio, fim)` exclusiva,
fallback de ano e LULC Coleção 11. Novidade: helper `ensureFolder()` cria as
pastas de asset nível a nível antes dos exports.

## Como adicionar uma nova região/bioma

1. Crie a subpasta versionada `COLLECTION_00/<cobertura>_forest/v<NN>/` e copie um script existente.
2. Ajuste: `ASSET_BASE`, `GRIDS`, `ACTIVE_GRIDS` e o cabeçalho.
3. (Opcional) As pastas-pai no Assets GEE são criadas pelo `ensureFolder()` na v01;
   nas v00, crie manualmente antes do primeiro export.

## Expansão para outras coberturas/usos — decisões (sem scripts por ora)

Só existem scripts de **Floresta** (método GEDI) para Cerrado e Pantanal. As
demais coberturas estão **apenas como decisões neste cofre** — nenhum script
será criado até a equipe definir método e regiões. Legenda: **Coleção 11**.

| Cobertura/uso | Classes C11 (códigos) | Nível 1 (legenda) | Status |
|---|---|---|---|
| Floresta (atual) | 3, 4, 6, 7β, 49 | Floresta | ✅ scripts Cerrado/Pantanal |
| **Carbono azul** | 5 Mangue, 84 Marisma β, 32 Apicum, 49/50 Restingas | Floresta + Veg. Herbácea e Arbustiva | 🕒 método TBD |
| **Campestres** | 12 Form. Campestre, 77 Form. Herbácea Arbustiva, 11 Campo Alagado/Pantanosa | Veg. Herbácea e Arbustiva | 🕒 método TBD |
| **Agropecuária** | 15 Pastagem, 18 Agricultura (+ subdivisões N3/N4) | Agropecuária | 🕒 método TBD |

Pendências a decidir (não bloqueiam nada):
- **Método não-florestal**: GEDI L4A não se aplica a biomassa baixa/não-arbórea.
  Opções: campo + ML com o stack atual, ou fatores de estoque/literatura (SEEG).
- **Regiões iniciais** por cobertura (ex.: carbono azul → zona costeira).
- **Nomenclatura dos assets** por cobertura (hoje `REGIAO_COBERTURA`).

## Legenda MapBiomas Col. 11 — inteligência (nos scripts)

A **seção 7** dos scripts é um bloco **copiável**: `MAPBIOMAS_LEGEND` (35
classes, incl. 7 Savana Alagada β, 77 Form. Herbácea Arbustiva, 84 Marisma β,
91 Parque eólico β), `MAPBIOMAS_LEVEL1` (5 classes do nível 1), `MAPBIOMAS_VIS`
(`{bands:['classification'], min:0, max:91, palette}`) e `addMapBiomasLegend()`
(legenda discreta, canto inferior esquerdo, font-size 12px, max-height 60%).
Diagnóstico: `Map.addLayer(lulc C11, MAPBIOMAS_VIS)` + `addMapBiomasLegend()`.

## Nota — pastas no Assets GEE

- `MAPBIOMAS / CARBON / MAPPING / COLLECTION_00 / CERRADO_FOREST / SAMPLES`
- `MAPBIOMAS / CARBON / MAPPING / COLLECTION_00 / PANTANAL_FOREST / SAMPLES`
- `... / PANTANAL_FOREST / MATRIX` · `PREDICTIONS` · `MODELS` (v01, criadas pelo `ensureFolder()`)

## Referência

- Mapeamento completo do notebook → JS: `mb_carbon_flow_map.md` (raiz).
- Docs de datasets (GEDI L4A v2.1, índice de granules): `docs/` (raiz).
- Pipeline modular: `pantanal_forest/v01/README.md`.