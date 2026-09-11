# MAPBIOMAS-CARBONO — Reflexão pantanal/grassland v02

> Respostas A1–G27 à `consulta_ia_v02.md`. Decisões acionáveis em negrito;
> as que entraram na implementação da v02 estão marcadas com ✅.

---

## Bloco A — Biomassa de referência e modelo Fonseca

### A1. Fonseca para vegetação não florestal do Pantanal? Alternativas
O modelo de Fonseca captura biomassa por RED/SWIR1/SWIR2 e funciona razoavelmente
em estratos baixos, mas foi calibrado para formações com linha de base florestal
e **vais a pino na faixa de baixa biomassa** (campos ≤ 2 Mg/ha). Para o Pantanal
recomendo testar, em ordem:

1. **Reajuste do log-linear de Fonseca nos próprios dados de campo** ✅ —
   `exp(a + b·RED + c·SWIR1 + d·SWIR2)` reestimado por OLS sobre `ln(biomassa)`
   de parcelas pantaneiras. Mantém portabilidade GEE e corrige o nível sem mudar
   a família funcional.
2. **Índices de vegetação com componentes de água** — `exp(a + b·NDVI +
   c·NDWI_gauss)` (fitfração de umidade). Campos do Pantanal têm "chão molhado"
   boa parte do ano; o NDWI penaliza o confundimento água/solo úmido.
3. **Família estacional de índice** — modelo com NDVI seco e NDVI cheia no mesmo
   ano (efeito hidroperíodo): `exp(a + b·NDVI_seco + c·NDVI_cheia)`.

**Mais robusta para baixa biomassa:** o log-linear mantém (o erro é relativo,
não absoluto), mas com limites explícitos — clampar predição em `[0.3, 12]` Mg/ha
para evitar explosão espectral fora do suporte de treino 🔥 **implementado**.
Referência regional para suporte: campos/planícies do Chaco e Pantanal (Fontana
et al.; NUF/UFMS) e o paradigma de índice-núcleo de Yang et al. 2021 para campos.

### A2. Bases de campo e mínimo amostral
- **Dados úteis:** parcelas publicadas de fitomassa (litter + parte aérea) de
  planícies aluviais (UFMS/UFMT, EMBRAPA Pantanal), inventários de savana, e
  amostragem **destrutiva de gramíneas** (quadrados 0,5 m², hastes + folhas).
- **GEDI em herbáceas: NÃO. ☁️** O espelho de 25 m e a modelagem RH (topo de
  dossel) têm precisão nula para gramíneas baixas; o sinal é quase todo ruído
  de backscatter/rugosidade. Use GEDI só para cotejo de estrato arbóreo-savânico.
- **Mínimo:** ~120–200 parcelas estratificadas, aceitável até ~60-80 em primeira
  rodada para **calibração provisória** (sem validação independente). Estratificar
  por: (i) classe C11 (11/12/50), (ii) fitofisionomia campestre, (iii) **regime de
  inundação** (seco/úmido/aluvial — divisor de águas no Pantanal).
- ❌ Não usar as 2000 amostras "samples_thinned" do gate florestal para campos:
  são células com biomassa de floresta.

### A3. Sazonalidade, umidade e pastejo
- O regime seca/cheia muda o espectro **muito mais que a biomassa** (água no
  solo e lâmina). Medir sempre na **mesma fase do hidrograma** (ideal: fim da
  seca, antes das primeiras chuvas, quando a palha dominou).
- **Viés folhas × colmo:** campo com colmo exposto sobe SWIR1 artificialmente.
  Medir a biomassa **acumulada** (parcela fechada) ou documentar data; usar
  composições no pico de biomassa.
- Pastejo/gado: coletar **dentro de cercados** ou excluir parcelas recentemente
  utilizadas; registrar utilização como propriedade binária na tabela.

### A4. Landsat vs HLS
- **Manter Landsat harmonizado L5–L9 (2023) para a v02.** A razão decisiva é a
  **série 2000–2023**: HLS só existe de 2013+; unificar sensor/harmonização na
  série vale mais que o ganho marginal de consistência do HLS em um ano só.
- Planejar HLS apenas se a decisão de produto passar a ser **"séries curtas e
  recentes"** (2016+). Reducir custo: usar `prepTmEtm/prepOli` + QA_PIXEL como já
  está, sem o mosaico de covariáveis florestal.

---

## Bloco B — εCA e Monteith

### B5. Monteith em campos inundáveis
Monteith é aplicável (a luz absorvida governa), mas a **εCA de Pampa é
inadequada para solo alagado**, onde a respiração anaeróbica e o estresse de
alagamento derrubam a eficiência de conversão aparente. → **εCA deve variar por
**estado hidrológico**, não só por mês**: implementar modulador `f(cheia)`
desligado por padrão e ativável quando houver máscara de inundação ✅ (campo
`ECA_MODULATE_CWD/ECA_MODULATE_FLOOD` no contrato).

### B6. Calibrar εCA sem torre de fluxo
- **Método 1 (recomendado):** razão `MOD17A2H GPP / ΣPARa` reconstruída por
  classe — gera ε_aparente mensal observada a partir das mesmas entradas
  (fPAR/DSR), sem torre.
- **Método 2:** literatura regional de campos inundáveis (valores 0.1–0.6
  gC/MJ PAR em gramíneas; faixa do Pampa já usada como ponto de partida).
- **Risco a comunicar:** GPP do MOD17 tem assinatura de produtividade própria;
  usar só como **tendência/direção**, não como verdade.
- Passos: exportar ε_aparente mensal média por classe → machine-plota χ² → se a
  diferença ao Pampa > ±30% em >2 meses, adotar ε_ajustada como tabela v02.

### B7. Moduladores (CWD/temperatura)
- **Sim**, e de graça: o Monteith florestal já implementa `min(1, CWD/200)`;
  portar o mesmo por **solo seco** (déficit) é barato e reduz falsa produção em
  anos secos. Temperatura no Pantanal raramente limita gramíneas C4 — **não
  adicionar** (custo desnecessário).
- Implementado como **gate de contrato**: `ECA_MODULATE_CWD = false` por padrão,
  coerente com a primeira rodada (conservador), pronto para ligar.

### B8. Fator 0,48 (DSR→PAR)
- 0,48 é o padrão global e aceitável para o Pantanal (lat. −15 a −22; varia
  pouco com a massa de ar). **Sensibilidade dominada**, na prática, pelo fPAR
  (fator ≈1,5× erro do 0,48). Não gastar esforço em medir o 0,48; **documentar**
  e reportar sensibilidade de ±0,03 → ±6% no ANPP.

---

## Bloco C — Entradas MODIS e cheia

### C9. Artefatos de água na fPAR/DSR
- Sobre lâmina d'água o MOD15 fPAR é **inválido/sobrestimado** (o produto assume
  vegetação). **Detectar e mascarar com NDWI de Landsat** (composição seca) +
  cheia dinâmica (composição por mês): bandas de água permanente → `mask_water`
  fixa (NDWI_seco > 0) e `mask_flood` mensal.
- Impacto: lagoas permanentes (≈1–3% do bioma) **entram na média mensal** hoje e
  criam bolsões de falso ANPP adjacentes a bordas.
- 🔥 **Implementado (gate):** `MASK_WATER` e `MASK_FLOOD` no contrato; a v02
  liga **`MASK_WATER = true`** (água permanente) e deixa `MASK_FLOOD` opcional
  porque a máscara dinâmica por ano é etapa de fase 4.

### C10. Reamostragem bilinear 500 m→30 m
- O detalhe 30 m é nominal para variáveis MODIS. **Alternativa mais barata e
  coerente: reamostrar uma única vez no fim** (pipeline atual já reduz quase a
  isso, mas há dupla reamostragem DSR→grid fPAR). Simplificação: manter bilinear
  (evita blocado), aceitar a incerteza e **documentar resolução efetiva ~500 m**
  no relatório. Não vale reprojetar a série inteira em 30 m a cada passo.

### C11. QC de Fpar/DSR
- **Usar `Fpar_QC`** para mascarar aquisições de baixa confiança; DSR tem QC
  próprio (`DSR_QC`) — mascarar nuvem/sombra (bits de menor qualidade). O
  produto 061 não tem a "lacuna" célebre do 006 para o Brasil com a frequência
  que se via; **fallback**: preencher mês sem FAE com interpolação temporal
  local (média dos dois meses adjacentes) antes de somar o ANPP anual.
- Implementar máscara de QA no **campo `USE_QC`** (true na v02) ✅.

### C12. Sanity check do ANPP
- Comparar contra **MOD17A3H NPP** e GPP-igbp, e **SIF GOME-2/TROPOMI** (relação
  com GPP, não com biomassa). Faixa plausível de campos do Pantanal:
  **~1.5–8 t MS/ha/ano** (campos secos ~2–4; aluviais úmidos até ~8). Faixa de
  alerta: > 10 → revisar antes de publicar.

---

## Bloco D — Definição de "campo"

### D13. Classes {11, 12, 50} bastam?
- **Ficam para a predição em todo o território** (req. do usuário): a v02
  **não mascara mais o produto** — a máscara C11 vira **subconjunto de análise,
  não filtro de produção** ✅.
- Fronteira savana (classe 4 / savana arbórea) em Pantanal é transição real;
  excluí-la da "área campestre" está correto. Classe **21 (pastagem)** deve
  ficar **fora do produto de carbono** (uso antrópico) — o corte é automático
  porque o LULC não é mais usado para mascarar produção, apenas para rotular
  estatísticas. Para não arrastar paisagem antropizada: usar a **estabilidade
  do LULC** (C15) apenas na fase de elegibilidade/liberação do carbono.

### D14. Máscara fixa vs por ano
- Para **produto**: irrelevante na v02 (não há máscara de produção). Para
  **área de estudo/estatística**: usar máscara **por ano** (classificação do
  próprio ano) — reflete a dinâmica do alagável; registrar "área campestre C11
  ano" em cada CSV de estatística para os pulos não virarem tendência.

### D15. Elegibilidade (pixels estáveis)
- **Sim para o produto de carbono**: criar banda `elig_carbon` = LULC ∈
  {11,12,50} **em todos os anos do triênio** (e.g., 2021–2023) antes do ano
  alvo. Implementado como **banda opcional já no contrato**
  (`STABILITY_YEARS`), ligada na fase 4 — não substitui a produção integral.

---

## Bloco E — Estoque e fluxo

### E16. Fração 0,47
- 0,47 é razoável para tecido seco (gramíneas 0,44–0,49; menores com mais
  lignina/umidade). **Manter 0,47 documentado** como valor único; admitir por
  fitofisionomia só com medições de tecido (projeto piloto). Percentual de C na
  matéria seca é mais estável que o erro de biomassa — **baixa prioridade**.

### E17. Raízes
- Mercado de carbono espera **AGC/AGB** por enquanto (protocolos florestais); o
  carbono radicular de campos **é relevante (~30–50% do total)** mas pouco
  medido. **Entregar AGC (só parte aérea) e documentar raiz:parte aérea** como
  fator opcional (campo `ROOT_SHOOT_K` no contrato; `0.0` na v02 = só AGC) ✅.

### E18. Estoque ≠ fluxo (confirmar decisão v01)
- **Confirmado:** somar biomassa acumulada + ANPP no mesmo pixel é
  **fisicamente inválido** (contagem dupla de produção em estoque). Separar
  estoque (Mg C/ha) e fluxo (kg MS/ha/ano) é a decisão correta e fica na v02.
  Exceção legítima: produto "produção líquida do ano" (só quando modelo de
  turnover existir) — fora de escopo.

### E19. Unidades de entrega
- Entregar **bandas nativas** (kg MS/ha e Mg C/ha) + banda derivada
  **Mg CO₂e/ha** (`× 44/12`) **só na camada de apresentação**; arredondamento:
  **1 casa** em Mg/ha, **0 casas** em kg/ha. Relatório documenta
  `= 0,47`, `raiz:parte aérea`, resolução efetiva e faixas de validade.

---

## Bloco F — Validação e incerteza

### F20. Validação mínima + critérios de aceite
- **Dados:** 20–30% das parcelas reservadas (estratificada). **Métricas:**
  RMSE, RMSE%, R² (log), **%Bias**, e viés por classe e por regime de cheia.
- **Critérios de aceite (v02):** `%Bias` |±15%| e `RMSE% < 65%` em biomassa
  (campos são difíceis; 65% é ambicioso). ANPP: validar **direção** (rank) e
  faixa, não pixel.

### F21. Mapa de incerteza
- **Propagar é viável e barato** se for por **intervalo de estrato**: estimar
  εCA e o erro da biomassa **por classe×cheia**, e aplicar como faixa
  (`biomassa ± k·σ_estrato`). **Bootstrapping pixel a pixel: não** (custa ~10×
  e o ganho é marginal sem parcelas densas). Entregar banda `unc_*` quando a
  calibração de campo existir; na v02 o que sai é o **QA de suporte/domínio**.

### F22. Série 2000–2023
- **Viável.** Mínimo consistente: **2000–2023** usando o mesmo modulador L5–L9
  (SLC-off 2012 tratado com col centróide/máscara QA + interpolação anual;
  MODIS 061 cobre todo o período). **Recomendação para a v02:** ainda **2023**
  (um ano) — a série completa é **fase 4** (custo EECU alto, melhor após
  estabilizar método em um ano). Se houver demanda, 2016–2023 como 
  sub-conjunto de demonstração.

### F23. QA da v02
- **Comparar v00 vs v01 vs v02 no mesmo ano (2023)** com: mapa de
  diferença `v02−v01`, dispersão de biomassa anual, área de cobertura
  (v01 ≈ 11–15% do bioma por causa da máscara vs v02 = bioma inteiro),
  e **QA numérico** (min/max/mean por classe) agregado por região. Ordem de
  liberação: QA visual → QA numérico/estatística → cota do usuário.
- ✅ `6_qa.js` da v02 implementa o comparativo e o QR das faixas de suporte.

---

## Bloco G — Plano operacional v02

### G24. Ordem das fases (criterios de saída)
| Fase | Ações | Esforço | Custo GEE | Critério de saída |
|---|---|---|---|---|
| 0 diagnóstico | rodar v01+máscaras+cheia; mapear artefatos | baixo | — | lista de artefatos fechada |
| 1 campo | coletar/importar parcelas → asset | médio | baixo | field asset + matriz de calibração |
| 2 biomassa | refit log-linear + clamp | baixo | baixo | fit válido (RMS log) |
| 3 predição toda área ✅ | unmask produto, QA v00/v01/v02 | baixo | médio | QA OK, faixas plausíveis |
| 4 cheia/εCA | máscaras água+flood, εCA por estado | médio | médio | ε_aparente vs Pampa ≤30% |
| 5 série+incerteza | 2000–2023, banda de incerteza | alto | alto | aceite F20 por ano |
| 6 stats bioma ✅ | CSV n0/n1/marcador/total por classe em todo o bioma | baixo | baixo | somas conferem |

### G25. Maior incerteza dominante
**A biomassa (Fonseca), não o εCA.** O εCA do Monteith "a planta absorveu X,
produziu fração Y" é uma razoabilidade média; o Fonseca herdado do Pampa tem
**nível (bias) possivelmente errado para o Pantanal** — dominante no produto de
CARBONO em t/ha (que é biomassa × fração). **Investir primeiro em campo+refit
(biomassa); depois em εCA/cheia.**

### G26. Custo/tasks
- **Evitar exports mensais × ano** desnecessários: consolidar **imagens anuais
  como assets** (como já é) e usar **`col.first()` por decêndio só quando
  preciso**; para estatística, reduzir com `ee.Reducer` agrupado (já feito no
  stats_engine).
- Bioma inteiro em uma export única é OK em EECU; **dividir em tiles só se uma
  export estourar quórum** (grade 150–200 células ON DEMAND, não por padrão).
- Fase nascente da série: 30 produtos/ano é o maior custo; **rodar somentes
  annual assets e derivar banda de incerteza por estrato** (não por banda).

### G27. Esforço/EECU e linha do tempo
- **Linha do tempo:** fase 0–3 (2 semanas) → fase 4 (2–3 semanas) → fase 5
  (4–6 semanas) → fase 6 (1 semana). Total ~8–12 semanas de 1 pessoa + parcelas
  de campo.
- **EECU:** rodada única biome 2023 ≈ 1–3k EECU; a série 2000–2023 ≈ 20–60k
  dependendo de exports; stats por bioma ≈ <200 EECU.

### "O que NÃO fazer"
1. **Não usar células do gate florestal como "verdade" de campo** (biomassa de
   floresta ≠ campo).
2. **Não mascarar a predição com LULC na v02** — máscara é para rotular/análise;
   produto sai para todo o bioma (e assim a estatística cobra tudo).
3. **Não somar estoque + fluxo** no mesmo pixel (contagem dupla).
4. **Não portar εCA do Pampa sem ver a assinatura de GPP** — nem aumentar
   temperatura como modulador (C4 não sofre).
5. **Não usar GEDI em herbáceas** nem fundir com amostras de savana arbórea.
6. **Não reamostrar MODIS em 30 m a cada passo**; uma única reamostragem no
   output e documentar resolução efetiva.
7. **Não publicar 2000–2023 sem cheia/água resolvida** — os pulos do hidrograma
   virariam "tendência" falsa.
8. **Não deixar Fonseca com faixa ilimitada** — clamp de suporte é obrigatório.

---

## 5 recomendações priorizadas

1. **Predição em todo o bioma + stats do bioma inteiro (impactoALTO, esforçoBAIXO)** ✅
   - Por quê: req. explícito do usuário; remove viés de cobertura da máscara.
   - Como: unmask para os 3 produtos; stats lêem LULC para rotular classes, sem
     filtrar produção; QA compara v00/v01/v02.
   - Custo: ~1 export a mais de comparação.
2. **Refit do Fonseca nos dados de campo + clamp de suporte (impactoALTO, esforçoMÉDIO)** ✅ (arquitetura pronta; fit depende de parcels)
   - Por quê: maior incerteza dominante (G25); o nível importa p/ carbono.
   - Como: `2_1` amostra covariáveis nas parcelas → awk fit offline (`2_3_gcn`)
     → `biomass_model.json` → contrato. Clamp `[0.3,12]` Mg/ha aplicado na
     predição (provisório até o fit).
   - Custo: baixo em GEE; esforço no campo.
3. **Máscara de água (permanente) e uso do QC de fPAR/DSR (impactoMÉDIO, esforçoBAIXO)** ✅
   - Por quê: artefatos de lagoas/lâmina corrompem ANPP mensal.
   - Como: NDWI seco → `mask_water`; `Fpar_QC/DSR_QC`; gates no contrato.
   - Custo: <100 EECU.
4. **εCA por estado de cheia (impactoMÉDIO, esforçoMÉDIO)** 🔲 fase 4
   - Por quê: hidrograma domina a fisiologia campestre.
   - Como: modulador de cheia/CWD desligado por padrão; calibrar via razão
     `MOD17 GPP/ΣPARa`.
   - Custo: ~200–400 EECU.
5. **Série 2023→2000–2023 por fases (impactoMÉDIO, esforçoALTO)** 🔲 fase 5
   - Por quê: é o produto de fato para carbono; mas só depois de biomassa+cheia.
   - Como: manter 2023 na v02; série em módulo separado com col SLC-off.
   - Custo: 20–60k EECU, apenas quando método estabilizar.