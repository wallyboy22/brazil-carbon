# MAPBIOMAS-CARBONO — Pantanal Forest

## Estado Atual

| Versão | Papel | Estado |
|---|---|---|
| `v00` | Script monolítico inicial | Referência congelada |
| `v01` | Pipeline modular com gate offline | Baseline estrutural |
| `v02` | Particionamento de matriz e predição espacial | Experimental/histórica |
| `v03` | Contrato explícito de bandas e tipos | Baseline tipada |
| `v04` | Cache persistido de covariáveis | Experimental, não recomendada |
| `v05` | Stack em memória por célula | Estratégia recomendada |
| `v06` | Máscara florestal no treino | Intermediária |
| `v07` | Ensemble RF N=5 + regularização champion + stats | **Concluída** (produto 2023) |
| `v08` | Fix PALSAR (mosaico global determinístico) | Em desenvolvimento (plano) |

## Política de contratos

Cada `0_contract.js` é **autossuficiente**: contém todos os termos sem
`require()` de versão anterior.

- O **bloco comum** (schema de bandas + grade de células espaciais) é a cópia
  literal do v03 (referência/template) — verificados automaticamente pelo
  script `_lint_contracts.js` (temp).
- Cada **seção** do contrato traz um comentário com a **proveniência**: qual
  versão tomou aquela decisão e por quê.

## Política de covariáveis

Todas as formulações de covariáveis estão em uma biblioteca compartilhada em
`covariate/` (por temas):

1. **Cada `0_covariate_source.js` é um arquivo único autossuficiente** — lê o
   próprio contrato + biblioteca `covariate/*`; **não requer outras versões**.
2. **A biblioteca é o acervo imutável** — mudanças de formulação (ex.: PALSAR
   global na v08) entram como overrides nos orquestradores das versões, nunca
   editando `covariate/`.
3. **Proveniência documentada em `_metadata.js`** — `COVARIATES_REGISTRY` lista
   cada tema com `versions[].tag` usando a convenção `since_vNN` (ex.: HLS
   `since_v01`; PALSAR `since_v01` + `v08`).
4. **Metadata anexada ao modelo** — o `3_model_training.js` exporta
   `covariates_registry` (JSON da registry) e `covariate_version` como
   propriedades do classificador (asset properties), tornando a proveniência
   rastreável no próprio modelo exportado.

## Linha do Tempo

### v00 — Referência inicial

A v00 era um script único para o Pantanal, baseado no fluxo original do
Carbono:

```text
descoberta GEDI → filtros → stack em memória → sampleRegions → exports
```

Características principais:

- uma região cobrindo o Pantanal por bounding box;
- stack HLS/PALSAR/HAND/ERA5/LULC;
- filtros de qualidade GEDI;
- export de footprints e amostras;
- pouca separação entre diagnóstico, matriz e modelagem.

### v01 — Pipeline modular

A v01 adotou a organização inspirada no MapBiomas Solo:

```text
0_covariate_source.js
    ↓
1_check_covariates.js
    ↓
2_data_matrix.js
    ↓
2_2_data_matriz_analisys
    ↓
3_modelling.js
    ↓
4_merge.js
```

Decisões importantes:

- módulo compartilhado via `require()`;
- matriz de treino separada da modelagem;
- gate offline para comparar RF, GBM e SVM;
- exports para `MATRIX/` e `PREDICTIONS/`;
- tentativa de evitar `getInfo()` usando `evaluate()`;
- modelo selecionável por `MODEL_TYPE`;
- versão e subversão separadas.

Problema principal encontrado: o export de uma matriz grande, com muitas
covariáveis e um único grafo server-side, sofreu timeout e consumo excessivo de
memória.

### v02 — Particionamento operacional

A v02 tentou resolver o timeout dividindo o Pantanal em tiles e a matriz em
batches:

```text
tile × batch → sampleRegions → Export.table.toAsset
```

Problemas encontrados:

- `geometries: false` causava `Unable to export features with null geometry`;
- `toList(total)` mantinha um grafo global muito grande;
- `tileScale=32` era inválido; o limite do GEE é 16;
- batches vazios causavam `Table is empty`;
- `system:index` entrava acidentalmente como variável do modelo;
- uma imagem multibanda de todo o Pantanal causava `Computed value is too large`;
- a criação de tasks ficou lenta devido a um `evaluate()` por batch;
- `Export.*` cria tasks no Code Editor, mas não as inicia automaticamente.

Correções aplicadas ao longo da v02:

- batches menores;
- geometrias nas amostras;
- predição por tile, parte e ano;
- descoberta automática dos assets existentes;
- margem de erro nas interseções geométricas;
- mensagens de espera e redução de prints.

Conclusão: a v02 foi útil para diagnosticar os limites do GEE, mas acumulou
complexidade operacional e permaneceu experimental.

### v03 — Contrato tipado e predição espacial

A v03 introduziu um contrato explícito para as bandas:

| Grupo | Tipo raster |
|---|---|
| Índices HLS | `Float32` |
| PALSAR HH/HV/razões/RVI | `Float32` |
| HAND | `Float32` |
| Classes geomorfológicas | `Uint8` |
| CWD, temperatura e precipitação | `Float32` |
| MapBiomas LULC | `Uint8` |
| Predição AGC | `Float32` |

O modelo deixou de derivar o schema automaticamente de `propertyNames()`.
Também foram adicionados:

- `0_contract.js`;
- `1_preflight`;
- validação do footprint;
- checagem de `bandTypes()`;
- exclusão explícita de `system:index`;
- modelo persistido em `MODELS/`;
- predição por célula espacial;
- `ADD_LAYER` opcional para visualização;
- merge e QA.

Observação: parte dos assets da matriz v03 foi produzida quando a grade ainda
usava o bounding box do Pantanal sem filtrar rigorosamente pelo polígono
oficial. A predição foi posteriormente corrigida para descobrir e filtrar
células server-side pelo limite real do bioma.


### v04 — Cache persistido de covariáveis

A v04 foi criada para reduzir a recomputação do stack. A proposta era:

```text
stack por célula/ano → COVARIATES/
                          ↓
                     matriz/predição
```

Essa arquitetura foi considerada inadequada porque adiciona uma etapa de
exportação e armazenamento de rasters intermediários. Não é a estratégia
principal.


### v05 — Stack em memória por célula

A v05 substitui a proposta da v04 e retorna ao padrão desejado do Carbono:

```text
célula válida
    ↓
stack em memória uma vez
    ↓
sampleRegions ou classify
    ↓
um export por célula/ano
```

Características:

- não exporta `COVARIATES/`;
- usa o footprint persistido como entrada;
- filtra células server-side pelo polígono oficial;
- verifica footprints dentro de cada célula;
- cria uma matriz por célula;
- usa schema explícito e tipos raster controlados;
- usa uma única descoberta server-side de células válidas;
- permite visualizar o resultado com `ADD_LAYER=true`;
- mantém predição em `Float32`;
- faz merge somente após as células concluírem.

## Problemas Recorrentes

### `Table is empty`

Indica que não restaram features válidas após `sampleRegions` e o filtro de
valores nulos. O asset não é criado. É aceitável quando a célula não possui
amostras válidas, mas deve ser registrado como célula ignorada.

### `Computed value is too large`

Indica que a região ou o grafo de classificação é grande demais. A resposta é
reduzir a célula espacial, não apenas aumentar `maxPixels`.

### `Geometry.intersection`

Operações de interseção devem usar margem explícita:

```javascript
geometry.intersection(other, ee.ErrorMargin(30));
```

Também é necessário filtrar geometrias com área zero antes de criar exports.

### `system:index` como banda

Metadata de FeatureCollection não deve entrar no modelo. O schema deve ser uma
lista explícita de bandas do contrato.

### `Double`

Operações como `percentile`, `sum`, `mean`, `pow`, `log10` e `expression` podem
produzir tipos de maior precisão. O stack final deve converter explicitamente:

- contínuas para `Float32`;
- classes para `Uint8`;
- predições para `Float32`;
- classificações finais para tipo inteiro apropriado.

`round()` não é substituto de conversão de tipo.

### Tasks demorando para aparecer

`Export.*` é client-side. Um `evaluate()` por batch cria uma sequência lenta:

```text
evaluate → callback → Export → próximo evaluate
```

O padrão adotado nas versões novas é:

```text
map/filter server-side
    ↓
aggregate_array de IDs
    ↓
um evaluate()
    ↓
criação client-side das tasks válidas
```

## Fluxo Recomendado Atual

Usar a v05 nesta ordem:

1. `1_preflight` — conferir bandas, tipos e amostras.
2. `2_0_check_footprint` — validar a entrada GEDI.
3. `2_1_data_matrix` — gerar uma matriz por célula válida.
4. `3_model_training` — treinar e salvar o modelo.
5. `4_spatial_prediction` — predizer por célula e ano.
6. `ADD_LAYER=true` — visualizar as predições no mapa quando necessário.
7. `5_merge` — unir as células concluídas.
8. `6_qa` — conferir assets, cobertura e tipos.

## Estado dos Assets

Entrada compartilhada:

```text
PANTANAL_FOREST/SAMPLES/footprint_pantanal_2023
```

Produtos recomendados:

```text
PANTANAL_FOREST/V05/MATRIX/
PANTANAL_FOREST/V05/MODELS/
PANTANAL_FOREST/V05/PREDICTIONS/
```
