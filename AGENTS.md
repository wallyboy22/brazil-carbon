# AGENTS — MAPBIOMAS-CARBONO

Convenções para agentes/automação neste repositório.

## Regra de ouro: NUNCA usar `.clip`

Para restringir uma imagem a um AOI/geometria, **nunca use `.clip()`**. Use
**máscara**:

```js
// ee.Image()  = imagem global MASCARADA
// paint(aoi)  = pixels 0 DENTRO do aoi e masked FORA
// .eq(0)      = pixels 1 DENTRO e masked FORA  -> máscara do AOI
var mask = ee.Image().paint(ee.FeatureCollection(aoi)).eq(0);
img = img.updateMask(mask);
```

Quando precisar de uma **geometria** (ex.: `region` de um export, `reduceRegion`),
use os **bounds**:

```js
var bounds = aoi.geometry().bounds();
```

Motivos: `.clip` provoca `out of memory` (Error 8) e artefatos/descontinuidades;
o `region` do export já limita o **extent**, e a **validade** do pixel é dada pela
máscara. Vale para **todos** os códigos (v01–v08, toolkits, etc.).
