/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · engine/module_layers
 * ---------------------------------------------------------------------------
 * Constrói a ee.Image de exibição de uma camada do registry.
 ******************************************************************************/

/** ee.Image de uma camada (trata COL, banda, série multi-ano e nodata). */
exports.build = function (layer) {
  var img;
  if (layer.col) {
    // Forest: mosaico da ImageCollection COL no ano da camada.
    img = ee.ImageCollection(layer.col)
      .filter(ee.Filter.eq('year', layer.year || 2023)).mosaic();
  } else {
    img = ee.Image(layer.asset);
  }
  var band = layer.band;
  if (layer.multi_year) {
    // Séries (Xu): usa o ano mais recente da série (b<end-start+1>).
    band = 'b' + (layer.multi_year.end - layer.multi_year.start + 1);
  }
  img = img.select(band);
  if (layer.nodata_le !== null && layer.nodata_le !== undefined) {
    img = img.updateMask(img.gt(layer.nodata_le));
  }
  return img.rename('layer_' + layer.id);
};

/** Aplica máscara espacial (território selecionado). */
exports.masked = function (layer, geom) {
  return exports.build(layer).updateMask(ee.Image(0).paint(
    ee.FeatureCollection([ee.Feature(geom)]), 1));
};
