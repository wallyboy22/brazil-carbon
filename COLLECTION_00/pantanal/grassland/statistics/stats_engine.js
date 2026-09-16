/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Grassland · stats_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas dos produtos campestres v01 e v02 (2023) por classe
 * LULC C11. Requerido pelos steps `7_statistics.js` de cada versão e pelos
 * drivers `run_all_statistics.js`.
 *
 * Expõe:
 *   runForVersion(versionId) → 3 CSVs por versão × região (2023):
 *     A) stats_grassland_<v>_<regiao>_2023.csv          ← TABELA PRINCIPAL
 *        (ANUAL, LONGA) 1 linha por combinação (classe × def_sec):
 *          produto,versao,ano,territorio,unidade,classe,cobertura (n0..n4),
 *          Desmatamento e vegetação secundária, Área (ha),
 *          Biomassa (t), Estoque de carbono (t)
 *        — biomassa E estoque na MESMA tabela, ambos em TONELADAS (t):
 *            biomassa_t = banda anual biomass_annual (kg MS/ha) × área ÷1000;
 *            estoque_t  = banda carbono (Mg C/ha) × área (1 Mg = 1 t).
 *     B) stats_grassland_<v>_biomassa_mensal_<regiao>_2023.csv   ← LONGA
 *        1 linha por combinação × mês, com a coluna `período` (YYYY_MM):
 *          …, período, Área (ha), Biomassa (t)
 *     C) stats_grassland_<v>_anpp_mensal_<regiao>_2023.csv       ← LONGA
 *        1 linha por combinação × mês, com a coluna `período` (YYYY_MM):
 *          …, período, Área (ha), ANPP (t MS/ano)
 *
 * Units padronizadas em TONELADAS (t). Nada de Mg nas saídas.
 *
 * Método:
 *   valor_t = banda × toTFactor × pixelArea()/10000, somada por combinação;
 *   combo   = lulc * 10 + def_sec (module_lulc_legends :: comboEncode/
 *             comboDecode) — agrupa classe × def_sec numa banda única, ficando
 *             na ÚLTIMA posição do stack (padrão comprovado de groupField);
 *   reducer = ee.Reducer.sum().repeat(n).group({groupField:n, groupName:'combo'}).
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE   // 30 m
;
var MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var N_VALUE = 3; // principal: área, biomassa, estoque

/** Banda zero-pad de mês: bandeira mensal adotada = `biomass_01`…`biomass_12`. */
function pad(n) { return (n < 10 ? '0' : '') + n; }

function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) { return false; }
}

/**
 * Vetor de somas de um grupo do `.repeat(n).group()` — aceita `sum` como
 * LISTA (molde solo) ou chaves separadas sum/sum_1/… (algumas versões do EE).
 */
function sumsOf(g) {
  if (g['sum'] !== undefined && typeof g['sum'].length === 'number') {
    return g['sum'];
  }
  var s = [];
  var i = 0;
  while (g['sum' + (i === 0 ? '' : '_' + i)] !== undefined) {
    s.push(g['sum' + (i === 0 ? '' : '_' + i)]);
    i++;
  }
  return s;
}

function biome() {
  return ee.FeatureCollection(C.BIOME_FC)
    .filter(ee.Filter.eq(C.BIOME_PROP, C.BIOME_NAME))
    .first().geometry();
}

function collectRegions(cb) {
  var b = biome();
  if (!C.UF_LIST.length) {
    cb([{ territorio: C.BIOME_NAME + ' (bioma)', slug: 'bioma', geom: b }]);
    return;
  }
  var ufs = ee.FeatureCollection(C.UF_ASSET)
    .filter(ee.Filter.inList(C.UF_PROP, C.UF_LIST));
  ufs.map(function (f) {
    return ee.Feature(null, { sigla: f.get(C.UF_PROP),
      geom: f.geometry().intersection(b, ee.ErrorMargin(30)) });
  }).evaluate(function (feats) {
    cb(feats.filter(function (f) { return f.properties.geom; }).map(function (f) {
      return { territorio: 'UF ' + f.properties.sigla, slug: f.properties.sigla,
        geom: ee.Geometry(f.properties.geom) };
    }));
  }, function () {
    print('[ERRO] não foi possível carregar', C.UF_ASSET, '— confira UF_ASSET/UF_PROP.');
    cb([{ territorio: C.BIOME_NAME + ' (bioma)', slug: 'bioma', geom: b }]);
  });
}

/** Área (ha) é mascarada SÓ pelo LULC (sempre informativa). */
function areaMasked(lulc) {
  return ee.Image.pixelArea().divide(10000).rename('area_ha')
    .updateMask(lulc.mask());
}

function r(n) { return Math.round(n * 10) / 10; }

/* ---- Produtos do contrato por versão --------------------------------------- */
function productOf(versionId, id) {
  var list = C.PRODUCTS.concat(C.MONTHLY);
  for (var i = 0; i < list.length; i++) {
    if (list[i].version === versionId && list[i].id === id) return list[i];
  }
  return null;
}

/** Monta e exporta UMA tabela (rows já normalizadas em {classe, v0..vn}). */
function exportTable(rows, filePrefix, sel) {
  if (!rows.length) return;
  var fc = ee.FeatureCollection(rows.map(function (row) {
    return ee.Feature(null, row); }));
  Export.table.toDrive({
    collection: fc,
    description: 'WS_CARBONO_toDrive-' + filePrefix,
    fileNamePrefix: filePrefix,
    folder: C.DRIVE_FOLDER,
    fileFormat: 'CSV',
    selectors: sel
  });
}

/** Base de linha por código `combo` (classe × def_sec), colunas prontas p/ gráfico. */
function comboRowBase(t, code) {
  var info = LEG.comboInfo(code);
  return { produto: 'grassland', versao: t[1], ano: YEAR, territorio: t[0],
    unidade: 't', classe: info.classe,
    'cobertura (n0)': info.n0, 'cobertura (n1)': info.n1,
    'cobertura (n2)': info.n2, 'cobertura (n3)': info.n3,
    'cobertura (n4)': info.n4,
    'Desmatamento e vegetação secundária': info.def_sec };
}

/* ---- Colunas (selectors) dos 3 CSVs (nomes prontos p/ gráfico) ------------ */
var SEL_A = ['produto', 'versao', 'ano', 'territorio', 'unidade', 'classe',
  'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
  'cobertura (n4)', 'Desmatamento e vegetação secundária',
  'Área (ha)', 'Biomassa (t)', 'Estoque de carbono (t)'];

var SEL_MENSAL = ['produto', 'versao', 'ano', 'territorio', 'unidade', 'classe',
  'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
  'cobertura (n4)', 'Desmatamento e vegetação secundária', 'período',
  'Área (ha)'];

/** Reduz o stack mensal [área_ha, valor_t, combo] por combinação (classe×def_sec). */
function reduceMonthly(product, month, region) {
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
  var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR)).unmask(0);
  var combo = LEG.comboEncode(lulc, defsec);
  var valor = ee.Image(product.asset).select(product.bandPrefix + pad(month))
    .multiply(1 / 1000).rename('valor'); // kg → t
  var mask = valor.mask().and(lulc.mask());
  var stack = ee.Image.cat([
    areaMasked(lulc),
    valor.multiply(ee.Image.pixelArea()).divide(10000).rename('valor_t')
      .unmask(0).updateMask(mask),
    combo]);
  return stack.reduceRegion({
    reducer: ee.Reducer.sum().repeat(2)
      .group({ groupField: 2, groupName: 'combo' }),
    geometry: region.geom, scale: SCALE, maxPixels: 1e13, tileScale: 2
  }).get('groups');
}

/** Expande grupos de um mês em linhas longas (coluna `período` YYYY_MM). */
function rowsOfMonth(groups, t, mes, valueCol) {
  return (groups || []).map(function (g) {
    var s = sumsOf(g);
    var b = comboRowBase(t, g.combo);
    b['período'] = YEAR + '_' + pad(mes);
    b['Área (ha)'] = r(s[0]);
    b[valueCol] = r(s[1]);
    return b;
  });
}

/**
 * Executa as 3 tabelas de UMA versão, para TODAS as regiões do contrato.
 * Usage: engine.runForVersion('v01') | runForVersion('v02').
 */
exports.runForVersion = function (versionId) {
  var biomass = productOf(versionId, 'biomass');
  var carbon = productOf(versionId, 'carbon');
  var biomassM = productOf(versionId, 'biomassMonthly') ||
    productOf(versionId, 'biomass_mensal');
  var anppM = productOf(versionId, 'anppMonthly') ||
    productOf(versionId, 'anpp_mensal');

  if (!biomass && !biomassM) {
    print('[ERRO] grassland versões disponíveis:', ['v01', 'v02'], '· recebido:',
      versionId); return;
  }

  collectRegions(function (regions) {
    var jobs = [];
    regions.forEach(function (region) {
      jobs.push({ t: [region.territorio, versionId], region: region });
    });
    var done = 0;
    jobs.forEach(function (job) {
      var context = 'grassland · ' + versionId + ' · ' + job.region.slug;
      var tableExports = [];

      /* A) tabela principal — biomassa + estoque no MESMO stack (anual),
       * estrato por combo (classe × def_sec). */
      if (biomass && carbon && assetExists(biomass.asset) &&
          assetExists(carbon.asset)) {
        tableExports.push(function (finish) {
          var biomassa = ee.Image(biomass.asset).select(biomass.band)
            .multiply(1 / 1000).rename('biomassa');
          var estoque = ee.Image(carbon.asset).select(carbon.band)
            .multiply(1).rename('estoque');
          var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
          var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR))
            .unmask(0);
          var predMask = biomassa.mask().and(estoque.mask()).and(lulc.mask());
          var stack = ee.Image.cat([
            areaMasked(lulc),
            biomassa.multiply(ee.Image.pixelArea()).divide(10000)
              .rename('biomassa_t').unmask(0).updateMask(predMask),
            estoque.multiply(ee.Image.pixelArea()).divide(10000)
              .rename('estoque_t').unmask(0).updateMask(predMask),
            LEG.comboEncode(lulc, defsec)]);
          stack.reduceRegion({
            reducer: ee.Reducer.sum().repeat(N_VALUE)
              .group({ groupField: N_VALUE, groupName: 'combo' }),
            geometry: job.region.geom, scale: SCALE, maxPixels: 1e13,
            tileScale: 2 }).evaluate(function (groups) {
            var rows = (groups || []).map(function (g) {
              var s = sumsOf(g);
              var b = comboRowBase(job.t, g.combo);
              b['Área (ha)'] = r(s[0]);
              b['Biomassa (t)'] = r(s[1]);
              b['Estoque de carbono (t)'] = r(s[2]);
              return b;
            });
            exportTable(rows,
              C.PREFIX + '_' + versionId + '_' + job.region.slug + '_' + YEAR,
              SEL_A);
            print('[OK]', context, 'principal ·', rows.length, 'combinações');
            finish();
          }, function (err) { print('[ERRO principal]', context,
            String(err).slice(0, 200)); finish(); });
        });
      }

      /* B) biomassa mensal — LONGA (1 linha por combinação × mês),
       * coluna `período` YYYY_MM + estrato def_sec. */
      if (biomassM && assetExists(biomassM.asset)) {
        tableExports.push(function (finish) {
          var rows = [];
          var done = 0;
          MONTHS.forEach(function (m) {
            reduceMonthly(biomassM, m, job.region).evaluate(function (groups) {
              rows.push.apply(rows, rowsOfMonth(groups, job.t, m,
                'Biomassa (t)'));
              done++;
              if (done === MONTHS.length) {
                exportTable(rows,
                  C.PREFIX + '_' + versionId + '_biomassa_mensal_' +
                    job.region.slug + '_' + YEAR,
                  SEL_MENSAL.concat(['Biomassa (t)']));
                print('[OK]', context, 'biomassa mensal ·', rows.length,
                  'combinações ·', done, 'mêses · período 2023_01..2023_12');
                finish();
              }
            }, function (err) { print('[ERRO biomassa mensal]', context,
              String(err).slice(0, 200)); done++; if (done === MONTHS.length)
                finish(); });
          });
        });
      }

      /* C) ANPP mensal — LONGA (1 linha por combinação × mês),
       * coluna `período` YYYY_MM + estrato def_sec. */
      if (anppM && assetExists(anppM.asset)) {
        tableExports.push(function (finish) {
          var rows = [];
          var done = 0;
          MONTHS.forEach(function (m) {
            reduceMonthly(anppM, m, job.region).evaluate(function (groups) {
              rows.push.apply(rows, rowsOfMonth(groups, job.t, m,
                'ANPP (t MS/ano)'));
              done++;
              if (done === MONTHS.length) {
                exportTable(rows,
                  C.PREFIX + '_' + versionId + '_anpp_mensal_' +
                    job.region.slug + '_' + YEAR,
                  SEL_MENSAL.concat(['ANPP (t MS/ano)']));
                print('[OK]', context, 'anpp mensal ·', rows.length,
                  'combinações ·', done, 'mêses · período 2023_01..2023_12');
                finish();
              }
            }, function (err) { print('[ERRO anpp]', context,
              String(err).slice(0, 200)); done++; if (done === MONTHS.length)
                finish(); });
          });
        });
      }

      var expCount = tableExports.length;
      var expDone = 0;
      tableExports.forEach(function (fn) {
        fn(function () { expDone++; checkEnd(); });
      });
      function checkEnd() {
        if (expCount === 0) { done++; if (done === jobs.length)
          print('[FIM]', versionId, 'completa.'); return; }
        if (expDone === expCount) {
          done++; if (done === jobs.length) print('[FIM]', versionId, 'completa.');
        }
      }
    });
  });
};

/*** Molde herdado do Colab — comparativo de produtos OFFLINE no statistics_gcn. */

/**
 * O comparativo de produtos é montado OFFLINE no Colab
 * (statistics_gcn → build_compare_grassland), a partir dos CSVs
 * `stats_grassland_*.csv` (referência: GRASSLAND_REF_VERSION = v02).
 */
