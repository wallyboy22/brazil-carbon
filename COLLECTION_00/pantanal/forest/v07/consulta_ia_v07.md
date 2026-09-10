# MAPBIOMAS-CARBONO — Consulta estratégica v07 (anti-overfitting + ensemble)

> Você **não terá acesso ao código**. Todo o contexto necessário está neste arquivo.
> Responda em **português**, objetivo, com recomendações acionáveis e passo a passo priorizado.

## 1. Contexto (resumo autossuficiente)

### 1.1 Objetivo
Mapa anual de **biomassa acima do solo (AGC)** para as **formações florestais do bioma
Pantanal**, resolução de **30 m**, séries de **2019–2023**. Alvo de treino: `agbd`
(Mg biomassa/ha) do GEDI L4A.

### 1.2 Fonte de verdade
- **GEDI L4A v2.1 (AGBD)** — rótulo pontual com erro publicado (`agbd_se`).
- Filtros de qualidade: `l4_quality_flag`, `degrade_flag`, erro relativo <50%,
  sensibilidade ≥0.95, 8 beams, apenas órbitas noturnas.
- Dados de treino atualmente restritos a **um ano (2023)**.

### 1.3 Covariáveis (36 bandas)
| Grupo | Bandas | Qtd |
|---|---|---|
| HLS (espectrais) | NDVI, EVI, NDMI, BAI, SAVI, BSI — percentis p10/p50/p90 + amplitude | 24 |
| PALSAR-2 | HH, HV (dB), razão HV/HH, RVI | 4 |
| HAND | altura em relação ao dreno + classe geomorfológica | 2 |
| ERA5-Land | déficit hídrico CWD (atual, climatológico, 3 anos), T média, precipitação | 5 |
| LULC | MapBiomas Coleção 11 | 1 |

### 1.4 Pipeline (Google Earth Engine)
- Grade **4×4 de células** sobre o quadrilátero do Pantanal; células com área dentro do
  polígono oficial IBGE/IPAM (`Bioma = Pantanal`): ~150–200 células.
- **Matriz por célula** → um modelo por versão → **predição por célula** dentro de uma
  ImageCollection `PREDICTIONS/COL`, com propriedades `year`, `cell_id`.
- Versão 06: **máscara florestal** `classification ∈ {3, 4, 6, 7, 49}` aplicada à saída
  (e footprints de treino filtrados por essa máscara).
- Etapa de **merge** hoje é separada; na v07 pretendemos **dispensá-la** e simular o
  mosaico anual no QA.

### 1.5 Síntoma a resolver (problema central)
- **v03** (matriz pequena, ~19 células com footprints): predição espacialmente
  **lisa/suave** — não reproduz picos locais. Suspeita de *underfit*.
- **v05/v06** (muito mais dados, 40 células): predição **pontilhada** — alguns footprints
  "saltam" em relação ao vizinho. Suspeita de *overfit local*/memorização do `agbd` pontual.
- Modelo e hiperparâmetros são **idênticos** entre versões (RF regressão,
  300 árvores, `bagFraction 0.632`, semente `2021`). A diferença observada vem **só** do
  volume/cobertura de treino e da máscara florestal (v06).

### 1.6 Restrições operacionais (importantes para as respostas)
- Predição roda **server-side no Earth Engine** (30 m, bioma inteiro). **Ensemble
  multiplica custo/EECU** — precisa de estratégia de custo.
- Classificadores disponíveis no GEE: `smileRandomForest`, `smileGradientTreeBoost`,
  `smileSVM`, CART etc. **Não é possível importar modelos sklearn treinados fora** para
  predizer no GEE.
- Um **gate offline (Python/Colab)** com CV espacial K-fold e RF/GBM/SVR foi previsto,
  mas **ainda não é sistemático**.
- Ainda **não existe**: ensemble, mapa de incerteza, validação independente
  (hold-out espacial/temporal), análise de resíduos espaciais, thinning espacial dos
  footprints, transformação do alvo.

## 2. Perguntas

### Bloco A — Diagnóstico de under/overfit
1. O sintoma (mapa suave com poucos dados → pontilhado com mais dados) é diagnóstico de
   quê? Quais causas separar: **volume de treino × capacidade do modelo × ruído do rótulo
   GEDI × redundância de covariáveis**?
2. Quais experimentos **objetivos** confirmam isso **sem depender do visual** (análise de
   resíduos, Moran's I / auto-correlação espacial, variograma, validação em footprints não
   usados, comparação por classe LULC, CV espacial)? Liste o mínimo indispensável.
3. Como distinguir **memorização pontual do agbd** (overfit) de **baixa capacidade espacial
   das covariáveis** (a covariável varia pouco na vizinhança de um footprint)?
4. Como usar o erro do rótulo (`agbd_se`) na prática: ponderar amostras? Filtros mais ou
   menos restritivos? Simular ruído no rótulo durante o treino?

### Bloco B — Dados
5. Vale **expandir o treino para 2019–2022** além de 2023 (mais footprints/amostras)?
   Trade-off custo × ganho e como evitar **viés temporal** (ex.: máscara florestal do ano
   da predição vs ano de treino).
6. **Thinning espacial** dos footprints: qual distância mínima/método prático (grid, raio,
   k-means, NND) para reduzir auto-correlação espacial e *leakage* no split?
7. **Transformação do alvo** — `log(1+agbd)` vs `agbd`: quando justifica e como corrigir o
   **viés de retransformação** ao voltar para a escala original.
8. Como tratar a **distribuição do alvo** (assimetria, cauda de alta biomassa)?
9. Classe `7` (Savana Alagada) está **em pendência** na máscara florestal: incluir ou
   excluir do universo de treino/predição?
10. Vale usar **amostras de inventário florestal (IFN)** como complemento ou validação
    nesta etapa?

### Bloco C — Modelo e regularização no GEE
11. Faixa inicial de hiperparâmetros RF para ~36 bandas e ~10⁴–10⁵ amostras:
    `minLeafPopulation`, `maxNodes`, fração de variáveis por split, `bagFraction`,
    nº de árvores. **O que ajustar primeiro**?
12. **Seleção/redução de covariáveis**: quais bandas retirar por padrão (ex.: redundância
    espectral HLS, BSI, interação HAND×LULC) e como decidir (importância de Gini vs
    importância por permutação, correlação)?
13. **GBM (GradientTreeBoost) vs RF vs SVM** no GEE para biomassa: quando cada um brilha,
    riscos de cada um, e papel da **granularidade espacial da predição**.
14. O LULC (categórica) pode dominar o split: recomenda **estratificação por classe/por
    tipo de vegetação** na amostragem ou validação?

### Bloco D — Ensemble de modelos e/ou predições
15. **Ensemble de modelos** (RF+GBM+SVM, seeds distintos, subespaços de bandas) **vs
    ensemble de predições** (imagens combinadas por média/mediana/pesagem): quando usar
    cada um e como combinar (média, mediana, ponderada por métrica de validação, stacking)?
16. Como implementar **no GEE com custo controlado**: N predições por célula combinadas via
    `Reducer.mean/median`? Estratégias para **não multiplicar tasks** (bandas empilhadas em
    uma imagem, ensemble apenas nas células de interesse)? Estimativa de custo × N.
17. Como gerar **diversidade** de membros de forma barata (seeds, subconjuntos de bandas,
    modelos por sub-região) sem explodir o pipeline?
18. **Modelo global × ensemble por célula/região**: trade-offs de consistência e de
    **costura entre células** (descontinuidades no mosaico), e qual mitigação funciona.
19. **Treinar offline (sklearn) e só predizer no GEE**: é realista (exportar predições já
    combinadas como grade) ou a restrição server-side obriga a usar classificadores GEE?
    Compare as opções e recomende.

### Bloco E — Incerteza e validação
20. Como gerar **mapa de incerteza** no GEE **sem quantile RF nativo**: desvio padrão entre
    membros do ensemble, bootstrapping espacial, intervalos por estrato LULC? Qual é o mais
    honesto estatisticamente?
21. **Validação independente**: split espacial (por célula/faixa de borda), split temporal
    (ano fora), validação externa (IFN, produtos de biomassa de referência do Pantanal).
    Quais métricas reportar (RMSE, R², %Bias, viés por classe) e **critérios de aceite**
    recomendados para um produto de carbono?
22. Como estruturar o **QC da v07**: dispensar o merge e simular mosaico no QA, layout de
    assets para N membros do ensemble, e o que o time deve inspecionar primeiro.

### Bloco F — Plano operacional v07
23. **Passo a passo priorizado em fases**: (0) diagnóstico barato; (1) dados
    (anos/thinning/transform); (2) regularização e seleção; (3) ensemble; (4) incerteza e QA.
    Para cada fase: ações, esforço, custo GEE, riscos e **critério de saída**.
24. Qual eixo traz **mais ganho primeiro** — mais dados, regularização ou ensemble?
    Justifique em função do sintoma observado.
25. Como **não explodir tasks/custo** com a grade 4×4 (~150–200 células × N predições):
    organização dos exports e da ImageCollection `COL` na v07.
26. Estimativa de **esforço/EECU** e caminho incremental (smoke test antes de expandir).

## 3. Formato da resposta pedido
- Responda **todas** as perguntas numeradas (A1–F26), em português.
- Encerre com: **5 recomendações priorizadas** (impacto × esforço), uma **linha do tempo
  sugerida** e uma seção **"o que NÃO fazer"**.
- Para cada recomendação, informe: *por quê*, *como*, *custo estimado*.