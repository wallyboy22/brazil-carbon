/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · run · run_simple
 * ---------------------------------------------------------------------------
 * Versão SIMPLES (sem UI): adiciona TODAS as camadas de carbono do catálogo
 * (Resultados forest/grassland, Referências e Uso e Cobertura) ao mapa, para
 * ligar/desligar no controle de camadas do Code Editor.
 *
 * Uso: só rodar. Ajuste DOMAIN para recortar (default: bioma Pantanal).
 ******************************************************************************/
var LAY = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_layers.js');
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_limits.js');
var LYR = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/engine/module_layers.js');

Map.setOptions('SATELLITE');

// Recorte espacial (opcional). null = sem máscara. Default: bioma Pantanal.
var DOMAIN = ee.FeatureCollection(LIM.BIOMES_FC)
  .filter(ee.Filter.eq(LIM.BIOME_NAME_PROP, 'Pantanal')).geometry();
// var DOMAIN = null;   // <- descomente p/ ver a extensão total das camadas

var spatialMask = DOMAIN
  ? ee.Image(0).paint(ee.FeatureCollection([ee.Feature(DOMAIN)]), 1)
  : null;

var count = 0;
LAY.GROUPS.forEach(function (g) {
  g.camadas.forEach(function (l) {
    var img = LYR.build(l);
    if (spatialMask) img = img.updateMask(spatialMask);
    Map.addLayer(img, l.vis, g.grupo + ' · ' + l.nome, false);
    count++;
  });
});

Map.centerObject(ee.FeatureCollection([ee.Feature(DOMAIN || LIM.BIOMES_FC)]), 6);

print('MAPBIOMAS-CARBONO · toolkit view/v00 · run_simple');
print('[CAMADAS]', count, 'adicionadas (desligadas por padrão) —',
  'ligue no controle de camadas do mapa.');
print('[GRUPOS]', LAY.GROUPS.map(function (g) { return g.grupo; }).join(' · '));
print('[DOMÍNIO]', DOMAIN ? 'bioma Pantanal' : 'sem recorte');
