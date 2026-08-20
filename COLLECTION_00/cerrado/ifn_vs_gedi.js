/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var POINTS_FC = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry({
      "type": "GeometryCollection",
      "geometries": [
        {
          "type": "Point",
          "coordinates": [
            -48.855918819885346,
            -12.971164046820098
          ]
        },
        {
          "type": "Point",
          "coordinates": [
            -49.031700069885346,
            -12.00580184214245
          ]
        },
        {
          "type": "Point",
          "coordinates": [
            -48.779975668824584,
            -11.700024387959864
          ]
        },
        {
          "type": "LineString",
          "coordinates": [
            [
              -48.778972522653014,
              -11.698873987320056
            ],
            [
              -48.78063549224225,
              -11.701022448566711
            ]
          ],
          "geodesic": true
        },
        {
          "type": "LineString",
          "coordinates": [
            [
              -48.7785139625383,
              -11.699399476206501
            ],
            [
              -48.77974241426712,
              -11.70098586917281
            ]
          ],
          "geodesic": true
        },
        {
          "type": "LineString",
          "coordinates": [
            [
              -48.77994626215225,
              -11.698926708331424
            ],
            [
              -48.78121226480728,
              -11.700838786763828
            ]
          ],
          "geodesic": true
        },
        {
          "type": "Polygon",
          "coordinates": [
            [
              [
                -48.779608303816374,
                -11.699761930950167
              ],
              [
                -48.77953320196396,
                -11.699919519855895
              ],
              [
                -48.779114777357634,
                -11.699751425019919
              ],
              [
                -48.77917915037399,
                -11.699588583050184
              ]
            ]
          ],
          "geodesic": true,
          "evenOdd": true
        },
        {
          "type": "Polygon",
          "coordinates": [
            [
              [
                -48.78089039972549,
                -11.700255709341695
              ],
              [
                -48.780826026709136,
                -11.700408045013468
              ],
              [
                -48.78041833093887,
                -11.700224191606035
              ],
              [
                -48.7804773395372,
                -11.700066602873838
              ]
            ]
          ],
          "geodesic": true,
          "evenOdd": true
        }
      ],
      "coordinates": []
    }),
    geometry = 
    /* color: #98ff00 */
    /* shown: false */
    ee.Geometry.MultiPoint(
        [[-48.7799730842424, -11.699042273926672],
         [-48.78005355051285, -11.699178851338733],
         [-48.78014474561935, -11.699310175709826],
         [-48.78020911863571, -11.699415235161828],
         [-48.7802788560701, -11.699525547543496],
         [-48.780332500250395, -11.699641112848537],
         [-48.78040223768478, -11.699809207751533],
         [-48.78044515302902, -11.699914267014055],
         [-48.780616814405974, -11.70014539725115],
         [-48.7806758230043, -11.700239950474302],
         [-48.7807831113649, -11.700381780248462],
         [-48.780858213217314, -11.700481586342242],
         [-48.78097086599594, -11.700618163043805],
         [-48.781078154356535, -11.700765245570086],
         [-48.78117471388107, -11.700859798581403]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ── Ano de referência ────────────────────────────────────────────────────────
var YEAR = 2025;

// ── AOI a partir do FeatureCollection do IFN ────────────────────────────────
var AOI_path = 'projects/ee-ipam/assets/IFN/IFN_2026_Field_Cerrado';
var IFN_FC = ee.FeatureCollection(AOI_path);
print('IFN_FC',IFN_FC.limit(10),IFN_FC.aggregate_array('ano').distinct());
Map.addLayer(ee.Image().paint(IFN_FC,'n_arv'),{min:0,max:10},'n_arv');

// Bounding box do FeatureCollection (equivalente ao ee.Geometry.BBox do Python)
var AOI = IFN_FC.geometry().bounds();
var AOI_BBOX = AOI;

Map.centerObject(IFN_FC, 6);
Map.addLayer(IFN_FC, {color: 'orange'}, 'IFN Field Points');
Map.addLayer(AOI, {color: 'red'}, 'AOI BBOX', false);

// ── Janela temporal GEDI ─────────────────────────────────────────────────────
var DATE_START_STR = YEAR + '-01-01';
var DATE_END_STR   = (YEAR+1) + '-01-01';
var PAGE_SIZE      = 500;

// ── Escala de extração de covariáveis (m) ────────────────────────────────────
var SCALE = 30;

// ── Máximo de pegadas para extração GEE ──────────────────────────────────────
// var MAX_FOOTPRINTS = 5000;
var YEAR_USED      = YEAR;
var USING_FALLBACK = false;

var INDEX_FC = ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002_INDEX')
  // .filterDate(DATE_START_STR,DATE_END_STR)
  .filter(ee.Filter.and(
      ee.Filter.gte('time_start', DATE_START_STR),
      ee.Filter.lte('time_start', DATE_END_STR)
    ))
  .filterBounds(IFN_FC.geometry().bounds());
  
INDEX_FC = INDEX_FC.map(function(ft){
  return ft.set({
    if_ifn:ee.Image().paint(IFN_FC).eq(0).unmask().reduceRegion({
      reducer:ee.Reducer.max(),
      geometry:ft.geometry(), 
      scale:100, 
      // crs, crsTransform, bestEffort, 
      maxPixels:1e13,
      // tileScale:8
    }).getNumber('constant')
  });
});

print('INDEX_FC',INDEX_FC.limit(10),INDEX_FC.size());

INDEX_FC= INDEX_FC.filter(ee.Filter.eq('if_ifn',1));
print('INDEX_FC',INDEX_FC.limit(10),INDEX_FC.size());

Map.addLayer(INDEX_FC.limit(10),{},'INDEX_FC');
// var table = ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002/GEDI04_A_2024288052305_O33070_02_T04495_02_004_01_V002')
var table = ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002/GEDI04_A_2021227193607_O15152_04_T10287_02_002_02_V002')
Map.addLayer(table,{},'table');
print('table',ee.FeatureCollection('LARSE/GEDI/GEDI04_A_002/GEDI04_A_2024288052305_O33070_02_T04495_02_004_01_V002').limit(10))
print('1INDEX_FC1',INDEX_FC.limit(10))

print(INDEX_FC.aggregate_array('table_id').distinct().sort().slice(0,10))

INDEX_FC.aggregate_array('table_id').distinct().sort()
.evaluate(function(list){
  print('list',list);
      var fcs = []; 
      
      list.forEach(function(str){
        
        fcs.push(ee.FeatureCollection(str)
          // .filter(ee.Filter.eq('l4_quality_flag',1))
          // .filter(ee.Filter.eq('degrade_flag',0))
          // .filter(ee.Filter.lt('solar_elevation',0))
          // .filter(ee.Filter.gt('agbd',0))
          // // .filter(ee.Filter.gt('beam',4))
          // .filter(ee.Filter.gte('sensitivity',95))
          // .filter(ee.Filter.gt('landsat_treecover',10))
          // // .filter(ee.Filter.gt('landsat_treecover',10))
          // // .filter(ee.Filter.eq('leaf_off_flag',0))
          // // .filter(ee.Filter.lt('landsat_water_persistence',50))
          // .map(function(feature){
          //   var agbd    = ee.Number(feature.get('agbd'));
          //   var agbd_se = ee.Number(feature.get('agbd_se'));
          //   var rel = ee.Algorithms.If(agbd.gt(0), agbd_se.divide(agbd), ee.Number(99));
          //   return feature.set('rel_error', rel);
          // })
          // .filter(ee.Filter.lt('rel_error',0.5))
          .map(function(ft){
            return ft.set({
            if_ifn:ee.Image().paint(IFN_FC).eq(0).unmask().reduceRegion({
              reducer:ee.Reducer.max(),
              geometry:ft.geometry(), 
              scale:100, 
              // crs, crsTransform, bestEffort, 
              maxPixels:1e13,
              // tileScale:8
            }).getNumber('constant')
          });
          })
          .filter(ee.Filter.eq('if_ifn',1))
        );
      });
      
      print('fcs',fcs.map(function(fc){return fc.limit(2)}));
      
      fcs = ee.FeatureCollection(fcs).flatten();

      print('fcs',fcs.limit(2));

})

stop
var IFN_FC_filtred= IFN_FC.map(function(feature){
  
  var gedi_filter = INDEX_FC
  
  
  feature = feature.set({
    
  })
  
  return feature;
});


function getFilteredAssets(startDate, endDate) {
  var fc = INDEX_FC
    .filter(ee.Filter.and(
      ee.Filter.gte('time_start', startDate),
      ee.Filter.lte('time_start', endDate)
    ))
    .filterBounds(AOI_BBOX)
    .filterBounds(AOI);

  var nFc = fc.size().getInfo();
  var assets = [];
  if (nFc > 0) {
    var tableIds = fc.aggregate_array('table_id').getInfo();
    assets = tableIds
      .filter(function(v, i, a) { return a.indexOf(v) === i; }) // únicos
      .sort();
  }
  return {fc: fc, assets: assets, n: nFc};
}

var result = getFilteredAssets(DATE_START_STR, DATE_END_STR);
var dateFiltered   = result.fc;
var filteredAssets = result.assets;
var n = result.n;

print('Granules ' + DATE_START_STR + ' → ' + DATE_END_STR + ' no AOI: ' + n);

// Fallback para 2022 se sem dados
if (n === 0) {
  USING_FALLBACK = true;
  YEAR_USED = 2022;
  print('⚠ Sem granules — fallback para 2022...');
  result = getFilteredAssets('2022-01-01', '2022-12-31');
  dateFiltered   = result.fc;
  filteredAssets = result.assets;
  n = result.n;
  print('Granules 2022: ' + n);
}

var N_ASSETS = filteredAssets.length;
print(N_ASSETS + ' granules únicos · ano ' + YEAR_USED);
print('Lista de assets:', filteredAssets);




