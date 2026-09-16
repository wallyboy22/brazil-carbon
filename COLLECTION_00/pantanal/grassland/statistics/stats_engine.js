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
 *        (ANUAL) colunas:
 *          produto,versao,ano,territorio,unidade,classe,n0,n1,n2,natureza,
 *          marcador, area_ha, biomassa_t, estoque_t
 *          + estratificação def_sec (desmatamento/veg. secundária, C11):
 *            area_mod0..7_ha, biomassa_mod0..7_t, estoque_mod0..7_t
 *        — biomassa E estoque na MESMA tabela, ambos em TONELADAS (t):
 *            biomassa_t = banda anual biomass_annual (kg MS/ha) × área ÷1000;
 *            estoque_t  = banda carbono (Mg C/ha) × área (1 Mg = 1 t).
 *        A área não é produto em si: é informativa, e área 0 ⇒ valor 0.
 *     B) stats_grassland_<v>_biomassa_mensal_<regiao>_2023.csv   ← LARGA
 *        (bandas mensais do asset grassland_biomass_monthly — kg MS/ha → t).
 *     C) stats_grassland_<v>_anpp_mensal_<regiao>_2023.csv       ← LONGA
 *        (1 linha por classe×mês — bandas do grassland_anpp_monthly).
 *
 * Units padronizadas em TONELADAS (t). Nada de Mg nas saídas.
 *
 * Método (molde forest/stats_engine):
 *   valor_t = banda × toTFactor × pixelArea()/10000, somada por classe;
 *   reducer = ee.Reducer.sum().repeat(n).group({groupField:n}) — a banda de
 *   CLASSIFICAÇÃO fica na ÚLTIMA posição do stack (padrão comprovado).
 *   Estratificação def_sec: `def_sec.unmask(0)` + máscara por mod ⇒
 *   Σ área_mod0..7 = área_ha da classe (def_sec cobre o bioma inteiro).
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE   // 30 m
;
var MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
var MODS = LEG.DEFSEC_MODS; // [0..7]
var N_VALUE = 3 + 3 * MODS.length; // principal: área, biomassa, estoque + mods×3

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

function groupsOrEmpty(groups, ctx) {
  if (!groups || typeof groups.forEach !== 'function') {
    print('[AVISO] sem dados (produto ausente ou sem interseção):', ctx);
    return [];
  }
  return groups;
}

/** Normaliza grupos `{classe, sum, sum_1, …, sum_n}` (lista ou chaves). */
function normalize(groups) {
  return (groups || []).map(function (g) {
    var s = [];
    var i = 0;
    while (g['sum' + (i === 0 ? '' : '_' + i)] !== undefined ||
           (i === 0 && g['sum'] !== undefined)) {
      s.push(i === 0 ? (Array.isArray(g['sum']) ? g['sum'][0] : g['sum'])
        : (Array.isArray(g['sum_' + i]) ? g['sum_' + i][0] : g['sum_' + i]));
      i++;
    }
    var out = { classe: g['classe'] };
    s.forEach(function (v, k) { out['v' + k] = v; });
    return out;
  });
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

/** Área (ha) e imagem por lista de [renome, asset, banda, toTFactor]. */
function stackImage(specs, lulcBand) {
  var imgs = specs.map(function (s) {
    return ee.Image(s.asset).select(s.band)
      .multiply(s.toT).rename(s.rename);
  });
  var stack = ee.Image.cat(imgs);
  var lulc = ee.Image(C.LULC_ASSET).select(lulcBand).rename('classe');
  var area = ee.Image.pixelArea().divide(10000).rename('area_ha');
  var base = stack.multiply(area).unmask(0)
    .updateMask(stack.mask().and(lulc.mask()));
  return ee.Image.cat([area.updateMask(lulc.mask()), base, lulc]);
}

/** Reduz o stack `n` bandas de valor + classe (classe na última posição). */
function reduceStack(img, nBands) {
  return img.reduceRegion({
    reducer: ee.Reducer.sum().repeat(nBands)
      .group({ groupField: nBands, groupName: 'classe' }),
    geometry: null, scale: SCALE, maxPixels: 1e13, tileScale: 2
  }).get('groups');
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

function rowBase(t, classe) {
  var i = LEG.info(classe);
  return { produto: 'grassland', versao: t[1], ano: YEAR, territorio: t[0],
    unidade: 't', classe: classe, n0: i.n0, n1: i.n1, n2: i.n2,
    natureza: i.natureza, marcador: i.marcador };
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
      var exports = [];

      /* A) tabela principal — biomassa + estoque no MESMO stack (anual),
       * estratificada por def_sec (área/biomassa/estoque por mod 0..7). */
      if (biomass && carbon && assetExists(biomass.asset) &&
          assetExists(carbon.asset)) {
        exports.push(function (finish) {
          var biomassa = ee.Image(biomass.asset).select(biomass.band)
            .multiply(1 / 1000).rename('biomassa');
          var estoque = ee.Image(carbon.asset).select(carbon.band)
            .multiply(1).rename('estoque');
          var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
          var predMask = biomassa.mask().and(estoque.mask()).and(lulc.mask());
          var area = ee.Image.pixelArea().divide(10000);
          var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR))
            .unmask(0);
          var modBands = [];
          MODS.forEach(function (m) {
            var cond = defsec.eq(m);
            modBands.push(
              area.rename('area_mod' + m).updateMask(lulc.mask())
                .updateMask(cond),
              biomassa.multiply(area).rename('biomassa_mod' + m).unmask(0)
                .updateMask(predMask).updateMask(cond),
              estoque.multiply(area).rename('estoque_mod' + m).unmask(0)
                .updateMask(predMask).updateMask(cond)
            );
          });
          var stack = ee.Image.cat(
            [area.rename('area_ha').updateMask(lulc.mask()),
             biomassa.multiply(area).rename('biomassa_t').unmask(0)
               .updateMask(predMask),
             estoque.multiply(area).rename('estoque_t').unmask(0)
               .updateMask(predMask)]
              .concat(modBands).concat([lulc]));
          stack.reduceRegion({
            reducer: ee.Reducer.sum().repeat(N_VALUE)
              .group({ groupField: N_VALUE, groupName: 'classe' }),
            geometry: job.region.geom, scale: SCALE, maxPixels: 1e13,
            tileScale: 2 }).evaluate(function (groups) {
            var rows = (groups || []).map(function (g) {
              var s = sumsOf(g);
              var b = rowBase(job.t, g.classe);
              b.area_ha = r(s[0]);
              b.biomassa_t = r(s[1]);
              b.estoque_t = r(s[2]);
              MODS.forEach(function (m, k) {
                b['area_mod' + m + '_ha'] = r(s[3 + 3 * k]);
                b['biomassa_mod' + m + '_t'] = r(s[4 + 3 * k]);
                b['estoque_mod' + m + '_t'] = r(s[5 + 3 * k]);
              });
              return b;
            });
            var sel = ['produto', 'versao', 'ano', 'territorio', 'unidade',
              'classe', 'n0', 'n1', 'n2', 'natureza', 'marcador', 'area_ha',
              'biomassa_t', 'estoque_t'];
            MODS.forEach(function (m) {
              sel.push('area_mod' + m + '_ha', 'biomassa_mod' + m + '_t',
                'estoque_mod' + m + '_t');
            });
            exportTable(rows,
              C.PREFIX + '_' + versionId + '_' + job.region.slug + '_' + YEAR,
              sel);
            print('[OK]', context, 'principal ·', rows.length, 'classes');
            finish();
          }, function (err) { print('[ERRO principal]', context,
            String(err).slice(0, 200)); finish(); });
        });
      }

      /* B) biomassa mensal — LARGA (12 colunas de mês). */
      if (biomassM && assetExists(biomassM.asset)) {
        exports.push(function (finish) {
          var meses = MONTHS.map(function (m) {
            return ee.Image(biomassM.asset)
              .select(biomassM.bandPrefix + pad(m)).multiply(1 / 1000)
              .rename('biomassa_' + pad(m));
          });
          var area = ee.Image.pixelArea().divide(10000).rename('area_ha');
          var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
          var stack = ee.Image.cat(
            meses.map(function (im) {
              return im.multiply(area).rename(im.bandNames().get(0)).unmask(0)
                .updateMask(im.mask().and(lulc.mask()));
            })).addBands([area.updateMask(lulc.mask()), lulc]);
          stack.reduceRegion({
            reducer: ee.Reducer.sum().repeat(13)
              .group({ groupField: 13, groupName: 'classe' }),
            geometry: job.region.geom, scale: SCALE, maxPixels: 1e13,
            tileScale: 2 }).evaluate(function (groups) {
            var rows = (groups || []).map(function (g) {
              var s = sumsOf(g);
              var b = rowBase(job.t, g.classe);
              b.area_ha = r(s[12]);   // banda area_ha fica por último no stack
              MONTHS.forEach(function (m) {
                b['biomassa_m' + pad(m) + '_t'] = r(s[m - 1]);
              });
              return b;
            });
            var sel = ['produto', 'versao', 'ano', 'territorio', 'unidade',
              'classe', 'n0', 'n1', 'n2', 'natureza', 'marcador', 'area_ha'];
            MONTHS.forEach(function (m) {
              sel.push('biomassa_m' + pad(m) + '_t');
            });
            exportTable(rows,
              C.PREFIX + '_' + versionId + '_biomassa_mensal_' +
                job.region.slug + '_' + YEAR, sel);
            print('[OK]', context, 'biomassa mensal ·', rows.length, 'classes');
            finish();
          }, function (err) { print('[ERRO biomassa mensal]', context,
            String(err).slice(0, 200)); finish(); });
        });
      }

      /* C) ANPP mensal — LONGA (1 linha por classe×mês). */
      if (anppM && assetExists(anppM.asset)) {
        var mesJobs = MONTHS.map(function (m) {
          return { m: m, b: anppM.bandPrefix + pad(m) };
        });
        var mesDone = 0;
        var total = mesJobs.length;
        mesJobs.forEach(function (mj) {
          var mid = mj.m;
          ee.Image(anppM.asset).select(mj.b).multiply(1 / 1000).rename('valor')
            .addBands([ee.Image.pixelArea().divide(10000).rename('area_ha')])
            .addBands(
              ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe'))
            .reduceRegion({
              reducer: ee.Reducer.sum().repeat(2)
                .group({ groupField: 2, groupName: 'classe' }),
              geometry: job.region.geom, scale: SCALE, maxPixels: 1e13,
              tileScale: 2 }).evaluate(function (groups) {
              var rows = (groups || []).map(function (g) {
                var s = sumsOf(g);
                var b = rowBase(job.t, g.classe);
                b.area_ha = r(s[1]);
                b.mes = pad(mid);
                b.anpp_t = r(s[0]);
                return b;
              });
              exportTable(rows,
                C.PREFIX + '_' + versionId + '_anpp_mensal_' +
                  job.region.slug + '_' + YEAR +
                  (mesJobs.length > 1 ? '' : ''),
                ['produto', 'versao', 'ano', 'territorio', 'unidade', 'classe',
                  'n0', 'n1', 'n2', 'natureza', 'marcador', 'area_ha', 'mes',
                  'anpp_t']);
              mesDone++;
              if (mesDone === total) {
                print('[OK]', context, 'anpp mensal ·', mesDone, 'mêses');
                finish();
              }
            }, function (err) { print('[ERRO anpp]', context,
              String(err).slice(0, 200)); mesDone++; if (mesDone === total)
                finish(); });
        });
      }

      var expCount = exports.length + (anppM ? 1 : 0);
      var expDone = 0;
      exports.forEach(function (fn) { fn(function () { expDone++; checkEnd(); }); });
      function checkEnd() {
        if (expCount === 0) { done++; if (done === jobs.length)
          print('[FIM]', versionId, 'completa.'); return; }
        if (expDone === expCount && !anppM) {
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
