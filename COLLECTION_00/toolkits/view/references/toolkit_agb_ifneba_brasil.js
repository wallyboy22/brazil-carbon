// =============================================================================
// REFERÊNCIA EXTERNA — visualizador de AGB IFN+EBA (não é usado pelo app)
// -----------------------------------------------------------------------------
// Fonte: script de Celso H. L. Silva-Junior — projeto IFN_Novo.
// Coleção: projects/ee-redd-brazil/assets/AGB_IFNEBA_ic_v1
// Mantido VERBATIM como referência do método/visual.
// NOTA: este arquivo usa `.clip(...)` apenas para restringir a exibição ao Brasil.
//       A implementação dentro de v01/run_view.js NÃO usa clip (máscara por
//       paint(...).eq(0)), conforme a regra de ouro do repositório.
// =============================================================================

// =============================================================
// Visualizar AGB final + incerteza (IFN+EBA) — GEE Code Editor  (v3)
// Colecao: projects/ee-redd-brazil/assets/AGB_IFNEBA_ic_v1
// Bandas por imagem (tile x ano): AGB_Mg_ha, sd_modelo, sd_rotulo,
//                                  meia_largura, ic_inf, ic_sup
// v3: AGB em paleta viridis (perceptualmente uniforme). NODATA_ZERO mantido.
// Projeto IFN_Novo | Celso H. L. Silva-Junior
// =============================================================
var COL_ID = 'projects/ee-redd-brazil/assets/AGB_IFNEBA_ic_v1';   // troque p/ _eba_/_ifn_ se for outra fonte
var COL = ee.ImageCollection(COL_ID);
var ANO_INI = 2020;      // ano inicial exibido
var NODATA_ZERO = true;  // true: mostra 0 onde ha nodata (recortado ao Brasil). SO p/ exibicao — nao
                         // use o raster preenchido p/ estatisticas de area/totais (ali mantenha a mascara).

var AOI = ee.FeatureCollection('FAO/GAUL/2015/level0')
            .filter(ee.Filter.eq('ADM0_NAME','Brazil')).geometry();

// --- paletas ---
var PAL_AGB = ['440154','482878','3e4a89','31688e','26828e','1f9e89','35b779','6ece58','b5de2b','fde725']; // viridis (0 -> 400 Mg/ha)
var PAL_INC = ['2c7bb6','abd9e9','ffffbf','fdae61','d7191c'];          // incerteza (baixa -> alta)
var VIS_AGB = {min: 0, max: 400, palette: PAL_AGB};
var VIS_INC = {min: 0, max: 150, palette: PAL_INC};   // meia-largura do IC90 (Mg/ha)
var VIS_CV  = {min: 0, max: 0.6, palette: PAL_INC};   // incerteza relativa (meia_largura/AGB)

// --- mosaico de um ano (junta os tiles daquele ano) ---
function mosaicoAno(y){
  var m  = COL.filter(ee.Filter.eq('ano', y)).mosaic();
  var cv = m.select('meia_largura').divide(m.select('AGB_Mg_ha').max(1)).rename('incerteza_rel');
  return m.addBands(cv);
}

// --- desenha as camadas de um ano ---
function desenhar(y){
  Map.layers().reset();
  var m  = mosaicoAno(y);
  var mv = NODATA_ZERO ? m.unmask(0).clip(AOI) : m;   // 0 no lugar de nodata, sem pintar o oceano
  Map.addLayer(mv.select('AGB_Mg_ha'),    VIS_AGB, 'AGB '+y+' (Mg/ha)');
  Map.addLayer(mv.select('meia_largura'), VIS_INC, 'Incerteza IC90 '+y+' (Mg/ha)');
  Map.addLayer(mv.select('incerteza_rel'),VIS_CV,  'Incerteza relativa '+y, false);  // desligada por padrao
}

// --- barra de legenda continua ---
function barraLegenda(titulo, vis){
  var painel = ui.Panel({style:{padding:'4px 8px'}});
  painel.add(ui.Label(titulo, {fontWeight:'bold', fontSize:'12px', margin:'0 0 4px 0'}));
  var faixa = ee.Image.pixelLonLat().select(0).multiply((vis.max-vis.min)/100).add(vis.min)
                .visualize({min:vis.min, max:vis.max, palette:vis.palette});
  var thumb = ui.Thumbnail({image: faixa, params:{bbox:[0,0,100,8], dimensions:'160x12'},
                            style:{stretch:'horizontal', margin:'0'}});
  painel.add(thumb);
  painel.add(ui.Panel({widgets:[ui.Label(String(vis.min),{fontSize:'10px'}),
                                ui.Label(String((vis.min+vis.max)/2),{fontSize:'10px',textAlign:'center',stretch:'horizontal'}),
                                ui.Label(String(vis.max),{fontSize:'10px'})],
                       layout: ui.Panel.Layout.flow('horizontal')}));
  return painel;
}

// --- painel de controle (seletor de ano + legendas) ---
var painel = ui.Panel({style:{position:'bottom-left', width:'230px', padding:'8px'}});
painel.add(ui.Label('AGB IFN+EBA — mapa e incerteza', {fontWeight:'bold'}));
var seletor = ui.Select({items: [], placeholder:'ano...', onChange: function(v){ desenhar(parseInt(v,10)); }});
painel.add(ui.Panel([ui.Label('Ano:'), seletor], ui.Panel.Layout.flow('horizontal')));
var chkZero = ui.Checkbox({label:'nodata = 0 (exibicao)', value: NODATA_ZERO,
  onChange: function(v){ NODATA_ZERO = v; if(seletor.getValue()) desenhar(parseInt(seletor.getValue(),10)); }});
painel.add(chkZero);
painel.add(barraLegenda('AGB (Mg/ha)', VIS_AGB));
painel.add(barraLegenda('Incerteza IC90 (Mg/ha)', VIS_INC));
Map.add(painel);

// --- popular o seletor com os anos disponiveis na colecao ---
COL.aggregate_array('ano').distinct().sort().evaluate(function(anos){
  anos = anos || [];
  seletor.items().reset(anos.map(String));
  var ini = (anos.indexOf(ANO_INI) >= 0) ? ANO_INI : (anos[0] || ANO_INI);
  seletor.setValue(String(ini), false);
  desenhar(ini);
});

// --- inspetor: clique mostra AGB e IC no ponto (usa o mosaico MASCARADO) ---
Map.style().set('cursor','crosshair');
var inspetor = ui.Panel({style:{position:'top-right', width:'240px', padding:'8px'}});
inspetor.add(ui.Label('Clique no mapa para inspecionar', {fontSize:'12px'}));
Map.add(inspetor);
Map.onClick(function(coords){
  var y = parseInt(seletor.getValue(),10);
  var pt = ee.Geometry.Point([coords.lon, coords.lat]);
  var m = mosaicoAno(y).select(['AGB_Mg_ha','meia_largura','ic_inf','ic_sup']);   // mascarado (informa "sem dado")
  inspetor.clear(); inspetor.add(ui.Label('Carregando ('+coords.lon.toFixed(3)+', '+coords.lat.toFixed(3)+')...'));
  m.reduceRegion({reducer: ee.Reducer.first(), geometry: pt, scale: 30, maxPixels: 1e9}).evaluate(function(v){
    inspetor.clear();
    inspetor.add(ui.Label('Ponto ('+coords.lon.toFixed(3)+', '+coords.lat.toFixed(3)+') — '+y, {fontWeight:'bold', fontSize:'12px'}));
    if(!v || v.AGB_Mg_ha===null || v.AGB_Mg_ha===undefined){ inspetor.add(ui.Label('Sem dado (fora da mascara nativa).')); return; }
    inspetor.add(ui.Label('AGB: '+v.AGB_Mg_ha.toFixed(1)+' Mg/ha'));
    inspetor.add(ui.Label('IC90: ['+v.ic_inf.toFixed(1)+' , '+v.ic_sup.toFixed(1)+']'));
    inspetor.add(ui.Label('+/- '+v.meia_largura.toFixed(1)+' Mg/ha'));
  });
});

Map.setCenter(-52, -11, 5);   // transicao Amazonia-Cerrado; ajuste como quiser
print('Colecao:', COL_ID, '| imagens:', COL.size());