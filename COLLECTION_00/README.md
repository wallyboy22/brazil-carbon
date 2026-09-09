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

## Pipeline modular v01/v02 (Pantanal)

O Pantanal ganhou uma **v01 modular** (`pantanal_forest/v01/`) seguindo o
padrão do MapBiomas Solo (`collection3/carbon`): pipeline em etapas numeradas
com módulo de covariáveis compartilhado via `require()`. O Cerrado permanece
só com v00.

| Etapa | Papel | Saídas |
|---|---|---|
| `0_covariate_source` | Módulo `require()`: stack HLS/PALSAR/HAND/ERA5-CWD/LULC C11, filtros GEDI, `ensureFolder()` | — |
| `1_check_covariates` | Diagnóstico: bandas, teste `sampleRegions(3)`, camadas viz | — |
| `2_data_matrix` | Matriz de treino (GEDI + covariáveis) | Asset `SAMPLES/` + `MATRIX/` · Drive CSV (universo p/ análise) quando `EXPORT_TO_DRIVE=true` |
| `2_2_data_matriz_analisys/` *(offline)* | Análise fora do GEE: EDA, redundância (correlação/thinning/IsolationForest), CV espacial K-fold, RF/GBM/SVR → gate | relatório PASSA/FICA/SAI · registro `EXPERIMENTS.md` |
| `3_modelling` | Modelo (`MODEL_TYPE` rf/gbm/svm) + predição anual multibanda | Asset `PREDICTIONS/` (+ modelo opcional) · Drive GeoTIFF quando `EXPORT_TO_DRIVE=true` |
| `4_merge` | Stub documentado — integração futura a definir | — |

> **Fluxo com gate:** a matriz sai em `MATRIX/` e o universo em CSVs no Drive.
> A **análise offline** (`2_2_data_matriz_analisys/`, roda local ou Colab)
> decide as subversões/versão com métricas baratas; **só o champion dispara o
> `3_modelling`** (predição massiva, cara).
>
> 🔒 **Política de versionamento:** no repo GEE online entram **apenas `.js`,
> `README.md` e os módulos `require()` (sem extensão)**. A pasta
> `2_2_data_matriz_analisys/` é **ignorada** no online e mantém **próprio `.git`
> local** — o histórico dela fica versionado localmente, nunca enviado ao GEE.

### Baldes de assets GEE

Base: `projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/`

| Balde | Status | Conteúdo |
|---|---|---|
| `SAMPLES/` | ✅ existente | footprints GEDI filtrados |
| `MATRIX/` | 🆕 v01/v02 | matriz consolidada (v01) ou batches (v02) |
| `PREDICTIONS/` | 🆕 v01/v02 | imagens anuais AGC preditas |
| `MODELS/` | 🆕 v01/v02 (toggle **off**) | modelos RF via `Export.classifier.toAsset()` |

> Sobre `MODELS`: o GEE suporta salvar/recarregar classificadores
> (`Export.classifier.toAsset()` + `ee.Classifier.load()`), mas o time não usa
> essa prática internamente (o Solo retreina a cada run). Por isso o toggle
> `SAVE_MODEL_TO_ASSET` nasce desligado — fácil de ligar sem inventar padrão.

Convenções mantidas na v01: flags pessoais `WS_CARBONO_toDrive-` /
`WS_CARBONO_toAsset-` nas descriptions, estratégia `evaluate()` (sem `getInfo`),
janela `[inicio, fim)` exclusiva, fallback de ano e LULC Coleção 11. Novidade:
helper `ensureFolder()` cria as pastas de asset nível a nível quando os exports
de Asset estiverem ligados.

> **Fase atual:** a v01 exporta **para Assets GEE** (baldes `MATRIX/` e
> `PREDICTIONS/`) para sustentar o fluxo de predição (`2_data_matrix` alimenta
> `3_modelling`). O modelo no `3_modelling` é selecionável por `MODEL_TYPE`
> (`rf` | `gbm` | `svm`, espelhando o GEE) e rotulado por `SUBVERSION`
> (`agc_pred_v01_rf`, …). Drive (`EXPORT_TO_DRIVE`) fica desligado por padrão —
> ligado apenas para exportar o **universo** da análise offline.

### v02 — matriz particionada (Pantanal)

A `pantanal_forest/v02/` preserva a v01 e corrige os erros de geometria nula e
memória observados no export da matriz completa. O footprint existente é
dividido em tiles espaciais; cada tile monta seu próprio stack e exporta
batches independentes no balde `MATRIX/`:

```text
agc_matrix_v02_pantanal_tile01_batch001
agc_matrix_v02_pantanal_tile01_batch002
...
```

O `3_modelling` descobre automaticamente os assets `agc_matrix_v02_pantanal_*`
existentes em `MATRIX/` (tiles sem amostra válida — "Table is empty" — não
geram asset e são ignorados) e os combina apenas para o treinamento.
`MATRIX_ASSET_IDS` é um override opcional (vazio = descobrir tudo).
A predição é exportada **por tile × parte × ano** (`agc_pred_v02_rf_tile01_p01_2019` …)
para evitar o `Computed value is too large`; `PRED_PART_SPLIT` (default `2`)
subdivide cada tile em N×N partes, e `ADD_LAYER=true` adiciona as camadas ao
mapa (diagnóstico; default `false`).
Antes da matriz, a subetapa `2_0_check_footprint` valida o asset persistido
`SAMPLES/footprint_pantanal_2023`; a v02 não redescobre nem reexporta os
footprints GEDI.
O módulo de covariáveis continua sendo o da v01, pois não houve mudança no
alvo nem no stack. O tamanho inicial dos batches é `500`, com `TILE_SCALE=16`;
se necessário, reduzir para `250` e repetir somente o tile afetado.

### v03 — pipeline tipada e espacial (Pantanal)

A `pantanal_forest/v03/` inaugura uma pipeline limpa, sem reutilizar os
exports de predição da v02. Ela define um contrato explícito para as 36 bandas,
converte contínuas para `Float32` e classes para `Uint8`, valida fontes e tipos
antes dos exports, e separa matriz, treino, predição espacial, merge e QA.

O footprint persistido de `SAMPLES/footprint_pantanal_2023` é reutilizado como
entrada, mas os novos produtos ficam isolados em
`PANTANAL_FOREST/V03/{MATRIX,MODELS,PREDICTIONS}`. A predição inicia com um
smoke test (`tile01`, 2023), em partes `4×4`, antes da expansão para todo o
Pantanal.

### v04 — cache de covariáveis e matriz barata (Pantanal)

A `pantanal_forest/v04/` reutiliza o footprint e o contrato científico da v03,
mas materializa o stack tipado em `V04/COVARIATES/` antes de gerar a matriz.
Assim HLS, PALSAR, ERA5, HAND e LULC são calculados uma vez por célula/ano,
em vez de serem recalculados por cada batch de tabela. A matriz v04 usa batches
iniciais de 2.000 amostras e a predição lê os mesmos rasters cacheados.
Os tiles e footprints da v04 são filtrados pelo polígono oficial do Pantanal,
não apenas pelo retângulo envolvente usado nas versões anteriores.

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
- Pipeline modular: `pantanal_forest/v01/README.md` e `pantanal_forest/v02/README.md`.
- Análise offline + registro de experimentos: `pantanal_forest/v01/2_2_data_matriz_analisys/` (pasta **local**, fora do GEE).
