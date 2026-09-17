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
 *          produto,versao,ano,territorio,Bioma,UF,Unidade Federativa,unidade,
 *          classe,cobertura (n0..n4),
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
 * Método (padrão comprovado — banda `territory` derivada por paint, igual
 *   references/forest):
 *   valor_t = banda × toTFactor × pixelArea()/10000, somada por classe;
 *   def_sec como COLUNAS MOD (área, valor)×0..7 (Σ def_sec = total);
 *   reducer = ee.Reducer.sum().repeat(9·k)
 *     .group({groupField:9·k}).group({groupField:9·k+1, groupName:'territory'})
 *     sobre o stack [área, valores, (área, valores)×mod0..7, classe,
 *     territory] — a banda de classificação é o LULC CRU na ÚLTIMA posição de
 *     valor (grupo interno) e a banda `territory` (bioma×UF, paint) é o grupo
 *     EXTERNO aninhado; as combinações (classe × def_sec) são expandidas
 *     SERVIDOR-SIDE (rowsFC* — ee.List.map/flatten, exports agendados
 *     IMEDIATOS no parse, sem evaluate; M2 spike 2026-09-17). As 3 tabelas
 *     (principal, biomassa mensal, ANPP mensal) surgem na hora no Task
 *     Manager e rodam em paralelo.
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE   // 30 m
;
var N_VALUE = 3 * (1 + LEG.DEFSEC_MODS.length); // principal: área, biomassa, estoque + (área, biomassa, estoque)×mods

/* ---- Território (banda `territory` = bioma×UF, igual forest/references) ----
 * paintBiomes (GEOCODE 1..6) ×100 + UFs (CD_UF 11..53, pintadas SÓ quando
 * UF_LIST != [] — uf=0 → região pura do bioma, CSV idêntico ao antigo). No
 * recorte do Pantanal as UFs do UF_LIST presentes são MS/MT. Rótulos por
 * dicionário (getInfo 1×); `territorio` mantém `Pantanal (bioma)` (D2), com a
 * diferenciação por UF nas colunas `UF`/`Unidade Federativa`. */
var _TERRITORY = { biomeLabels: {}, ufLabels: {} };
var _UF_LAYER = C.UF_LIST.length
  ? ee.Image()
    .paint(ee.FeatureCollection(C.UF_ASSET)
      .map(function (f) { return f.set('_u', ee.Number.parse(f.get('CD_UF'))); }), '_u')
  : ee.Image(0);
var TERRITORY_IMAGE = ee.Image()
  .paint(ee.FeatureCollection(C.BIOME_FC)
    .map(function (f) { return f.set('_b', ee.Number.parse(f.get('GEOCODE'))); }), '_b')
  .multiply(100)
  .add(_UF_LAYER)
  .rename('territory').int();

/** Carrega 1× os rótulos bioma/UF dos FCs (dicionário por código). */
function loadTerritories(cb) {
  ee.FeatureCollection(C.BIOME_FC).getInfo(function (bf) {
    ee.FeatureCollection(C.UF_ASSET).getInfo(function (ufs) {
      (bf.features || []).forEach(function (f) {
        _TERRITORY.biomeLabels[parseInt(f.properties['GEOCODE'], 10)] =
          f.properties[C.BIOME_PROP];
      });
      (ufs.features || []).forEach(function (f) {
        _TERRITORY.ufLabels[parseInt(f.properties['CD_UF'], 10)] = {
          sigla: f.properties['SIGLA_UF'] || '',
          nome: f.properties[C.UF_NAME_PROP] || '' };
      });
      cb();
    }, function () {
      print('[ERRO] não foi possível carregar UF_ASSET:', C.UF_ASSET); cb();
    });
  }, function () {
    print('[ERRO] não foi possível carregar BIOME_FC:', C.BIOME_FC); cb();
  });
}

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

function biome() {
  return ee.FeatureCollection(C.BIOME_FC)
    .filter(ee.Filter.eq(C.BIOME_PROP, C.BIOME_NAME))
    .first().geometry();
}

/** Área (ha) é mascarada SÓ pelo LULC (sempre informativa). */
function areaMasked(lulc) {
  return ee.Image.pixelArea().divide(10000).rename('area_ha')
    .updateMask(lulc.mask());
}

/* ---- Produtos do contrato por versão --------------------------------------- */
function productOf(versionId, id) {
  var list = C.PRODUCTS.concat(C.MONTHLY);
  for (var i = 0; i < list.length; i++) {
    if (list[i].version === versionId && list[i].id === id) return list[i];
  }
  return null;
}

/* --------------------------------------------------------------------------
 * M2 — montagem SERVIDOR-SIDE (exports IMEDIATOS, sem evaluate; spike
 * 2026-09-17). Rótulos por ee.Dictionary (fontes: LEG + FCs IBGE) capturados
 * como constantes nas lambdas; `sum` é LISTA por grupo; combinação def_sec j
 * ocupa `base` elementos em off = base + j*base; área ≤ 0 → descartado.
 * ------------------------------------------------------------------------ */

/** Arredondamento servidor-side (1 casa decimal — espelho do r() legado). */
function r1(n) { return ee.Number(n).multiply(10).round().divide(10); }

/** ee.Dictionary de rótulos (constantes p/ as lambdas dos rowsFC). */
function buildLabelDicts() {
  var info = {}, biome = {}, sigla = {}, nome = {}, defsec = {};
  Object.keys(LEG.infoMap()).forEach(function (k) { info[k] = LEG.infoMap()[k]; });
  Object.keys(_TERRITORY.biomeLabels).forEach(function (k) {
    biome[k] = _TERRITORY.biomeLabels[k];
  });
  Object.keys(_TERRITORY.ufLabels).forEach(function (k) {
    sigla[k] = _TERRITORY.ufLabels[k].sigla;
    nome[k] = _TERRITORY.ufLabels[k].nome;
  });
  Object.keys(LEG.defsecLabelMap()).forEach(function (k) {
    defsec[k] = LEG.defsecLabelMap()[k];
  });
  return {
    info: ee.Dictionary(info),
    biome: ee.Dictionary(biome),
    sigla: ee.Dictionary(sigla),
    nome: ee.Dictionary(nome),
    defsec: ee.Dictionary(defsec)
  };
}

/** Reduz o stack mensal [área_ha, valor_t, (área, valor)×mod0..7, classe,
 * territory] por CLASSE × TERRITÓRIO (lulc cru; grupo externo aninhado). */
function reduceMonthly(product, month, geom) {
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
  var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR)).unmask(0);
  var valor = ee.Image(product.asset).select(product.bandPrefix + pad(month))
    .multiply(1 / 1000).rename('valor'); // kg → t
  var mask = valor.mask().and(lulc.mask());
  var base = [
    areaMasked(lulc),
    valor.multiply(ee.Image.pixelArea()).divide(10000).rename('valor_t')
      .unmask(0).updateMask(mask)];
  var mods = [];
  LEG.DEFSEC_MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    base.forEach(function (bnd, i) {
      mods.push(bnd.updateMask(cond).rename(
        i === 0 ? 'area_mod' + m : 'valor_mod' + m));
    });
  });
  var n = 2 * (1 + LEG.DEFSEC_MODS.length); // 18
  return ee.Image.cat(base.concat(mods).concat([lulc, TERRITORY_IMAGE]))
    .reduceRegion({
      reducer: ee.Reducer.sum().repeat(n)
        .group({ groupField: n, groupName: 'classe' })
        .group({ groupField: n + 1, groupName: 'territory' }),
      geometry: geom, scale: SCALE, maxPixels: 1e13, tileScale: 2
    }).get('groups');
}

/** FeatureCollection servidor-side de UM mês (linhas longas com `período`),
 * espelho byte a byte do rowsOfMonth legado. */
function rowsFCMonthly(product, month, mes, valueCol, geom, D) {
  var groups = ee.List(reduceMonthly(product, month, geom));
  var vId = product.version;
  var periodo = YEAR + '_' + pad(mes);

  function expandTerritory(tEl) {
    var td = ee.Dictionary(tEl);
    var terCode = ee.Number(td.get('territory'));
    var biomeName = ee.String(D.biome.get(terCode.divide(100).floor().format(), ''));
    var ufSigla = ee.String(D.sigla.get(terCode.mod(100).format(), ''));
    var ufNome = ee.String(D.nome.get(terCode.mod(100).format(), ''));
    var territorio = biomeName.cat(' (bioma)');

    function expandClass(gEl) {
      var gd = ee.Dictionary(gEl);
      var s = ee.List(gd.get('sum'));
      var cls = ee.Number(gd.get('classe'));
      var info = ee.Dictionary(D.info.get(cls.format(), {}));

      function one(j) {
        var off = 2 + j * 2;
        var am = ee.Number(s.get(off));
        var props = {
          produto: 'grassland', versao: vId, ano: YEAR,
          territorio: territorio, Bioma: biomeName, UF: ufSigla,
          'Unidade Federativa': ufNome, unidade: 't', classe: cls,
          'cobertura (n0)': info.get('n0', ''),
          'cobertura (n1)': info.get('n1', ''),
          'cobertura (n2)': info.get('n2', ''),
          'cobertura (n3)': info.get('n3', ''),
          'cobertura (n4)': info.get('n4', ''),
          'Desmatamento e vegetação secundária':
            D.defsec.get(ee.Number(j).format(), ''),
          'período': periodo,
          'Área (ha)': r1(am)
        };
        props[valueCol] = r1(ee.Number(s.get(off + 1)));
        return ee.List(ee.Algorithms.If(am.gt(0), [ee.Feature(null, props)], []));
      }
      return ee.List(LEG.DEFSEC_MODS.map(one));
    }
    return ee.List(ee.List(td.get('groups')).map(expandClass));
  }

  return ee.FeatureCollection(ee.List(groups.map(expandTerritory)).flatten());
}

/** FeatureCollection servidor-side da TABELA PRINCIPAL (biomassa + estoque no
 * MESMO stack anual, N_VALUE = 27; off = 3 + j*3). */
function rowsFCPrincipal(versionId, biomass, carbon, geom, D) {
  var biomassa = ee.Image(biomass.asset).select(biomass.band)
    .multiply(1 / 1000).rename('biomassa');
  var estoque = ee.Image(carbon.asset).select(carbon.band)
    .multiply(1).rename('estoque');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
  var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR)).unmask(0);
  var predMask = biomassa.mask().and(estoque.mask()).and(lulc.mask());
  var area = areaMasked(lulc);
  var base = [
    area,
    biomassa.multiply(ee.Image.pixelArea()).divide(10000)
      .rename('biomassa_t').unmask(0).updateMask(predMask),
    estoque.multiply(ee.Image.pixelArea()).divide(10000)
      .rename('estoque_t').unmask(0).updateMask(predMask)];
  var mods = [];
  LEG.DEFSEC_MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    base.forEach(function (bnd, i) {
      mods.push(bnd.updateMask(cond).rename(
        i === 0 ? 'area_mod' + m :
        (i === 1 ? 'biomassa_mod' + m : 'estoque_mod' + m)));
    });
  });
  var stack = ee.Image.cat(base.concat(mods).concat([lulc, TERRITORY_IMAGE]));
  var groups = ee.List(stack.reduceRegion({
    reducer: ee.Reducer.sum().repeat(N_VALUE)
      .group({ groupField: N_VALUE, groupName: 'classe' })
      .group({ groupField: N_VALUE + 1, groupName: 'territory' }),
    geometry: geom, scale: SCALE, maxPixels: 1e13, tileScale: 2
  }).get('groups'));

  function expandTerritory(tEl) {
    var td = ee.Dictionary(tEl);
    var terCode = ee.Number(td.get('territory'));
    var biomeName = ee.String(D.biome.get(terCode.divide(100).floor().format(), ''));
    var ufSigla = ee.String(D.sigla.get(terCode.mod(100).format(), ''));
    var ufNome = ee.String(D.nome.get(terCode.mod(100).format(), ''));
    var territorio = biomeName.cat(' (bioma)');

    function expandClass(gEl) {
      var gd = ee.Dictionary(gEl);
      var s = ee.List(gd.get('sum'));
      var cls = ee.Number(gd.get('classe'));
      var info = ee.Dictionary(D.info.get(cls.format(), {}));

      function one(j) {
        var off = 3 + j * 3;
        var am = ee.Number(s.get(off));
        var props = {
          produto: 'grassland', versao: versionId, ano: YEAR,
          territorio: territorio, Bioma: biomeName, UF: ufSigla,
          'Unidade Federativa': ufNome, unidade: 't', classe: cls,
          'cobertura (n0)': info.get('n0', ''),
          'cobertura (n1)': info.get('n1', ''),
          'cobertura (n2)': info.get('n2', ''),
          'cobertura (n3)': info.get('n3', ''),
          'cobertura (n4)': info.get('n4', ''),
          'Desmatamento e vegetação secundária':
            D.defsec.get(ee.Number(j).format(), ''),
          'Área (ha)': r1(am),
          'Biomassa (t)': r1(ee.Number(s.get(off + 1))),
          'Estoque de carbono (t)': r1(ee.Number(s.get(off + 2)))
        };
        return ee.List(ee.Algorithms.If(am.gt(0), [ee.Feature(null, props)], []));
      }
      return ee.List(LEG.DEFSEC_MODS.map(one));
    }
    return ee.List(ee.List(td.get('groups')).map(expandClass));
  }

  return ee.FeatureCollection(ee.List(groups.map(expandTerritory)).flatten());
}

/* ---- Colunas (selectors) dos 3 CSVs (nomes prontos p/ gráfico) ------------ */
var SEL_A = ['produto', 'versao', 'ano', 'territorio', 'Bioma', 'UF',
  'Unidade Federativa', 'unidade', 'classe',
  'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
  'cobertura (n4)', 'Desmatamento e vegetação secundária',
  'Área (ha)', 'Biomassa (t)', 'Estoque de carbono (t)'];

var SEL_MENSAL = ['produto', 'versao', 'ano', 'territorio', 'Bioma', 'UF',
  'Unidade Federativa', 'unidade', 'classe',
  'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
  'cobertura (n4)', 'Desmatamento e vegetação secundária', 'período',
  'Área (ha)'];

/**
 * Executa as 3 tabelas de UMA versão (região = Pantanal; a diferenciação por
 * UF sai da banda `territory` nas colunas UF/Unidade Federativa). Os exports
 * são agendados IMEDIATAMENTE (montagem servidor-side, sem evaluate).
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

  loadTerritories(function () {
    var D = buildLabelDicts();
    var geom = biome();
    var slug = 'bioma';
    var context = 'grassland · ' + versionId + ' · ' + slug;
    var scheduled = 0;

    /* A) tabela principal — biomassa + estoque no MESMO stack (anual). */
    if (biomass && carbon && assetExists(biomass.asset) &&
        assetExists(carbon.asset)) {
      var prefixA = C.PREFIX + '_' + versionId + '_' + slug + '_' + YEAR;
      try {
        Export.table.toDrive({
          collection: rowsFCPrincipal(versionId, biomass, carbon, geom, D),
          description: 'WS_CARBONO_toDrive-' + prefixA,
          fileNamePrefix: prefixA,
          folder: C.DRIVE_FOLDER, fileFormat: 'CSV', selectors: SEL_A
        });
        print('[OK]', context, 'principal · export IMEDIATO agendado.');
        scheduled++;
      } catch (e) {
        print('[ERRO export principal]', context, String(e).slice(0, 200));
      }
    }

    /* B) biomassa mensal — LONGA (1 linha por combinação × mês, `período`). */
    if (biomassM && assetExists(biomassM.asset)) {
      var prefixB = C.PREFIX + '_' + versionId + '_biomassa_mensal_' +
        slug + '_' + YEAR;
      var fcB = rowsFCMonthly(biomassM, 1, 1, 'Biomassa (t)', geom, D);
      for (var m = 2; m <= 12; m++) {
        fcB = fcB.merge(rowsFCMonthly(biomassM, m, m, 'Biomassa (t)', geom, D));
      }
      try {
        Export.table.toDrive({
          collection: fcB,
          description: 'WS_CARBONO_toDrive-' + prefixB,
          fileNamePrefix: prefixB,
          folder: C.DRIVE_FOLDER, fileFormat: 'CSV',
          selectors: SEL_MENSAL.concat(['Biomassa (t)'])
        });
        print('[OK]', context, 'biomassa mensal · export IMEDIATO agendado ' +
          '(período 2023_01..2023_12).');
        scheduled++;
      } catch (e) {
        print('[ERRO export biomassa mensal]', context, String(e).slice(0, 200));
      }
    }

    /* C) ANPP mensal — LONGA (1 linha por combinação × mês, `período`). */
    if (anppM && assetExists(anppM.asset)) {
      var prefixC = C.PREFIX + '_' + versionId + '_anpp_mensal_' +
        slug + '_' + YEAR;
      var fcC = rowsFCMonthly(anppM, 1, 1, 'ANPP (t MS/ano)', geom, D);
      for (var k = 2; k <= 12; k++) {
        fcC = fcC.merge(rowsFCMonthly(anppM, k, k, 'ANPP (t MS/ano)', geom, D));
      }
      try {
        Export.table.toDrive({
          collection: fcC,
          description: 'WS_CARBONO_toDrive-' + prefixC,
          fileNamePrefix: prefixC,
          folder: C.DRIVE_FOLDER, fileFormat: 'CSV',
          selectors: SEL_MENSAL.concat(['ANPP (t MS/ano)'])
        });
        print('[OK]', context, 'anpp mensal · export IMEDIATO agendado ' +
          '(período 2023_01..2023_12).');
        scheduled++;
      } catch (e) {
        print('[ERRO export anpp]', context, String(e).slice(0, 200));
      }
    }

    print('[FIM]', versionId, '·', scheduled, 'de 3 exports agendados ' +
      'imediatos.');
  });
};

/*** Molde herdado do Colab — comparativo de produtos OFFLINE no statistics_gcn. */

/**
 * O comparativo de produtos é montado OFFLINE no Colab
 * (statistics_gcn → build_compare_grassland), a partir dos CSVs
 * `stats_grassland_*.csv` (referência: GRASSLAND_REF_VERSION = v02).
 */
