# COLLECTION_00 — Cofre de conhecimento

> Organização dos scripts da Coleção 0 (amostras GEDI para AGC) do MAPBIOMAS-CARBONO.

## Decisão de arquitetura: um script por região/bioma

A Coleção 0 foi **subdividida em 2 scripts**, um por bioma/região:

| Script | Região | Asset base (GEE) | Grids |
|---|---|---|---|
| `cerrado/mb_carbon_agc.js` | **Cerrado** | `projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/CERRADO_FOREST/SAMPLES` | 14 tiles (`t0_0` … `t3_3`) |
| `pantanal/mb_carbon_agc.js` | **Pantanal** | `projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/SAMPLES` | 1 grid (bioma completo) |

### Por quê?

O **Pantanal pode divergir do Cerrado a partir daqui**: grids, covariáveis,
filtros, escala e parâmetros podem evoluir de forma independente. Manter um
único script genérico obrigaria a condicionais `if (regiao === 'pantanal')`
espalhadas pelo código. Com um script por região, **cada um evolui no seu
próprio ritmo** sem risco de quebrar o outro.

> Trade-off aceito: os dois scripts hoje duplicam ~490 linhas do núcleo
> (filtro GEDI, covariáveis, pipeline de export). Isso é **intencional** —
> independência vale mais que DRY neste caso.

## Convenções compartilhadas (mantidas iguais nos 2 scripts hoje)

- **Estratégia `evaluate()` (sem `getInfo`)**: a função principal que cria os
  exports (`runMain`) só roda **depois** de baixar, via `evaluate()`, as
  variáveis importantes de cada região — lista de granules (`EVALUATE #1`) e
  total de pegadas filtradas (`EVALUATE #2`).
- **Intervalo de datas `[inicio, fim)`**: fim **exclusivo** — `(YEAR+1)-01-01`,
  não `YYYY-12-31` (senão o último dia do ano é perdido). A versão anterior
  (`gte/lte` + `12-31`) fica preservada em comentário no script para discussão
  com a equipe.
- **Export duplicado**: Google Drive (CSV, pasta compartilhada
  `GEE_Exports_AGC-v3`) **e** Assets GEE (FeatureCollection). Cada `Export.*`
  recebe `.start()` explícito (dentro de callback o auto-start não dispara).
- **Fallback de ano**: se o ano configurado não tiver granules, tenta `YEAR-1`.
- **LULC Coleção 11**: a covariável MapBiomas usa
  `projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3`
  (banda `classification_<ano>`). Fallback da C10.1 fica preservado comentado no
  script. Nota: se o asset da C11 ainda não estiver acessível no GEE, reverter.
- **Só saídas**: sem EDA/gráficos (ver `mb_carbon_flow_map.md` na raiz).

## Como adicionar uma nova região/bioma

1. Crie a subpasta `COLLECTION_00/<regiao>/` e copie um dos scripts existentes.
2. Ajuste **3 pontos**:
   - `ASSET_BASE` → nova pasta no Assets GEE;
   - `GRIDS` → coordenadas da região (mantendo os formatos existentes);
   - `ACTIVE_GRIDS` → id do grid principal da região.
3. Ajuste o cabeçalho (PROJETO/SCRIPT/COMO USAR) para a nova região.
4. (Opcional) Crie as pastas-pai no Assets GEE antes do primeiro export.

## Como divergir

Cada script é **independente** — altere covariáveis, filtros, escala ou
parâmetros **apenas no script da região afetada**. Nenhuma mudança propaga para
o outro script automaticamente (é manual), então documente a divergência aqui.

## Expansão para outras coberturas/usos — decisões (sem scripts por ora)

Hoje **só existem scripts de Floresta** (método GEDI) para **Cerrado** e
**Pantanal**. As demais coberturas/usos estão registradas **apenas como
decisões neste cofre** — **nenhum script** será criado até a equipe definir
método e regiões. Legenda de referência: **MapBiomas Coleção 11**.

| Cobertura/uso | Classes C11 (códigos) | Nível 1 (legenda) | Status |
|---|---|---|---|
| Floresta (atual) | 3, 4, 6, 7β, 49 | Floresta | ✅ scripts Cerrado/Pantanal |
| **Carbono azul** | 5 Mangue, 84 Marisma β, 32 Apicum, 49/50 Restingas | Floresta + Veg. Herbácea e Arbustiva | 🕒 método TBD |
| **Campestres** | 12 Form. Campestre, 77 Form. Herbácea Arbustiva, 11 Campo Alagado/Pantanosa | Veg. Herbácea e Arbustiva | 🕒 método TBD |
| **Agropecuária** | 15 Pastagem, 18 Agricultura (+ subdivisões N3/N4) | Agropecuária | 🕒 método TBD |

Pendências a decidir (não bloqueiam nada):
- **Método não-florestal**: GEDI L4A não se aplica a biomassa baixa/não-arbórea.
  Opções: campo + ML com o stack de covariáveis atual, ou fatores de
  estoque/literatura (SEEG).
- **Regiões iniciais** por cobertura (ex.: carbono azul → zona costeira).
- **Nomenclatura dos assets** por cobertura (hoje `REGIAO_COBERTURA`).

## Legenda MapBiomas Col. 11 — inteligência (nos scripts)

A **seção 7** dos dois scripts é um bloco **copiável** para outros scripts:

- `MAPBIOMAS_LEGEND` — objeto `código → {nome, cor}` com as 35 classes da C11
  (inclui as novas: 7 Savana Alagada β, 77 Form. Herbácea Arbustiva,
  84 Marisma β, 91 Parque eólico β).
- `MAPBIOMAS_LEVEL1` — resumo das 5 classes do nível 1.
- `MAPBIOMAS_VIS` — visParams prontos `{bands:['classification'], min:0, max:91,
  palette}` (palette gerada do objeto, alinhada por código).
- `addMapBiomasLegend()` — legenda **discreta** no canto inferior esquerdo:
  `margin/padding 0px`, `font-size 12px`, `max-height 60%` (com scroll),
  swatch de 12px + nome por linha.
- Diagnóstico: `Map.addLayer(lulc C11, MAPBIOMAS_VIS, ...)` +
  `addMapBiomasLegend()`.

## Nota — pastas no Assets GEE

As pastas-pai devem existir no Assets antes do export:
- `MAPBIOMAS / CARBON / MAPPING / COLLECTION_00 / CERRADO_FOREST / SAMPLES`
- `MAPBIOMAS / CARBON / MAPPING / COLLECTION_00 / PANTANAL_FOREST / SAMPLES`

## Referência

- Mapeamento completo do notebook → JS: `mb_carbon_flow_map.md` (raiz).