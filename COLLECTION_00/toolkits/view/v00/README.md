# toolkit view/v00 — QA visual genérico (MapBiomas Carbono)

App interativo (GEE Code Editor) para **QA visual** das camadas do projeto:
resultados (forest/grassland), referências (benchmarks/CN) e uso e cobertura
(MapBiomas C11), filtráveis por **bioma, UF, região ou Brasil**.

## Uso
Rodar `run/run_view.js` no Code Editor. O painel esquerdo permite:
- **Território**: Bioma / UF / Região / Brasil (assets do próprio projeto);
- **Regiões**: seleção (vazio = todas) que filtra e dá zoom;
- **Camadas**: checkboxes por grupo (todas as versões de resultado);
- **Opacidade** e **legenda** do Uso e Cobertura (C11);
- **LEGENDA · RAMPA DE COR**: barra de cor (unidade + extremos + cores) para
  cada rampa distinta entre as camadas marcadas (resultados/referências).

> As camadas **Forest** aparecem como **`Pantanal Forest vXX`** (produto do
> Pantanal). Camadas cujo asset ainda **não existe** (ex.: `v08 GEDI/IFN`) são
> **ignoradas** automaticamente — o app só lista o que existe.

No cabinet **CAMADAS** há dois toggles:
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
  00_catalog_products.js     # resultados forest (v03–v08) + grassland (v01/v02)
  00_catalog_references.js   # 17 mapas de referência
  00_catalog_layers.js       # registry de CAMADAS (compõe os catálogos)
engine/
  module_infra.js            # assetExists (getAsset) + filterExisting
  module_regions.js          # território: featuresFor (FC) + boundsFor
  module_layers.js           # build/mask da imagem de exibição
run/
  run_view.js                # o APP (UI + toggles MAP/THUMBNAILS)
  run_simple.js              # standalone (sem require): só endereços + plot
 09_catalog_check.js          # QA dos catálogos
 00_diagnose_territories.js   # diagnóstico de territórios
references/                  # material de referência (Fogo, Material Combustível)
```

## Notas
- Catálogos **reescritos** a partir do `statistics/v00` (política "cada toolkit
  escreve os seus"); mesmos assets do projeto.
- **Genérico**: adicionar camadas = incluir no catálogo correspondente; a UI é
  data-driven (grupos/checkboxes gerados do registry).
- Substitui/upgrada o QA visual (`6_qualidade.js`) das versões do forest/grassland.
