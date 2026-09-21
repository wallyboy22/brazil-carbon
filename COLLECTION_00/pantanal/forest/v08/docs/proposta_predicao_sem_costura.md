# Proposta — Predição sem costura (seamless) no Pantanal Forest

> Escopo: eliminar as **marcas de chunk** (descontinuidades alinhadas à grade de
> células) na predição de AGBD. Documento de proposta — não altera código.
> Versão-alvo: patch na v08.

---

## 1. Sintoma e evidência

- Na predição do Pantanal forest, a classificação tem desempenho global aceitável,
  porém exibe **descontinuidades visíveis alinhadas à grade de células**.
- Produto observado: **v07** (`agc_pred_v07_merged_2023`). A v08 **ainda não foi
  executada** (`v08/README.md` §7: "nenhuma task de export rodada ainda").
- Escala das marcas: alinham com as **sub-células finas `CELL_SPLIT = 4`** (até ~256
  células de `makeCellDefinitions`), não com os 16 tiles grandes.
- Essa escala é a mesma unidade de AOI usada por `buildPalsarPerCell(aoi, year)`,
  o que aponta diretamente para a hipótese primária da seção 2.

## 2. Causas em camadas

As marcas têm três origens independentes. A camada 1 é a primária e já tem correção
codificada na v08; as camadas 2 e 3 permanecem no código.

### Camada 1 — Covariável computada por AOI (primária)

- `covariate/_palsar.js:29` (`buildPalsarPerCell`): `SAR_EPOCH.filterBounds(aoi).first()`
  escolhe **uma strip SAR arbitrária por célula** → platôs de `HV_db`/`HH_db`
  alinhados à grade, ampliados pelo `focal_mean(3)`.
- Os membros do ensemble discordam nesses platôs → `agbd_std` alto.
- **Correção v08 (já codificada)**: `v08/0_covariate_source.js:141-158` remove as
  bandas PALSAR por célula do stack e injeta o mosaico global por mediana
  (`buildPalsarGlobal`), tornando a covariável determinística e AOI-independente.

### Camada 2 — Mosaico de corte seco (secundária)

- `v08/5_merge.js:20`: `col.filter(year).mosaic()` — composição por corte abrupto
  célula a célula, **sem sobreposição nem blending**.
- A consulta v07 (`mapbiomas-carbono-v07-consulta-estrategica.md`, D18/E22)
  previu esse risco e recomendou *buffer de treino* ou *média ponderada por
  distância à borda*; nenhum dos dois foi implementado.

### Camada 3 — Grade de exportação por célula (terciária)

- `v08/4_spatial_prediction.js:79`: cada `Export.image.toAsset` usa `region: geom` e
  `scale`, **sem `crs`/`crsTransform` comum** → a origem da grade de 30 m é alinhada ao
  bbox de cada célula, gerando reamostragem/desalinhamento nas emendas.
- Agravante: o `classify()` herda a projeção da primeira banda do stack; como o HLS é
  organizado em tiles MGRS (UTM), a projeção intermediária pode variar por célula.

## 3. O que já é global (não é a causa)

- **Pontos**: a máscara de treino é aplicada 1× no footprint inteiro
  (`v08/2_1_toAsset_samples_treino.js`); a extração por célula é apenas partição
  espacial determinística.
- **Covariáveis**: PALSAR global na v08; HAND/ERA5/LULC são imagens de fonte
  determinísticas (recortadas por AOI). HLS é, por pixel, AOI-independente.
- **Thinning**: global (`2_3_gcn/2_3_0_..._util.py`, `load_matrix` concatena todos os
  CSVs antes de `grid_thin`).
- **Treino**: modelo RF global único (`v08/3_model_training.js:25`, `flatten()`);
  o ensemble é determinístico por hash de banda (`covariate/_ensemble.js:18`).

## 4. Opções de arquitetura

### Opção A — Predição global única (alvo limpo)

- Construir o stack 1× no bioma, `classify` 1×, `reduce` do ensemble 1× e exportar em
  poucos tiles definidos sobre uma **grade fixa compartilhada**.
- **Prós**: elimina a costura por construção; um único grafo de predição.
- **Contras**: maior custo EECU/memória; exige orçamento e monitoramento (consulta v07, F25).

### Opção B — Tiles com overlap + blending ponderado (D18)

- Predizer cada célula com uma **margem de sobreposição**; no merge, combinar por
  **média ponderada pela distância à borda** em vez de corte seco.
- **Prós**: mantém o paralelismo por célula; remove o corte abrupto e suaviza efeitos de
  borda de covariável.
- **Contras**: complexidade média; precisa construir a imagem de peso por tile.

### Opção C — Só corrigir a grade (patch mínimo)

- Manter a predição por célula, mas com `crs` + `crsTransform` **comuns** e reprojeção
  do stack para uma projeção fixa antes do `classify`.
- **Prós**: barato, baixo risco, sem custo extra de EECU.
- **Contras**: não resolve o corte seco; suficiente apenas se a v08 (PALSAR global) já
  igualar os valores na fronteira.

### Quadro comparativo

| Critério | A | B | C |
|---|---|---|---|
| Elimina costura | Por construção | Sim (suaviza) | Parcial |
| Custo EECU | Alto | Médio | Baixo |
| Complexidade de código | Média | Alta | Baixa |
| Risco de regressão | Médio | Médio | Baixo |

## 5. Recomendação faseada

1. **Fase 1 — Opção C (patch na v08).** Aplicar grade comum + projeção fixa do stack.
   Rodar a v08 e medir a descontinuidade de borda (seção 7).
2. **Fase 2 — Opção B, se necessário.** Se a métrica de borda ainda indicar degrau,
   implementar overlap + blending ponderado no `5_merge.js`.
3. **Fase 3 — Opção A como produto final.** Consolidar a predição em grade única para o
   produto oficial, mantendo a predição por célula apenas para QA/auditoria.

## 6. Especificação técnica

### 6.1 Grade e CRS comuns

- Definir **um** `crs` + `crsTransform` para todos os exports de célula. Duas vias:
  - CRS geográfico (EPSG:4326) com `crsTransform` fixo em graus (~30 m) e origem fixa; ou
  - CRS projetado único para o Pantanal (ex.: EPSG:5880 SIRGAS 2000 / Brazil Polyconic,
    ou UTM 21S) a 30 m, com origem fixa.
- O produto final deve ser exportado em EPSG:4326; a grade comum apenas garante que os
  tiles se alinhem sem reamostragem entre si.

### 6.2 Projeção fixa do stack antes do `classify`

- Aplicar `.reproject({ crs: <crs_comum>, scale: 30 })` (ou `setDefaultProjection`) no
  stack tipado, para que o `classify()` não herde a projeção UTM do primeiro tile HLS.

### 6.3 Blending por distância à borda (Opção B)

- Para cada tile com margem de sobreposição, construir uma imagem de peso
  `w ∈ [0,1]` = distância normalizada à borda (rampa linear/cosseno).
- Combinar os tiles da `ImageCollection`:
  - `pred = Σ(pred_i · w_i) / Σ(w_i)`;
  - `std` idem (média ponderada).
- Implementação sugerida: imagens `pred_i · w_i` e `w_i` empilhadas, agregadas com
  `ee.ImageCollection.reduce(ee.Reducer.sum())`.

## 7. Plano de validação

1. **Experimento pareado (2 células vizinhas)**: montar o stack v07 (PALSAR por célula)
   e o stack v08 (PALSAR global) sobre o mesmo AOI par, classificar **com o mesmo modelo
   v07** e medir o degrau de `prediction` na borda. Se o degrau existir no v07 e sumir no
   v08, a camada 1 está confirmada e corrigida.
2. **Métrica de descontinuidade de borda (nova)**:
   - `|∇prediction|` nos pixels que cruzam fronteiras de célula × no interior;
   - Moran's I residual já existe no gate offline (`2_3_gcn`).
3. **Critério de aceite**: distribuição do gradiente de borda indistinguível da do
   interior (sem degrau sistemático).

## 8. Riscos e critérios de aceite

- **Risco**: custo de EECU na Opção A; mitigar com smoke test em poucas células antes de
  expandir (consulta v07, F25).
- **Risco**: blending excessivo borrar detalhe real; calibrar a largura da margem.
- **Aceite**: sem marcas visíveis na grade `CELL_SPLIT=4`; métrica de borda dentro do
  interior; QA v03–v08 consistente (`6_qualidade.js`).

## 9. Referências

- `v07/mapbiomas-carbono-v07-consulta-estrategica.md` — D18 (modelo global vs por célula,
  blending/buffer) e E22 (QA de mosaico simulado).
- `v08/0_diagnose_tiles.js` — confirmação da hipótese PALSAR.
- `v08/README.md` — delta v07→v08.
- `covariate/_palsar.js`, `covariate/build_stack.js`, `v08/4_spatial_prediction.js`,
  `v08/5_merge.js`.
