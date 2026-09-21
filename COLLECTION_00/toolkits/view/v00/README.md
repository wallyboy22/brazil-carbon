# toolkit view/v00 — QA visual genérico (MapBiomas Carbono)

App interativo (GEE Code Editor) para **QA visual** das camadas do projeto:
resultados (Cerrado Florestal · Pantanal Florestal · Pantanal Campestre),
referências (benchmarks/CN) e auxiliares (Uso e Cobertura MapBiomas C11),
filtráveis por **bioma, UF, região ou Brasil**.

## Uso
Rodar `run/run_view.js` no Code Editor. O painel esquerdo permite:
- **TERRITÓRIO**: Bioma / UF / Região / Brasil (assets do próprio projeto) +
  seleção de regiões (vazio = todas);
- **MapBiomas Carbono** (gavetas): **Cerrado Florestal** · **Pantanal Florestal** ·
  **Pantanal Campestre** — checkboxes por versão;
- **Referência** (gavetas): uma gaveta **por fonte** (Saatchi, Baccini, Zimbres,
  Avitabile, Xu & Saatchi, TCN, QCN, QCN-r, **IFN**);
- **Auxiliares** (gavetas): **Uso e Cobertura (C11)** · **MapBiomas Pastagem**
  (biomassa 2023) · **MapBiomas Solo** (carbono orgânico 2023);
- **LEGENDAS** (gaveta única, sem subgavetas): **Mín/Máx global** (textbox que
  sobrescrevem o min/max de todas as rampas — legenda **e** mapa), **Opacidade**,
  as **barras de cor** (esticadas horizontalmente) por rampa distinta e, **abaixo**,
  a **legenda do Uso e Cobertura (C11)** — que só aparece quando o C11 está ligado.

> As camadas **Forest** aparecem como **`Pantanal Forest vXX`** e **`Cerrado
> Florestal vbeta1`**. Camadas cujo asset ainda **não existe** (ex.: `v08
> GEDI/IFN`) são **ignoradas** automaticamente — o app só lista o que existe.
> A gaveta **IFN** traz as parcelas de campo do Inventário Florestal Nacional
> rasterizadas com `ee.Image().paint(fc, coluna)` (AGB, carbono, CO2e, área
> basal, nº de indivíduos, AGB total).

No cabinet **CONTROLES** (fora das gavetas de camadas) há dois toggles:
- **MAP ON/OFF**: mostra/esconde todas as camadas do mapa;
- **THUMBNAILS ON/OFF**: abre o painel direito (SplitPanel) com a grade de
  miniaturas cruzando **camada × território** (só os itens marcados), com
  controles de dimensão, tamanho, layout (permutações dos eixos), inverter e
  limpar memória. O título de cada miniatura mostra **camada · território**.

> `run/run_simple.js` é um script **standalone** (sem `require`, só endereços de
> assets + plot), independente do toolkit — para um mapa rápido de todas as
> camadas, sem UI. Também **ignora** assets inexistentes.

## Estrutura
```
contracts/
  00_catalog_limits.js       # IBGE: biomas/ufs
  00_catalog_territories.js  # níveis territoriais (bioma/uf/região/brasil) + dicts
  00_catalog_landcover.js    # MapBiomas C11 (asset, paleta, legenda)
  00_catalog_mapbiomas.js    # MapBiomas Pastagem (biomassa) + Solo (carbono orgânico)
  00_catalog_products.js     # Cerrado (vbeta1) + Pantanal forest (v03–v08) + grassland
  00_catalog_references.js   # 17 mapas de referência + FONTES (rótulos)
  00_catalog_layers.js       # registry: PRODUTOS · REF_FONTES · AUXILIARES
engine/
  module_infra.js            # assetExists (getAsset) + filterExisting
  module_regions.js          # território: featuresFor (FC) + boundsFor
  module_layers.js           # build/mask da imagem de exibição
run/
  run_view.js                # o APP (gavetas aninhadas + toggles + miniaturas)
  run_simple.js              # standalone (sem require): só endereços + plot
 09_catalog_check.js          # QA dos catálogos
 00_diagnose_territories.js   # diagnóstico de territórios
references/                  # material de referência (Fogo, Material Combustível)
docs/                        # (em COLLECTION_00/docs) ex.: Resultado - Cerrado Florestal
```

## Notas
- Catálogos **reescritos** a partir do `statistics/v00` (política "cada toolkit
  escreve os seus"); mesmos assets do projeto.
- **Botões**: os cabinets usam botão de seta com **label de texto** (▼/▶),
  no esquema do toolkit de **Material Combustível** (sem `imageUrl`/b64).
- **Genérico**: adicionar camadas = incluir no catálogo correspondente; a UI é
  data-driven (`PRODUTOS` / `REF_FONTES` / `AUXILIARES` gerados do registry).
- Cerrado: assets em `CARBON/MAPPING/Cerrado/mapa_biomassa_vbeta1` (banda `b1`,
  AGB 2020) — ver `docs/Resultado - Cerrado Florestal (assets).md`.
- Substitui/upgrada o QA visual (`6_qualidade.js`) das versões do forest/grassland.
