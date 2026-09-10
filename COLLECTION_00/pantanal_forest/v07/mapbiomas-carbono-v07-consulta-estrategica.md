# MAPBIOMAS-CARBONO — Resposta à Consulta Estratégica v07

---

## Bloco A — Diagnóstico de under/overfit

### A1. O que o sintoma diagnostica?

O padrão **suave (v03) → pontilhado (v05/v06)** com volume de treino crescente, *modelo e hiperparâmetros idênticos*, é o assinatura clássica de **transição de underfit para overfit local por memorização de rótulo ruidoso**, não uma mudança de capacidade do modelo (que não mudou). Como RF/300 árvores/`bagFraction 0.632` são fixos, o que variou foi:

- **Densidade de amostras no espaço de covariáveis**: com poucos footprints (v03), árvores RF não conseguem particionar o espaço de forma fina → folhas grandes, predição próxima da média local → mapa suave (isso é *underfit por escassez*, não por regularização insuficiente).
- Com mais footprints (v05/v06), o RF consegue criar folhas pequenas e quase 1:1 com footprints individuais, especialmente onde covariáveis são redundantes/pouco discriminantes na vizinhança → memoriza `agbd_se` incluindo o ruído do LiDAR → "saltos" locais.

Separação das 4 causas:

| Causa | Assinatura esperada | Como testar |
|---|---|---|
| Volume de treino | erro de validação cai monotonicamente com N até platô | curva de aprendizado (learning curve) |
| Capacidade do modelo (nº árvores, profundidade, `minLeafPopulation`) | erro de treino ≈0, erro de validação alto e não melhora com mais dados | comparar treino vs CV espacial em função de `minLeafPopulation` |
| Ruído do rótulo GEDI (`agbd_se`) | resíduos correlacionados com `agbd_se`; footprints de baixa sensibilidade têm maior erro | plotar resíduo vs `agbd_se`; comparar RMSE com/sem footprints de alto erro |
| Redundância de covariáveis | importância concentrada em 2-3 bandas; alta correlação entre pares (ex. NDVI×EVI×SAVI) | matriz de correlação + importância por permutação |

Diagnóstico provável combinado: **volume ainda insuficiente para a granularidade que o RF está autorizado a explorar** (`minLeafPopulation` provavelmente baixo demais para o N atual) **+ ruído do rótulo sendo absorvido em folhas pequenas**. A máscara florestal (v06) provavelmente concentrou footprints em áreas espectralmente mais homogêneas, piorando a razão sinal/ruído (mais amostras, mas menos informação nova por amostra) — reforça a hipótese de memorização.

### A2. Experimentos objetivos (mínimo indispensável)

1. **Curva de aprendizado com CV espacial**: RMSE em função de N (subamostragem 20/40/60/80/100% do treino), sempre validando em blocos espaciais não vistos. Se o erro de validação não cai (ou piora) com N crescendo enquanto erro de treino cai → confirma overfit/memorização.
2. **Comparação treino vs validação (gap)**: gap grande e crescente = capacidade excessiva relativa ao N informativo.
3. **Resíduos espaciais + Moran's I**: correlação espacial residual alta em v05/v06 mas baixa em v03 indica que os "saltos" são estruturados (spillover de memorização pontual), não ruído aleatório.
4. **Variograma dos resíduos**: alcance (*range*) muito curto = o modelo está capturando variação em escala menor que a resolução informativa real das covariáveis (sintoma direto de overfit local).
5. **Validação em footprints hold-out (nunca vistos)** com split espacial em blocos (não aleatório) — é o teste mais direto e deve ser o critério de aceite.
6. **Comparação por classe LULC**: se erro é baixo dentro de classe mas mapa "salta" nas bordas/transições, aponta para covariável categórica dominando splits (ver A3/C14).
7. **Correlação erro × densidade local de amostras**: células/regiões com mais footprints por km² deveriam ter erro de validação menor se for um problema de volume; se não caírem, é modelo memorizando ruído, não falta de dado.

Mínimo indispensável para decidir a v07: **(1) curva de aprendizado + (3) Moran's I dos resíduos + (5) hold-out espacial**. Os demais são diagnóstico fino, não bloqueantes.

### A3. Memorização pontual vs baixa capacidade espacial das covariáveis

Teste decisivo: **agrupar footprints por vizinhança e comparar variância do rótulo vs variância das covariáveis**.

- Para pares de footprints próximos (<60 m, mesma célula 30 m ou vizinhas): se `agbd` varia muito mas as covariáveis (HLS, PALSAR) são quase idênticas → é a covariável que não tem poder discriminante ali (baixa capacidade espacial), e qualquer modelo vai "errar" ou memorizar arbitrariamente.
- Se, ao contrário, covariáveis variam pouco e o modelo ainda assim prediz valores muito diferentes ponto a ponto (olhando o output do RF, não o rótulo) → é memorização pura (overfit de árvore, folhas superajustadas).

Na prática: rode a predição do RF sobre os próprios pontos de treino vs sobre uma grade densa ao redor de cada footprint (buffer 90 m). Se a superfície predita tem descontinuidades bruscas centradas exatamente nos footprints de treino → memorização confirmada (características de árvore superajustada, "ilhas" de valor ancoradas nos pontos). Se a superfície é suave mas erra sistematicamente → é limitação de covariável.

### A4. Uso prático de `agbd_se`

- **Ponderação de amostras** (`weight` no `classifier.train`): usar `1/agbd_se²` (ou `1/agbd_se`, menos agressivo) como peso — reduz influência de footprints ruidosos sem descartá-los. É a intervenção de menor custo e maior retorno esperado dado o diagnóstico.
- **Filtro mais restritivo**: já existe erro relativo <50% e sensibilidade ≥0.95 — considerar apertar para relativo <30–40% nesta fase de diagnóstico (reduz N, mas isola o efeito do ruído do efeito do volume). Não fazer permanente sem testar o trade-off.
- **Simular ruído no rótulo durante o treino** (data augmentation com ruído gaussiano proporcional a `agbd_se` em réplicas do footprint): é uma forma barata de regularização — força o modelo a não ancorar exatamente no valor observado. Vale testar como experimento controlado antes de adotar em produção, pois no GEE isso significa gerar múltiplas cópias da FeatureCollection com jitter — custo baixo (é so manipulação de tabela, não de imagem).
- Recomendação de ordem: **ponderação por peso primeiro** (mais simples, direto no `train()`), depois avaliar filtro mais restritivo como teste de sensibilidade, jitter de rótulo só se os dois anteriores não resolverem.

---

## Bloco B — Dados

### B1/B5. Expandir treino para 2019–2022

Vale, mas com cuidado de desenho, não só "mais pontos":

- **Ganho esperado**: mais footprints em geometrias/fenologias distintas, potencialmente reduzindo a homogeneidade espectral que hoje concentra o overfit. Ajuda mais a **generalização entre anos** do que a densidade pura.
- **Viés temporal — risco principal**: covariáveis (HLS, PALSAR, ERA5) devem ser do **mesmo ano do footprint GEDI**, não do ano de predição. A máscara florestal também precisa ser do ano correspondente ao footprint de treino (não fixa em 2023), senão você introduz *label leakage* inverso (treinando com floresta que não existia, ou já havia sido convertida, naquele ano).
- **Recomendação prática**: criar a matriz de treino como pares `(ano_footprint, covariáveis_do_mesmo_ano, LULC_do_mesmo_ano)`. Isso significa repetir a extração de covariáveis para 2019–2022 (custo GEE adicional, mas é `reduceRegions`, não classificação — barato relativo a exports de imagem).
- **Trade-off custo × ganho**: fazer isso primeiro só para 1–2 anos adicionais (ex. 2021, mais distante de 2023 fenologicamente) como piloto, medir se a curva de aprendizado (A2) melhora, antes de expandir para os 4 anos completos.

### B6. Thinning espacial

Objetivo: quebrar autocorrelação espacial que infla otimisticamente a validação e alimenta a memorização.

- **Método recomendado**: **grade sistemática com amostragem por célula** (ex. manter no máximo 1 footprint por célula de 30–60 m, escolhendo o de menor `agbd_se`) — simples, reprodutível, direto de implementar como `FeatureCollection` + `reduceToImage`/`distinct` por chave de grade.
- Alternativa mais rigorosa: **distância mínima por NND (nearest neighbor distance) com poda iterativa** — remove o footprint mais próximo de qualquer outro até atingir distância mínima alvo (ex. 60–100 m, aproximadamente 2–3× a resolução de 30 m). Mais correto estatisticamente, mais caro de implementar em GEE (melhor fazer em Python/Colab sobre a tabela exportada, não server-side).
- **k-means** não é indicado aqui — ele reduz densidade mas não controla diretamente autocorrelação espacial mínima; é mais útil para estratificação (B9/C14) que para thinning.
- Distância prática sugerida: **60–90 m** (2-3 pixels), balanceando redução de leakage com perda de N. Testar sensibilidade do RMSE de validação a essa distância como parte do diagnóstico.

### B7. Transformação do alvo (`log(1+agbd)`)

- **Quando se justifica**: se a distribuição de `agbd` é assimétrica à direita com cauda longa de alta biomassa (típico em floresta), `log(1+agbd)` estabiliza variância e evita que o RF (que otimiza MSE) seja dominado pelos poucos pontos de biomassa muito alta, o que tende a *achatar* a predição nos valores baixos/médios — pode inclusive contribuir para o "mapa suave" da v03.
- Contudo, **RF em GEE é baseado em partição, não em minimização direta de MSE via gradiente** — o ganho de log-transform é menor que em GBM/regressão linear, mas ainda ajuda a equilibrar a influência de outliers na escolha de splits.
- **Viés de retransformação**: `exp(pred) - 1` subestima sistematicamente a média em escala original (desigualdade de Jensen). Corrigir com o **fator de Duan (smearing estimator)**: multiplicar a predição destransformada pela média de `exp(resíduo_log)` no conjunto de treino/CV, **não** pela correção paramétrica gaussiana (que assume normalidade dos resíduos, raramente válida aqui). Esse fator é calculado uma vez a partir dos resíduos de CV e aplicado como escalar constante na imagem final — custo computacional zero.
- Recomendação: testar em paralelo (não substituir imediatamente) — treinar uma versão com e sem transform, comparar RMSE/%Bias por faixa de biomassa (baixa/média/alta) antes de adotar.

### B8. Distribuição do alvo

- Reportar e tratar por **estratos de biomassa** (ex. quartis ou classes fisionômicas) na validação — RMSE global esconde erro sistemático na cauda alta.
- Se a cauda de alta biomassa tem poucos footprints, considerar **oversampling ponderado** desses estratos no treino (não thinning agressivo neles), complementando a transformação log.

### B9. Classe 7 (Savana Alagada) — incluir ou excluir?

- Como o objetivo é **formações florestais**, e Savana Alagada é fisionomicamente intermediária/aberta, a decisão deve ser guiada por **desempenho, não só por definição de classe**: treinar/validar **separadamente** com e sem classe 7 e comparar RMSE/viés especificamente nela.
- Recomendação pragmática dado o estado "em pendência": **excluir da v07 até a máscara estar consolidada**, mas manter os footprints e covariáveis armazenados para reincorporação rápida — evita contaminar o diagnóstico atual de over/underfit com uma fonte extra de ambiguidade de rótulo (classe incerta).

### B10. Amostras de IFN

Sim, mas como **validação externa independente**, não como treino nesta etapa:

- IFN geralmente mede biomassa em parcela (não em pegada GEDI de 25 m), então há incompatibilidade de suporte espacial (*support mismatch*) — misturar como treino exige agregação cuidadosa (upscaling da parcela para 30 m via alometria de povoamento), o que é trabalho adicional não prioritário agora.
- Como validação: é o teste mais forte de **viés absoluto** do produto (GEDI L4A já tem viés conhecido documentado na literatura para alguns biomas), por isso reservar IFN para o Bloco E (validação independente), critério de aceite do produto.

---

## Bloco C — Modelo e regularização no GEE

### C11. Faixa inicial de hiperparâmetros RF (36 bandas, ~10⁴–10⁵ amostras)

| Parâmetro | Faixa recomendada | Racional |
|---|---|---|
| `numberOfTrees` | manter 300 (não é o problema aqui) | variância já bem reduzida por bagging nesse tamanho |
| `variablesPerSplit` | `sqrt(36) ≈ 6`, testar 6–10 | padrão RF regressão costuma usar `p/3` (~12) para regressão, mas com bandas correlacionadas (HLS), menor é melhor para forçar diversidade entre árvores |
| `minLeafPopulation` | **este é o parâmetro prioritário a subir** — testar 5, 10, 20, 30 (atualmente provavelmente 1, default) | controla diretamente o tamanho mínimo de folha = regularização direta contra memorização de footprint único |
| `maxNodes` | limitar (ex. 50–200) como regularização secundária, se `minLeafPopulation` sozinho não resolver | evita árvores excessivamente profundas em regiões de baixa densidade amostral |
| `bagFraction` | manter 0.632 (padrão, ok) | não é a causa principal do sintoma |

**O que ajustar primeiro**: `minLeafPopulation`, isoladamente, rodando a curva de validação espacial (A2) para 3–4 valores. É o único hiperparâmetro com relação causal direta ao sintoma descrito (memorização pontual), e é gratuito computacionalmente (não precisa mudar a matriz de treino).

### C12. Seleção/redução de covariáveis

- **Remover por padrão**: dentro do grupo HLS, índices altamente redundantes entre si — tipicamente NDVI/EVI/SAVI têm correlação >0.9 em floresta densa; manter 1–2 representantes (ex. NDVI + EVI) e os percentis (p10/p50/p90 já capturam sazonalidade, então a *amplitude* pode ser redundante com p90-p10 — considerar remover se calculada separadamente). BSI é mais útil em solo exposto/borda que em floresta fechada — candidato a descarte no universo florestal.
- **HAND × LULC**: não é literal "interação" ainda — mas se LULC domina splits (C14), testar remover LULC como *feature* direta do RF (usar só como máscara e para estratificação de validação), evitando que o modelo aprenda "atalhos" categóricos ao invés de relação biofísica contínua.
- **Como decidir**: 
  1. **Importância por permutação** (mais confiável que Gini em GEE/RF, pois Gini favorece variáveis com mais categorias/maior variância — problema conhecido de viés); 
  2. **Matriz de correlação de Pearson/Spearman** entre bandas contínuas, remover uma de cada par com |r|>0.85–0.9; 
  3. Comparar RMSE de validação espacial com conjunto completo vs reduzido — só remover se não piorar significativamente.
- Prioridade de esforço: fazer isso **depois** de resolver `minLeafPopulation` (C11) — reduzir dimensionalidade também regulariza, mas o ganho maior e mais barato está no hiperparâmetro.

### C13. GBM vs RF vs SVM no GEE

- **RF (atual)**: robusto a outliers e escalas diferentes de covariáveis, paraleliza bem, mas tende a "achatar" extremos (viés para a média em cada folha) — coerente com o sintoma de mapa suave em baixa densidade.
- **GBM (`smileGradientTreeBoost`)**: pode capturar melhor a cauda alta de biomassa (menos "achatamento") mas é **mais propenso a overfit** com dados ruidosos como GEDI se não for bem regularizado (`shrinkage`/learning rate baixo, poucos loops) — dado o sintoma já observado de overfit em RF, GBM sem cuidado pode piorar, não melhorar. Testar apenas com `shrinkage` baixo (0.01–0.05) e validação espacial rigorosa.
- **SVM (`smileSVM`)**: custo computacional pior em GEE para 30 m/bioma inteiro (kernel não-linear escala mal), pouco usado em produção de mapas contínuos de larga escala — reservar para ensemble de diversidade (Bloco D), não como candidato principal isolado.
- **Papel da granularidade espacial da predição**: quanto mais "pontiagudo" o modelo (GBM > RF > modelo linear), maior o risco de descontinuidade entre células vizinhas na grade 4×4 — reforça a necessidade de suavização/ensemble espacial (D18) se GBM for adotado.
- Recomendação: manter RF como espinha dorsal (regularizado via C11), usar GBM só como **membro de ensemble** (Bloco D) para diversidade, não como substituto único.

### C14. Estratificação por classe/tipo de vegetação

Sim, recomendado em dois pontos:
- **Amostragem de treino**: garantir proporção mínima de footprints por classe fisionômica (evitar que uma classe rara fique sub-representada e o modelo aprenda a "adivinhar" via LULC ao invés de via covariáveis contínuas).
- **Validação (obrigatório)**: sempre reportar métricas por classe LULC (Bloco E, A2-item 6) — é o jeito mais direto de detectar se LULC está sendo usado como atalho categórico ao invés de proxy real de estrutura florestal.

---

## Bloco D — Ensemble de modelos e/ou predições

### D15. Ensemble de modelos vs ensemble de predições

- **Ensemble de modelos** (RF+GBM+SVM, seeds distintos, subespaços de bandas): maior diversidade real, mais robusto a viés de um único algoritmo, mas mais caro (cada membro = 1 treino + 1 predição completa no bioma).
- **Ensemble de predições** (múltiplos RF com seeds/subamostras de bandas, combinados por média/mediana): mais barato, e dado que o problema aqui é **variância** (overfit local), não viés estrutural do algoritmo, este é o ensemble que ataca diretamente o sintoma — bagging adicional em cima do bagging interno do RF.
- **Como combinar**: 
  - **Mediana** é preferível a média para robustez contra membros que "explodem" localmente (exatamente o padrão pontilhado observado) — mediana neutraliza outliers de predição melhor que média.
  - **Ponderada por métrica de validação** (peso = 1/RMSE_espacial de cada membro) é o próximo passo se membros tiverem qualidade desigual entre regiões.
  - **Stacking** (meta-modelo sobre as predições dos membros): não recomendado nesta fase — adiciona uma camada de complexidade e outro risco de overfit, sem necessidade comprovada dado que o problema é variância, resolvível com mediana/média simples.

**Recomendação**: priorizar **ensemble de predições via RF com seeds distintas + subamostragem de bandas**, combinado por **mediana**. É o que resolve o sintoma com menor custo e menor risco adicional.

### D16. Implementação no GEE com custo controlado

- **Sim**: treinar N classificadores RF (seeds diferentes / subconjuntos de bandas), gerar N imagens de predição, **empilhar como bandas de uma única imagem** (`ee.Image.cat`) e reduzir com `reduceRegions`/`reduce(ee.Reducer.median())` ou `.reduce(ee.Reducer.percentile([50]))` **numa única passada**, evitando N exports separados.
- **Como não multiplicar tasks**: 
  1. Os N modelos são treinados client-side na sessão (rápido, são só FeatureCollections pequenas) — isso não gera task.
  2. A predição de cada membro é uma `image.classify()` — combine todas em uma `ImageCollection` ou `Image` multibanda **antes** de exportar; **um único `Export.image` por célula/ano**, não N.
  3. Aplicar o ensemble **apenas nas células de interesse** ou em fase de validação primeiro (smoke test em subconjunto de células) antes de rodar bioma inteiro.
- **Estimativa de custo × N**: custo EECU cresce aproximadamente linear com N membros na etapa de `classify()` (cada membro é uma passada completa sobre a mesma pilha de covariáveis), mas a combinação (`reduce`) é barata. N=5 membros ≈ 5× o custo de classificação de uma única versão — ainda tratável se aplicado com a estratégia de single-export acima. N>10 começa a ficar caro para bioma inteiro (150–200 células × 5 anos).

### D17. Gerar diversidade barata

- **Seeds distintas**: trivial, zero custo adicional de dado.
- **Subconjuntos de bandas** (ex. bootstrap de ~70–80% das 36 bandas por membro): barato, força os membros a não convergirem nas mesmas variáveis dominantes — ataca diretamente a redundância espectral do HLS (C12).
- **Subamostragem do treino** (bagging adicional em cima do bagging interno do RF, ex. 80% dos footprints por membro, sem reposição): reforça robustez a footprints ruidosos individuais.
- **Modelos por sub-região**: **não recomendado como fonte de diversidade primária** — introduz o problema de costura entre células (D18) sem ganho claro de robustez ao sintoma atual (que é local/pontual, não regional).
- Combinação recomendada e barata: **seeds distintas + subamostragem de bandas (80%) + subamostragem de treino (80%)**, N=5 membros, RF apenas (sem misturar algoritmos nesta fase — isso é suficiente para reduzir variância sem multiplicar a complexidade de manutenção).

### D18. Modelo global vs ensemble por célula/região

- **Modelo por célula** (como já é o desenho atual: um modelo por versão por célula) já introduz risco de descontinuidade nas bordas da grade 4×4 — cada modelo vê uma distribuição de covariáveis ligeiramente diferente.
- **Mitigação que funciona na prática**: 
  1. **Buffer de treino**: incluir footprints de células vizinhas (não só da célula-alvo) dentro de um buffer (ex. 10–20% de sobreposição) ao treinar o modelo de cada célula — suaviza a transição.
  2. **Blending nas bordas**: na etapa de merge/mosaico (mesmo simulado no QA da v07), aplicar um `ee.Reducer.mean()` ponderado por distância à borda numa faixa de sobreposição, ao invés de corte abrupto célula a célula.
  3. Ensemble (D15-17) já ajuda indiretamente, pois a mediana de múltiplos membros tende a suavizar descontinuidades pontuais, mas **não resolve** descontinuidade sistemática entre células — isso é resolvido só pelo buffer de treino ou pela sobreposição no mosaico.
- Trade-off: modelo global (bioma inteiro, uma única matriz) elimina costura mas perde capacidade de capturar variação regional fina e é mais caro/lento de treinar com 10⁴–10⁵ amostras num único classificador GEE (ainda viável, mas testar tempo de treino). Dado o objetivo atual (resolver over/underfit), recomenda-se **manter por célula mas com buffer de treino**, adiando modelo global para uma iteração futura.

### D19. Treinar offline (sklearn) e só predizer no GEE

- **Realista, mas com restrição confirmada no seu contexto**: GEE **não permite importar modelo sklearn arbitrário para `classify()` server-side** — você não pode rodar um `RandomForestRegressor` do sklearn sobre uma `ee.Image` diretamente.
- Opções reais:
  1. **Exportar covariáveis para fora (Python/Colab), treinar e predizer completamente offline, reimportar a imagem de predição como asset** — funciona, mas croma o "predição em 30 m bioma inteiro" em uma exportação de imagem multibanda (36 bandas × bioma) via `Export.image`, que é pesado, e depois processamento local (`xarray`/`rasterio`) para aplicar o modelo — desloca custo de EECU para custo de storage/download + processamento local. Viável só se a equipe tiver infra local para rodar sklearn em raster de bioma inteiro (pode ser pesado em RAM sem tiling cuidadoso).
  2. **Reproduzir a estrutura de árvores do RF sklearn como `ee.Classifier` via texto** (GEE aceita RF importado no formato "strings" via `ee.Classifier.decisionTreeEnsemble()`), tecnicamente possível — sklearn RF pode ser exportado árvore a árvore e reconstruído em texto compatível — mas é engenharia extra significativa, sujeita a bugs de conversão, não recomendado como caminho principal agora.
- **Recomendação**: manter **treino e predição dentro do GEE** com classificadores nativos (`smileRandomForest`/`GradientTreeBoost`) para a v07. Reservar o **gate offline (CV espacial K-fold com RF/GBM/SVR em Python/Colab)** exclusivamente para **validação e comparação de configurações de hiperparâmetro/regularização** (decidir o que aplicar no GEE), não para gerar a predição final — isso já está corretamente desenhado na sua arquitetura atual, só falta sistematizar (A2/E21).

---

## Bloco E — Incerteza e validação

### E20. Mapa de incerteza sem quantile RF nativo

Opções em ordem de honestidade estatística × custo:

1. **Desvio padrão entre membros do ensemble** (D15-17): mais direto de implementar (já disponível se D16 for adotado) — captura incerteza epistêmica do modelo (quanto os modelos discordam), mas **subestima** a incerteza total se todos os membros compartilham o mesmo viés estrutural (ex. viés do GEDI).
2. **Bootstrapping espacial** (treinar dezenas de RF em subamostras espacialmente blocadas do treino, não apenas seeds): mais caro, mas captura melhor a incerteza devida à distribuição espacial desigual de footprints — mais honesto que (1) para regiões com poucos dados de treino.
3. **Intervalos por estrato LULC/biomassa**: usar o RMSE de validação espacial *por estrato* (E21) como proxy de incerteza constante dentro de cada estrato — é a opção mais barata e mais **facilmente comunicável** (mas menos granular espacialmente, não captura variação dentro do estrato).

**Mais honesto estatisticamente**: combinação de **(1) desvio padrão do ensemble como incerteza relativa espacializada** + **(3) RMSE por estrato do hold-out espacial como calibração/escala absoluta** — o ensemble dá o *padrão espacial* da incerteza, o hold-out dá a *magnitude real* calibrada (o ensemble sozinho tende a ser otimista/subestimado).

### E21. Validação independente

- **Split espacial** (por célula ou faixa de borda, blocos ~1–5 km): obrigatório e prioritário — é o que mede se o modelo generaliza geograficamente, e é o teste mais alinhado ao sintoma diagnosticado (memorização local).
- **Split temporal** (treinar sem um ano, validar nele, quando B5 for implementado): mede estabilidade temporal — importante mas secundário até haver múltiplos anos de treino.
- **Validação externa** (IFN, produtos de referência do Pantanal — ex. comparar com mapas de biomassa publicados para o bioma): mede viés absoluto do produto, essencial antes de qualquer divulgação/uso do produto de carbono.

**Métricas a reportar**: RMSE, R² (ajustado ou de concordância — considerar índice de concordância de Lin além do R² simples, que pode mascarar viés sistemático), %Bias (viés relativo médio), e **viés por classe/estrato de biomassa** (não só global).

**Critérios de aceite sugeridos** (ajustar após primeira rodada de diagnóstico, mas como ponto de partida realista para produto de biomassa via GEDI+ópticos/SAR em 30 m):
- RMSE de validação espacial: dentro de ~25–35% do RMSE médio de `agbd` observado (produtos publicados de biomassa por sensoriamento remoto raramente ficam abaixo de 20–25% de erro relativo).
- %Bias: |viés| < 10% (sem tendência sistemática de super/subestimação por faixa de biomassa).
- Moran's I dos resíduos: próximo de 0 (ausência de autocorrelação residual estruturada) — este é o critério mais diretamente ligado ao sintoma atual.

### E22. Estruturar o QC da v07

- **Dispensar o merge, simular mosaico no QA**: gerar o mosaico simulado como etapa de **visualização/QA offline** (não como asset de produção) — rodar o `mosaic()`/`reduce` sobre a `ImageCollection PREDICTIONS/COL` só para inspeção visual e cálculo de métricas de borda (descontinuidade célula-célula), sem persistir como produto até a v07 estar validada.
- **Layout de assets para N membros de ensemble**: manter os N membros como **bandas de uma única imagem por célula/ano** (ex. `pred_member_1, ..., pred_member_N, pred_median, pred_std`) dentro da mesma `ImageCollection COL`, ao invés de N coleções paralelas — simplifica o `reduceRegions` de QA e evita explosão de assets (ver F25).
- **O que inspecionar primeiro**: 
  1. Moran's I / mapa de resíduos nas células que antes mostravam padrão pontilhado (v05/v06) — confirmar se `minLeafPopulation` + ensemble resolveram;
  2. Descontinuidade nas bordas entre células adjacentes no mosaico simulado;
  3. `pred_std` (incerteza) espacializada — áreas de alta discordância entre membros devem coincidir com áreas de baixa densidade de treino (validação de sanidade do próprio ensemble).

---

## Bloco F — Plano operacional v07

### F23. Passo a passo priorizado em fases

**Fase 0 — Diagnóstico barato (1–2 dias, custo GEE mínimo)**
- Ações: curva de aprendizado com CV espacial (A2), Moran's I dos resíduos atuais (v05/v06 vs v03), resíduo × `agbd_se`.
- Esforço: baixo (usa dados/modelos já existentes, roda majoritariamente fora do GEE em Python sobre tabelas exportadas).
- Custo GEE: mínimo (apenas exports de tabela, não de imagem).
- Risco: nenhum, é só instrumentação.
- Critério de saída: confirmação de que o padrão é overfit local (Moran's I alto + gap treino-validação alto) e não déficit real de covariáveis (A3).

**Fase 1 — Dados (thinning + peso por `agbd_se` + ano piloto)**
- Ações: thinning espacial (B6, 60–90 m), ponderação por `1/agbd_se²` (A4), piloto com 1 ano adicional (B5, ex. 2021).
- Esforço: médio.
- Custo GEE: baixo-médio (reextração de covariáveis para 1 ano extra).
- Riscos: viés temporal se a máscara florestal não for pareada por ano (B5) — mitigar antes de escalar.
- Critério de saída: melhora mensurável no RMSE de validação espacial e/ou redução do Moran's I residual.

**Fase 2 — Regularização e seleção**
- Ações: varredura de `minLeafPopulation` (C11), remoção de bandas redundantes por importância de permutação (C12), avaliação de log-transform (B7).
- Esforço: médio (várias rodadas de treino, mas leve computacionalmente — são só `train()`, não predição em imagem inteira ainda).
- Custo GEE: baixo (testar em subconjunto de células antes de aplicar ao bioma).
- Critério de saída: modelo único regularizado com gap treino-validação reduzido e sem perda relevante de sinal (comparar contra baseline v06).

**Fase 3 — Ensemble**
- Ações: implementar ensemble de predições (D15-17), N=5 membros RF (seeds + subamostragem de bandas/treino), combinação por mediana, empilhado em imagem única (D16).
- Esforço: médio-alto (mudança de arquitetura de predição/exports).
- Custo GEE: ~5× o custo de classificação de uma versão única — controlar rodando smoke test em subconjunto de células primeiro.
- Critério de saída: `pred_std` espacializado plausível, padrão pontilhado residual eliminado no mosaico simulado.

**Fase 4 — Incerteza e QA**
- Ações: gerar `pred_std` + calibração por estrato (E20), validação independente hold-out espacial + IFN (E21), QA de mosaico simulado (E22).
- Esforço: médio.
- Custo GEE: baixo (reduz sobre produto já gerado).
- Critério de saída: métricas de aceite (E21) atingidas; produto pronto para expansão ao bioma inteiro/anos completos.

### F24. Qual eixo traz mais ganho primeiro?

**Regularização (`minLeafPopulation`) primeiro**, não mais dados nem ensemble — porque:
- É a intervenção **mais barata** (não requer nova extração de dado nem multiplicar custo de predição).
- É a que tem **relação causal mais direta** com o sintoma descrito (folhas de árvore ajustadas a footprints únicos).
- Mais dados (B5) sem regularizar primeiro pode até **piorar** o padrão pontilhado no curto prazo (mais amostras = mais folhas específicas possíveis, se `minLeafPopulation` continuar baixo).
- Ensemble (Bloco D) é a "rede de segurança" que reduz variância residual **depois** que a regularização já limitou a capacidade de memorização por membro — ensemble de modelos já superajustados individualmente ainda vai produzir mediana pontilhada, só que menos.

Ordem de ganho esperado: **Regularização (C11) > Ponderação por `agbd_se` (A4) > Thinning (B6) > Ensemble (D) > Mais dados (B5)**. Mais dados entra por último entre as ações de maior impacto porque, isoladamente, sem regularização, tende a reforçar o sintoma ao invés de resolvê-lo.

### F25. Não explodir tasks/custo com a grade 4×4 × N predições

- **Um export por célula/ano/versão**, contendo **todas as N bandas do ensemble já empilhadas** (`ee.Image.cat`) — nunca N exports separados por membro.
- Rodar `reduce(median/stdDev)` **antes** do export sempre que possível, exportando `pred_median` + `pred_std` como produto principal, e guardando as N bandas individuais apenas em um subconjunto de células de auditoria/QA (não no bioma inteiro), para não multiplicar volume de asset por N desnecessariamente.
- Organizar a `ImageCollection COL` com propriedades `year`, `cell_id`, `version` consistentes (já existente) + `ensemble_n` como metadado, permitindo filtrar facilmente o que é produto final vs auditoria.
- Smoke test obrigatório: rodar o pipeline completo (Fases 2–3) em **5–10 células** representativas (incluindo pelo menos uma com padrão pontilhado conhecido e uma com baixa densidade amostral) antes de qualquer expansão para as ~150–200 células.

### F26. Estimativa de esforço/EECU e caminho incremental

- **Fase 0–1**: esforço de poucos dias-pessoa, custo EECU desprezível (tabelas, não imagens de bioma inteiro).
- **Fase 2**: dias a 1–2 semanas, custo EECU baixo (treinos múltiplos em subconjunto de células para varredura de hiperparâmetro, não predição em bioma inteiro ainda).
- **Fase 3**: maior salto de custo — smoke test em 5–10 células primeiro (custo EECU pequeno, minutos-horas), só depois expandir para o bioma completo (~150–200 células × 5 anos × N=5 membros) — aí sim o custo cresce de forma significativa e deve ser orçado/monitorado incrementalmente célula-a-célula ou em lotes, não tudo de uma vez.
- **Caminho incremental recomendado**: nunca pular direto de "smoke test em poucas células" para "bioma inteiro todos os anos" — expandir em lotes (ex. 20% das células por vez), validando custo real observado vs estimado antes de cada lote seguinte.

---

## Síntese — 5 recomendações priorizadas

**1. Aumentar `minLeafPopulation` (regularização direta) — testar 5/10/20/30 com CV espacial**
- *Por quê*: é a causa mais diretamente ligada ao sintoma (memorização de footprint único em folhas pequenas) e não muda nada além de um parâmetro do `train()`.
- *Como*: rodar Fase 0 (curva de aprendizado) + varredura de valores em subconjunto de células, comparando Moran's I residual e RMSE de hold-out espacial.
- *Custo estimado*: baixo — sem novas extrações de dado, apenas re-treinos em subconjunto de células (~horas de EECU).

**2. Ponderar amostras por `agbd_se` no treino**
- *Por quê*: usa informação já disponível (erro publicado do GEDI) que hoje é ignorada, reduzindo influência de rótulos ruidosos sem descartar dado.
- *Como*: `weight = 1/agbd_se²` (ou variante menos agressiva) no `classifier.train()`.
- *Custo estimado*: mínimo — mudança de uma linha na chamada de treino.

**3. Thinning espacial dos footprints (60–90 m) + split espacial em blocos para toda validação futura**
- *Por quê*: elimina autocorrelação espacial que infla otimisticamente a validação atual e contribui para leakage/memorização.
- *Como*: grade sistemática (1 footprint/célula de grade) como método principal; testar sensibilidade da distância.
- *Custo estimado*: baixo-médio — processamento de tabela, majoritariamente offline/Python.

**4. Ensemble de predições (RF, N=5, seeds+subamostragem de bandas/treino, combinação por mediana)**
- *Por quê*: ataca diretamente o componente de variância residual que sobrar após regularização, e gera o mapa de incerteza como subproduto — resolve duas lacunas (Bloco A e Bloco E) de uma vez.
- *Como*: empilhar N predições como bandas de uma imagem única, `reduce(median/stdDev)`, export único por célula/ano — smoke test em 5–10 células antes de escalar.
- *Custo estimado*: médio — ~5× custo de classificação de uma versão única, mas controlável com exports únicos e expansão em lotes.

**5. Sistematizar o gate offline (CV espacial K-fold) como etapa obrigatória antes de qualquer promoção de versão**
- *Por quê*: hoje existe mas não é sistemático — sem isso, decisões de hiperparâmetro/regularização continuam sendo guiadas por inspeção visual (o que já se mostrou enganoso: v05/v06 "parecia" melhor por ter mais dado, mas piorou objetivamente).
- *Como*: script/notebook padronizado que roda K-fold espacial (RF/GBM/SVR) sobre a tabela de treino exportada, produzindo RMSE/R²/%Bias por estrato + Moran's I — condição de saída obrigatória de cada fase do plano (F23).
- *Custo estimado*: baixo (é infraestrutura de processo, não computação pesada) — mas é investimento de engenharia recorrente que paga dividendos em todas as fases seguintes.

---

## Linha do tempo sugerida

| Semana | Atividade |
|---|---|
| 1 | Fase 0 — diagnóstico (curva de aprendizado, Moran's I, resíduo × `agbd_se`) + sistematizar gate offline (Recomendação 5) |
| 2 | Fase 1 — thinning + ponderação por `agbd_se` + piloto 1 ano adicional |
| 3 | Fase 2 — varredura `minLeafPopulation` + seleção de covariáveis + avaliação log-transform |
| 4 | Fase 3 — ensemble (smoke test em 5–10 células, depois expansão em lotes de ~20%) |
| 5 | Fase 4 — incerteza, validação independente (hold-out espacial + IFN se disponível), QA de mosaico simulado |
| 6 | Consolidação, critérios de aceite (E21), decisão de promoção da v07 |

---

## O que NÃO fazer

- **Não** aumentar o número de árvores (`numberOfTrees`) ou complexidade do modelo esperando resolver o sintoma — o problema é de granularidade de folha (`minLeafPopulation`), não de variância entre árvores (já bem controlada pelo bagging atual).
- **Não** expandir para 2019–2022 completo (B5) antes de resolver a regularização (F24) — risco real de amplificar o padrão pontilhado antes de atenuá-lo.
- **Não** adotar GBM como substituto do RF nesta fase — maior risco de overfit num cenário onde o RF já está superajustando; reservar GBM apenas como membro de ensemble com `shrinkage` conservador.
- **Não** implementar stacking (meta-modelo sobre ensemble) — complexidade desnecessária dado que o problema é de variância, resolvível por mediana simples.
- **Não** rodar o ensemble (Fase 3) direto no bioma inteiro sem smoke test em subconjunto de células — risco de custo EECU descontrolado sem confirmação prévia de que a arquitetura de export único (D16/F25) está correta.
- **Não** incluir a classe 7 (Savana Alagada) na v07 enquanto a máscara estiver "em pendência" — evita misturar ambiguidade de definição de classe com o diagnóstico de over/underfit que já está em curso.
- **Não** tentar importar modelo sklearn treinado externamente para `classify()` no GEE como caminho principal (D19) — tecnicamente contornável mas não vale o custo de engenharia frente às alternativas nativas disponíveis.
- **Não** tratar validação por amostragem aleatória (não espacial) como suficiente em nenhuma etapa daqui em diante — é o erro metodológico mais provável de mascarar regressões futuras.
