# MAPBIOMAS-CARBONO — Consulta estratégica pantanal/grassland v02 (biomassa + ANPP Monteith + estoque de carbono)

> Você **não terá acesso ao código**. Todo o contexto necessário está neste arquivo.
> Responda em **português**, objetivo, com recomendações acionáveis e passo a passo priorizado.

## 1. Contexto (resumo autossuficiente)

### 1.1 Objetivo
Mapa anual, resolução de **30 m**, das **formações campestres do Pantanal**:

| Produto | Unidade |
|---|---|
| Biomassa seca (média mensal e anual) | kg MS/ha |
| ANPP mensal | kg MS/ha/mês |
| ANPP anual (soma dos 12 meses) | kg MS/ha/ano |
| Estoque de carbono (derivado da biomassa anual) | Mg C/ha |

### 1.2 Método atual (protótipo v00 + pipeline v01)
**Modelo de Monteith (1977): ANPP = εCA × ΣPARa**

- **PARa mensal** (MJ/m²/mês) = soma sobre composições MODIS de 4 dias de:
  `fPAR × (DSR × 0,48) × 4 dias`
  - `fPAR` = MODIS MCD15A3H × 0,01 (500 m), reamostrado bilinear para a grade do DSR
  - `DSR` = MODIS MCD18A1 (W/m² → MJ/m²/dia: × 86400 × 1e-6; 1 km), média dos 4 dias da composição
  - `0,48` = fração PAR/DSR (radiação fotossinteticamente ativa)
- **εCA** = tabela mensal de eficiência de conversão (gMS/MJ), **herdada do Pampa** (ex.: mar 0,315 · abr 0,286 · mai 0,257 · jun 0,154 · jul 0,083)
- **Biomassa mensal** = Landsat harmonizado L5/L7/L8/L9 (Roy et al. 2016) + modelo log-linear de **Fonseca et al.**:
  `exp(5,8195 + 26,1616·RED + 21,6240·SWIR1 − 48,9521·SWIR2)`; média mensal → anual
- **Estoque de carbono** = `biomassa_anual × 0,47 / 1000` (Mg C/ha)

### 1.3 Máscara
`Pantanal ∩ classification_<ano> ∈ {11, 12, 50}` (11 = área úmida, 12 = formação campestre, 50 = restinga herbácea) — MapBiomas **Coleção 11**. O protótipo original (Pampa) usava **col.10.1** com `{12, 50}`.

### 1.4 Pipeline (Google Earth Engine)
Módulos da v01: `0_contract` (ano/classes/asset root), `0_sensor_landsat_modis`, `2_mask_grassland`, `3_biomass`, `4_anpp`, `5_carbon_products`, `6_qa`. Produtos exportados em assets separados (`BIOMASS`, `ANPP`, `CARBON`). Origem histórica: protótipo monolítico do **Pampa** (v00) → adaptação **Pantanal** (v00) → modular (v01).

### 1.5 Situação atual / lacunas
- **Coeficientes herdados do Pampa**: εCA mensal, modelo Fonseca e fração de carbono 0,47 são **hipóteses provisórias** — nenhuma calibração específica do Pantanal.
- **Sem dados de referência/parcelas de campo** para validar biomassa ou ANPP.
- **Validação quantitativa ausente** (o QA só inspeciona tipos de banda e faixas de valor).
- **Sem mapa de incerteza**.
- **Sem tratamento da cheia/inundação** — o Pantanal é sazonalmente inundável; fPAR/DSR sobre água ou lâmina rasa podem gerar artefatos. Também há lagoas/rios permanentes dentro do bioma.
- **Série temporal limitada a 2023**, embora Landsat (→2000) e MODIS (→2000) permitam 2000–2023.
- **Sem estratificação** por fitofisionomia (campo limpo × campo sujo × savana gramíneo-lenhosa) no modelo ou na validação.
- Estoque e fluxo já são tratados como grandezas separadas na v01 (não somados).

### 1.6 Restrições operacionais (importantes para as respostas)
- Tudo roda **server-side no Earth Engine**; para uso final (mercado de carbono) é preciso decidir unidades do produto.
- MODIS é reamostrado **500 m/1 km → 30 m** — o detalhe espacial nominal de 30 m é ilusório para variáveis MODIS.
- A calibração de coeficientes pode exigir **estatística fora do GEE** (Python), o que é permitido — a predição é paramétrica fixa e roda no GEE.
- Custo/EECU importa: grade de ~150–200 células ou bioma inteiro; exports mensais × ano multiplicam tasks.

## 2. Perguntas

### Bloco A — Biomassa de referência e modelo Fonseca
1. O modelo log-linear de Fonseca (RED/SWIR1/SWIR2) é apropriado para vegetação **não florestal** do Pantanal? Recomende 2–3 equações regionais alternativas para campos/gramíneas (com referência) e qual é mais robusta para baixa biomassa.
2. Quais bases de **dados de campo** servem para validar/calibrar o Pantanal (parcelas publicadas, Radambrasil/FPB, inventários, UAV-LiDAR, GEDI)? Avalie a aplicabilidade do **GEDI em herbáceas** (biomassa baixa, espelho de 25 m). Qual o número mínimo de parcelas e a estratificação sugerida (classe, fitofisionomia, nível de inundação)?
3. Como a **sazonalidade** (seca/cheia), a umidade do solo e o pastejo afetam a assinatura espectral da biomassa? Qual o **momento ideal do ano** para medir/validar biomassa seca e como evitar viés de folhas vs colmo?
4. Migrar a biomassa do **Landsat harmonizado para HLS** (como no pipeline de floresta) ou manter L5–L9? O que pesa mais: consistência multitemporal 2000–2023 ou custo?

### Bloco B — εCA e modelagem Monteith
5. Monteith é adequado a **campos inundáveis**? A eficiência εCA deve variar por **estado da cheia** (seco / inundado / vazante) e mais, não só por mês?
6. Como calibrar εCA no Pantanal **sem torre de fluxo**: comparar com MOD17 (GPP/NPP), razão `NPP_observado / PARa_observado`, séries de GPP de satélite, ou referências bibliográficas regionais? Passos práticos e riscos.
7. Devo incorporar **moduladores** na εCA, como **déficit hídrico (CWD)** e temperatura média (usados no pipeline de floresta), dada a forte variabilidade interanual do hidrograma do Pantanal? Um εCA fixo mensal é suficiente?
8. O fator **0,48** (DSR→PAR) é adequado a latitudes tropicais/Pantanal? Quão sensível é o produto ANPP à incerteza desse fator?

### Bloco C — Entradas MODIS e dinâmica da cheia
9. **Artefatos de fPAR/DSR sobre água** ou área inundada: como detectar e mascarar (NDWI, máscara dinâmica de inundação, MOD44W, séries de Landsat)? Qual o impacto de lagoas/rios permanentes na média mensal e na tendência?
10. Reamostragem **bilinear 500 m → 1 km**: perda de detalhe e, depois, o produto em 30 m. Vale reprojetar na grade final apenas na saída? Há alternativa mais barata e coerente?
11. **Qualidade das bandas**: usar `Fpar_QC`/`DSR_QC`? Como tratar nuvem/sombra e a lacuna citada do produto 061? Recomendações práticas de filtragem.
12. Para **sanity check** do ANPP: comparar com MOD17A3H (NPP anual), GPP-igbp, SIF (GOME-2/TROPOMI)? Quais faixas plausíveis para campos do Pantanal (kg MS/ha/ano)?

### Bloco D — Definição de "campo" (máscara LULC)
13. As classes `{11, 12, 50}` são suficientes no Pantanal? Fronteira com **pastagem/uso antrópico** e com savana (classe 4?) e savana alagada — incluir ou excluir? Como evitar **arrasto de paisagem antropizada** no produto de carbono?
14. A classe **área úmida (11)** muda ano a ano: máscara **fixa vs por ano**? Efeito na série temporal (pixels que entram/saem criam pulos artificiais de produção)?
15. Para um produto de carbono, devemos **excluir pixels com conversão recente** (regra de elegibilidade — ex.: estável nos últimos N anos antes do ano-alvo)? Como implementar com o LULC disponível?

### Bloco E — Estoque de carbono e fluxo
16. A fração de carbono **0,47** é adequada para gramíneas (varia com lignina e umidade)? Qual faixa usar por fitofisionomia e como documentar a escolha.
17. **Raízes**: incluir biomassa abaixo do solo (raiz:parte aérea de campos do Pantanal) ou manter **AGC**? O que o mercado de carbono espera (AGC vs AGBC vs total)?
18. A lógica **"Biomassa + ANPP"** do protótipo v00 (somar estoque e produção no pixel) é fisicamente válida para algum produto? Confirme que **separar estoque e fluxo** (decisão da v01) é o correto.
19. **Unidades finais do produto**: kg MS/ha, Mg C/ha, Mg CO₂e/ha — o que entregar, com que arredondamento/precisão, e como comunicar em relatório metodológico?

### Bloco F — Validação e incerteza
20. Plano de **validação independente mínimo** para campos: quais dados, quais métricas (RMSE, R², %Bias, viés por classe/estrato) e quais **critérios de aceite** você recomenda para um produto de carbono (e.g., %Bias < X, RMSE% < Y)?
21. **Mapa de incerteza**: propagar incerteza de εCA, fPAR e do modelo de biomassa é viável? Bootstrapping simples ou intervalos por estrato? O que é estatisticamente honesto dado o custo GEE?
22. **Série 2000–2023**: viável e quanto custa? Validação ano a ano; problemas de consistência (gap L7 SLC-off, mudança de coleções, MODIS sem dados?). O que recomenda para primeira série (ex.: 2016–2023)?
23. **QA da v02**: comparar v00 vs v01 vs v02 no mesmo ano; mosaicos anuais; ordem de inspeção visual e de estatística antes de liberar o produto.

### Bloco G — Plano operacional v02
24. **Ordem das fases** (diagnóstico → validação/calibração do modelo Fonseca → calibração de εCA → cheia/máscara → série e incerteza → QA). Para cada fase: ações, esforço, custo GEE, riscos e **critério de saída**.
25. Onde está a **maior incerteza dominante** do produto hoje: biomassa (Fonseca) ou εCA (Monteith)? Onde investir primeiro para reduzir risco do produto.
26. Como **não explodir tasks/custo** (bioma inteiro, exports mensais × ano, ~30 produtos por década): emissão de assets consolidados, explorar via ImageCollection `col`, lazy vs eager. Recomendações concretas.
27. Estimativa de **esforço/EECU** e **linha do tempo sugerida**; e a seção **"o que NÃO fazer"** (erros típicos de quem adapta coeficientes Pampa→Pantanal).

## 3. Formato da resposta pedido
- Responda **todas** as perguntas numeradas (A1–G27), em português.
- Encerre com: **5 recomendações priorizadas** (impacto × esforço), uma **linha do tempo sugerida** e uma seção **"o que NÃO fazer"**.
- Para cada recomendação, informe: *por quê*, *como*, *custo estimado*.