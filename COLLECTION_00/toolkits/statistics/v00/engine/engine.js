/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · engine (motor unificado)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas por classe LULC C11 dos três domínios:
 *   runForest(contract, versionId?)      — AGC florestal (V03–V08)
 *   runGrassland(contract, versionId?)   — produtos campestres (v01–v02)
 *   runReferences(contract, opts?)       — mapas de referência (20 refs)
 *
 * Método (padrão comprovado — banda `territory` = bioma×UF por paint; grupo
 * aninhado classe → território; expansão classe × def_sec SERVIDOR-SIDE com
 * export IMEDIATO, sem evaluate):
 *   área_ha = pixelArea()/10000, mascarado SÓ pelo LULC (sempre informativa);
 *   valor   = banda × pixelArea()/10000 × fator, mascarado pela predição;
 *   def_sec como COLUNAS MOD (Σ def_sec = total);
 *   reducer = ee.Reducer.sum().repeat(n)
 *     .group({groupField:n, groupName:'classe'})
 *     .group({groupField:n+1, groupName:'territory'})   ← aninhado
 *   sobre o stack [área, valores..., (área, valores...)×mod0..7, lulc,
 *   territory] — a banda de classificação é o LULC CRU na última posição de
 *   valor; `territory` é o grupo externo.
 *
 * Não faz require de contratos: os drivers (run/*) injetam o contrato.
 * Este módulo é o porte fiel dos antigos stats_engine/references_engine;
 * preserva byte a byte os selectors, arredondamento (r1) e filtro área ≤ 0.
 ******************************************************************************/
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/module_legends.js');
var INFRA = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/module_infra.js');
var T = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/module_territory.js');

/* ==========================================================================
 * Primitivas comuns
 * ======================================================================== */

/** Arredondamento servidor-side (1 casa decimal — espelho do r() legado). */
function r1(n) { return ee.Number(n).multiply(10).round().divide(10); }

/** LULC C11 do ano (banda `classification_<ano>`). */
function lulcImage(contract) {
  return ee.Image(LEG.C11_ASSET).select('classification_' + contract.YEAR);
}

/** def_sec do ano, unmask(0). */
function defsecImage(contract) {
  return ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(contract.YEAR)).unmask(0);
}

/** Área (ha) mascarada SÓ pelo LULC (sempre informativa). */
function areaMasked(lulc) {
  return ee.Image.pixelArea().divide(10000).rename('area_ha')
    .updateMask(lulc.mask());
}

/** Reduz o stack com o grupo aninhado classe → território. */
function reduceStack(stack, nValue, geom, scale) {
  return stack.reduceRegion({
    reducer: ee.Reducer.sum().repeat(nValue)
      .group({ groupField: nValue, groupName: 'classe' })
      .group({ groupField: nValue + 1, groupName: 'territory' }),
    geometry: geom, scale: scale, maxPixels: 1e13, tileScale: 2
  }).get('groups');
}

/** Configura o território do módulo (ufEnabled: explícito ou UF_LIST). */
function setupTerritory(contract) {
  var t = contract.territory;
  var cfg = {};
  Object.keys(t).forEach(function (k) { cfg[k] = t[k]; });
  if (cfg.ufEnabled === undefined) cfg.ufEnabled = contract.UF_LIST.length > 0;
  T.configure(cfg);
}

/**
 * Expansão SERVIDOR-SIDE das combinações (classe × def_sec) de um conjunto de
 * grupos (classe → território → sum). `spec`:
 *   info, biome, sigla, nome (ee.Dictionary)
 *   prefixLen, blockLen     — layout do `sum` por combinação def_sec
 *   one(ctx)                — monta o objeto de props (ctx: s, off, am, j, cls,
 *                             info, biomeName, ufSigla, ufNome, territorio)
 * A combinação é descartada quando área ≤ 0.
 */
function expandRows(groups, spec) {
  function expandTerritory(tEl) {
    var td = ee.Dictionary(tEl);
    var terCode = ee.Number(td.get('territory'));
    var biomeName = ee.String(spec.biome.get(terCode.divide(100).floor().format(), ''));
    var ufSigla = ee.String(spec.sigla.get(terCode.mod(100).format(), ''));
    var ufNome = ee.String(spec.nome.get(terCode.mod(100).format(), ''));
    var territorio = biomeName.cat(' (bioma)');

    function expandClass(gEl) {
      var gd = ee.Dictionary(gEl);
      var s = ee.List(gd.get('sum'));
      var cls = ee.Number(gd.get('classe'));
      var info = ee.Dictionary(spec.info.get(cls.format(), {}));

      function one(j) {
        var off = spec.prefixLen + j * spec.blockLen;
        var am = ee.Number(s.get(off));
        var props = spec.one({
          s: s, off: off, am: am, j: j, cls: cls, info: info,
          biomeName: biomeName, ufSigla: ufSigla, ufNome: ufNome,
          territorio: territorio
        });
        return ee.List(ee.Algorithms.If(am.gt(0), [ee.Feature(null, props)], []));
      }
      return ee.List(LEG.DEFSEC_MODS.map(one));
    }
    return ee.List(ee.List(td.get('groups')).map(expandClass));
  }
  return ee.FeatureCollection(ee.List(groups.map(expandTerritory)).flatten());
}

/* ==========================================================================
 * REFERENCES
 * ======================================================================== */

/** Rótulo gráfico de um stem/pool (agb → 'AGB', total → 'Total', …). */
var POOL_LABEL = {
  agb: 'AGB', agc: 'AGC', bgb: 'BGB', bgc: 'BGC', live: 'Live',
  total: 'Total', cdw: 'CDW', litter: 'Litter', incerteza: 'Incerteza'
};

/** Colunas de VALOR que o ref emite (cada uma vira um total em t no CSV). */
function emitCols(r) {
  var out = [];
  r.pools.forEach(function (pool) {
    if (r.magnitude === 'biomassa') {
      out.push({ band: pool.band, stem: pool.col, suffix: 'tB', mult: 1 });
      out.push({ band: pool.band, stem: pool.col, suffix: 'tC',
        mult: r.factor_to_c });
    } else if (r.magnitude === 'incerteza') {
      out.push({ band: pool.band, stem: 'incerteza', suffix: 'tC', mult: 1 });
    } else { // carbono — banda nativa já em t C/ha
      out.push({ band: pool.band, stem: pool.col, suffix: 'tC', mult: 1 });
    }
  });
  return out;
}

/** Nome GRÁFICO da coluna de uma emissão ('AGB (t MS)', 'AGC (t C)', …). */
function colName(c) {
  var label = POOL_LABEL[c.stem] || c.stem.toUpperCase();
  return label + ' (' + (c.suffix === 'tB' ? 't MS' : 't C') + ')';
}

/** Resolve o ee.Image de um pool/value band (asset direto ou filter_index). */
function valueImage(r, band) {
  var img;
  if (r.filter_index) {
    img = ee.Image(ee.ImageCollection(r.asset)
      .filter(ee.Filter.eq('system:index', r.filter_index)).first());
  } else {
    img = ee.Image(r.asset);
  }
  img = img.select(band);
  if (r.nodata_le !== null && r.nodata_le !== undefined) {
    img = img.updateMask(img.gt(r.nodata_le));
  }
  return img;
}

/** Stack [área, pools, (área, pools)×mod0..7, classe, territory]. */
function refStack(contract, r, bandName) {
  var cols = emitCols(r);
  var lulc = lulcImage(contract).rename('classe');
  var area = ee.Image.pixelArea().divide(10000);
  var areaHa = area.rename('area_ha').updateMask(lulc.mask());
  var defsec = defsecImage(contract);

  var pools = cols.map(function (c) {
    var img = valueImage(r, bandName || c.band);
    return img.multiply(area).multiply(c.mult)
      .unmask(0).updateMask(img.mask().and(lulc.mask()));
  });

  var base = [areaHa].concat(pools);
  var mods = [];
  LEG.DEFSEC_MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    base.forEach(function (bnd, i) {
      mods.push(bnd.updateMask(cond).rename(
        i === 0 ? 'area_mod' + m : 'pool_mod' + m + '_' + i));
    });
  });
  return ee.Image.cat(base.concat(mods).concat([lulc, T.territoryImage()]));
}

/** Banda do ano Y para ref multi_year (Xu): `b<i>` com i = Y - start + 1. */
function bandForYear(r, y) {
  return r.multi_year ? 'b' + (y - r.multi_year.start + 1) : null;
}

function range(start, end) {
  var out = [];
  for (var i = start; i <= end; i++) out.push(i);
  return out;
}

function isNumericEpoch(e) {
  return e !== null && e !== undefined && /^\d{4}$/.test(String(e));
}

/** Colunas dos CSVs das referências (export único, só combinações). */
function refColumns(refInfo) {
  var cols = ['fonte', 'ref_id', 'territorio', 'Bioma', 'UF',
    'Unidade Federativa', 'classe',
    'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
    'cobertura (n4)', 'Desmatamento e vegetação secundária',
    'ano_lulc', 'ano', 'Área (ha)'];
  emitCols(refInfo).forEach(function (c) { cols.push(colName(c)); });
  return cols;
}

/** FeatureCollection servidor-side de um ref × bioma × ano. */
function refRows(contract, refInfo, bandName, ano, geom, D) {
  var YEAR = contract.YEAR;
  var cols = emitCols(refInfo);
  var base = 1 + cols.length;
  var poolNames = cols.map(function (c) { return colName(c); });
  var nBands = cols.length;
  var source = refInfo.fonte;
  var rid = refInfo.id;
  var anoVal = (ano === null || ano === undefined) ? ''
    : (typeof ano === 'number') ? ee.Number(ano) : ano;
  var n = base * (1 + LEG.DEFSEC_MODS.length);
  var groups = ee.List(reduceStack(refStack(contract, refInfo, bandName), n, geom, refInfo.scale));

  return expandRows(groups, {
    info: D.info, biome: D.biome, sigla: D.sigla, nome: D.nome,
    prefixLen: base, blockLen: base,
    one: function (ctx) {
      var props = {
        fonte: source, ref_id: rid,
        territorio: ctx.territorio, Bioma: ctx.biomeName, UF: ctx.ufSigla,
        'Unidade Federativa': ctx.ufNome,
        classe: ctx.cls,
        'cobertura (n0)': ctx.info.get('n0'),
        'cobertura (n1)': ctx.info.get('n1'),
        'cobertura (n2)': ctx.info.get('n2'),
        'cobertura (n3)': ctx.info.get('n3'),
        'cobertura (n4)': ctx.info.get('n4'),
        'Desmatamento e vegetação secundária':
          D.defsec.get(ee.Number(ctx.j).format()),
        ano_lulc: YEAR, ano: anoVal,
        'Área (ha)': r1(ctx.am)
      };
      for (var i = 0; i < nBands; i++) {
        props[poolNames[i]] = r1(ee.Number(ctx.s.get(ctx.off + 1 + i)));
      }
      return props;
    }
  });
}

/**
 * Gera as estatísticas de TODOS os refs (ou um subconjunto), combinando os
 * biomas × UFs num ÚNICO CSV por ref.
 * Uso: engine.runReferences(contract) |
 *      engine.runReferences(contract, { ref_ids: ['zimbres_agb'] }) |
 *      engine.runReferences(contract, { biomes: ['cerrado'] })
 * `done` (opcional) é chamado ao final do agendamento (após todas as refs).
 */
exports.runReferences = function (contract, opts, done) {
  opts = opts || {};
  setupTerritory(contract);
  var refs = contract.REFERENCES.filter(function (r) {
    return !opts.ref_ids || opts.ref_ids.indexOf(r.id) > -1;
  });
  var selBiomes = contract.BIOMES.filter(function (b) {
    return !opts.biomes || opts.biomes.indexOf(b.slug) > -1;
  });

  var tot = refs.length;
  var finished = 0;
  var scheduled = 0;
  function jobDone(ok) {
    if (ok) scheduled++;
    finished++;
    if (finished === tot) {
      print('[FIM] references ·', tot, 'refs ·', scheduled,
        'exports agendados imediatos.');
    }
  }

  T.loadTerritories(function () {
    var D = T.buildLabelDicts(LEG);
    refs.forEach(function (r) {
      print('MAPBIOMAS-CARBONO · references · 7_references ·', r.id);
      if (!INFRA.assetExists(r.asset)) {
        print('[ERRO] asset não encontrado:', r.asset);
        jobDone(false); return;
      }

      var years = r.multi_year
        ? range(r.multi_year.start, r.multi_year.end) : [null];
      var fcs = [];
      selBiomes.forEach(function (b) {
        var geom = T.regionGeom(b.nome);
        years.forEach(function (y) {
          var bandName = r.multi_year ? bandForYear(r, y) : r.pools[0].band;
          var ano = r.multi_year ? y :
            (isNumericEpoch(r.epoch) ? r.epoch : null);
          fcs.push(refRows(contract, r, bandName, ano, geom, D));
        });
      });

      var fc = fcs[0];
      for (var i = 1; i < fcs.length; i++) fc = fc.merge(fcs[i]);
      var fileName = contract.PREFIX + '_' + r.id + '_' + contract.YEAR;
      try {
        Export.table.toDrive({
          collection: fc,
          description: 'WS_CARBONO_stats_references_' + r.id + '_' + contract.YEAR,
          folder: contract.DRIVE_FOLDER,
          fileNamePrefix: fileName,
          fileFormat: 'CSV',
          selectors: refColumns(r)
        });
        print('[OK]', r.id, '· export IMEDIATO agendado (',
          selBiomes.length, 'bioma(s) ×', years.length, 'ano(s) ·',
          'contagem de linhas você confere ao final na task/CSV).');
        jobDone(true);
      } catch (e) {
        print('[ERRO export]', fileName, String(e).slice(0, 200));
        jobDone(false);
      }
    });
    if (done) done(scheduled, tot);
  });
};

/* ==========================================================================
 * FOREST
 * ======================================================================== */

/**
 * Resolve o mosaico de UMA versão, com fallback automático:
 *   1) merge anual exportado (agc_pred_v0X_merged_<ano>);
 *   2) senão, mosaico da ImageCollection PREDICTIONS/COL da própria versão.
 */
function safeMosaic(contract, v) {
  if (INFRA.assetExists(v.mosaic)) return ee.Image(v.mosaic);
  var colPath = v.mosaic.replace(/\/[^/]+$/, '/COL');
  print('[AVISO] merge não encontrado — usando COL mosaic de', v.id, '→', colPath);
  return ee.ImageCollection(colPath)
    .filter(ee.Filter.eq('year', contract.YEAR))
    .mosaic()
    .rename([v.band].concat(v.stdBand ? [v.stdBand] : []));
}

/** Stack [área_ha, estoque, w2, (área_modX, estoque_modX)×8, n0, territory]. */
function forestStack(contract, v) {
  var img = safeMosaic(contract, v);
  var value = img.select(v.band).rename('valor');
  var lulc = lulcImage(contract).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var areaHa = ee.Image.pixelArea().divide(10000);
  var defsec = defsecImage(contract);
  var area = areaHa.rename('area_ha').updateMask(lulc.mask());
  var stock = value.multiply(areaHa).rename('estoque').unmask(0).updateMask(mask);
  var w2 = v.stdBand
    ? img.select(v.stdBand).rename('w2').multiply(areaHa).pow(2).updateMask(mask)
    : ee.Image(0).rename('w2').updateMask(mask);
  var mods = [];
  LEG.DEFSEC_MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    mods.push(area.updateMask(cond).rename('area_mod' + m),
      stock.updateMask(cond).rename('estoque_mod' + m));
  });
  return ee.Image.cat([area, stock, w2].concat(mods)
    .concat([lulc, T.territoryImage()]));
}

/** Colunas dos CSVs florestais (Incerteza só quando há stdBand). */
function forestColumns(v) {
  var cols = ['version', 'ano', 'territorio', 'Bioma', 'UF',
    'Unidade Federativa', 'classe',
    'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
    'cobertura (n4)', 'Desmatamento e vegetação secundária',
    'Área (ha)', 'Estoque de carbono (t)'];
  if (v.stdBand) cols.push('Incerteza do estoque (t)');
  return cols;
}

/** FeatureCollection servidor-side das linhas (classe × def_sec) de uma versão. */
function forestRows(contract, v, geom, D) {
  var YEAR = contract.YEAR;
  var nValue = 3 + 2 * LEG.DEFSEC_MODS.length;
  var groups = ee.List(reduceStack(forestStack(contract, v), nValue, geom, contract.SCALE));
  var vId = v.id;
  var withStd = !!v.stdBand;

  return expandRows(groups, {
    info: D.info, biome: D.biome, sigla: D.sigla, nome: D.nome,
    prefixLen: 3, blockLen: 2,
    one: function (ctx) {
      var props = {
        version: vId, ano: YEAR,
        territorio: ctx.territorio, Bioma: ctx.biomeName, UF: ctx.ufSigla,
        'Unidade Federativa': ctx.ufNome,
        classe: ctx.cls,
        'cobertura (n0)': ctx.info.get('n0', ''),
        'cobertura (n1)': ctx.info.get('n1', ''),
        'cobertura (n2)': ctx.info.get('n2', ''),
        'cobertura (n3)': ctx.info.get('n3', ''),
        'cobertura (n4)': ctx.info.get('n4', ''),
        'Desmatamento e vegetação secundária':
          D.defsec.get(ee.Number(ctx.j).format(), ''),
        'Área (ha)': r1(ctx.am),
        'Estoque de carbono (t)': r1(ee.Number(ctx.s.get(ctx.off + 1)))
      };
      if (withStd) {
        props['Incerteza do estoque (t)'] =
          r1(ee.Number(ctx.s.get(2)).max(0).sqrt());
      }
      return props;
    }
  });
}

/**
 * Gera as estatísticas florestais. Sem `versionId`, roda todas as versões do
 * contrato (V03–V08); com `versionId`, apenas a versão indicada.
 * Uso: engine.runForest(contract) | engine.runForest(contract, 'v07').
 * `done` (opcional) é chamado ao final do agendamento (após todas as versões).
 */
exports.runForest = function (contract, versionId, done) {
  setupTerritory(contract);
  var versions = versionId
    ? contract.VERSIONS.filter(function (x) { return x.id === versionId; })
    : contract.VERSIONS;
  if (!versions.length) {
    print('[ERRO] versão desconhecida:', versionId, '— disponíveis:',
      contract.VERSIONS.map(function (x) { return x.id; }).join(', '));
    if (done) done(0, 0);
    return;
  }
  var slug = 'bioma';

  T.loadTerritories(function () {
    var D = T.buildLabelDicts(LEG);
    var geom = T.regionGeom(contract.BIOME_NAME);
    var scheduled = 0;
    versions.forEach(function (v) {
      print('MAPBIOMAS-CARBONO ·', contract.BIOME_NAME, 'Forest · 7_statistics ·', v.id);
      var fileName = contract.PREFIX + '_' + v.id + '_' + slug + '_' + contract.YEAR;
      try {
        Export.table.toDrive({
          collection: forestRows(contract, v, geom, D),
          description: 'WS_CARBONO_stats_forest_' + v.id + '_' + slug + '_' + contract.YEAR,
          folder: contract.DRIVE_FOLDER,
          fileNamePrefix: fileName,
          fileFormat: 'CSV',
          selectors: forestColumns(v)
        });
        print('[OK]', v.id, '· export IMEDIATO agendado (', contract.BIOME_NAME,
          '· contagem de linhas você confere na task/CSV).');
        scheduled++;
      } catch (e) {
        print('[ERRO export]', fileName, String(e).slice(0, 200));
      }
    });
    print('[FIM]', contract.BIOME_NAME, 'Forest ·', scheduled, 'de',
      versions.length, 'exports agendados imediatos.');
    if (done) done(scheduled, versions.length);
  });
};

/* ==========================================================================
 * GRASSLAND
 * ======================================================================== */

/** Banda zero-pad de mês: `biomass_01`…`biomass_12`. */
function pad(n) { return (n < 10 ? '0' : '') + n; }

/** Produto do contrato por versão × id (anual + mensal). */
function productOf(contract, versionId, id) {
  var list = contract.PRODUCTS.concat(contract.MONTHLY);
  for (var i = 0; i < list.length; i++) {
    if (list[i].version === versionId && list[i].id === id) return list[i];
  }
  return null;
}

/** Reduz o stack mensal [área_ha, valor_t, (área, valor)×mod0..7, classe,
 * territory] por CLASSE × TERRITÓRIO. */
function grassMonthlyStack(contract, product, month) {
  var lulc = lulcImage(contract).rename('classe');
  var defsec = defsecImage(contract);
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
  return ee.Image.cat(base.concat(mods).concat([lulc, T.territoryImage()]));
}

/** Stack principal anual [área, biomassa, estoque, (…)×mod0..7, classe,
 * territory] (N_VALUE = 27; off = 3 + j*3). */
function grassPrincipalStack(contract, biomass, carbon) {
  var biomassa = ee.Image(biomass.asset).select(biomass.band)
    .multiply(1 / 1000).rename('biomassa');
  var estoque = ee.Image(carbon.asset).select(carbon.band)
    .multiply(1).rename('estoque');
  var lulc = lulcImage(contract).rename('classe');
  var defsec = defsecImage(contract);
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
  return ee.Image.cat(base.concat(mods).concat([lulc, T.territoryImage()]));
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

/** FeatureCollection servidor-side de UM mês (linhas longas com `período`). */
function grassRowsMonthly(contract, product, month, mes, valueCol, geom, D) {
  var n = 2 * (1 + LEG.DEFSEC_MODS.length);
  var groups = ee.List(reduceStack(
    grassMonthlyStack(contract, product, month), n, geom, contract.SCALE));
  var vId = product.version;
  var periodo = contract.YEAR + '_' + pad(mes);

  return expandRows(groups, {
    info: D.info, biome: D.biome, sigla: D.sigla, nome: D.nome,
    prefixLen: 2, blockLen: 2,
    one: function (ctx) {
      var props = {
        produto: 'grassland', versao: vId, ano: contract.YEAR,
        territorio: ctx.territorio, Bioma: ctx.biomeName, UF: ctx.ufSigla,
        'Unidade Federativa': ctx.ufNome, unidade: 't', classe: ctx.cls,
        'cobertura (n0)': ctx.info.get('n0', ''),
        'cobertura (n1)': ctx.info.get('n1', ''),
        'cobertura (n2)': ctx.info.get('n2', ''),
        'cobertura (n3)': ctx.info.get('n3', ''),
        'cobertura (n4)': ctx.info.get('n4', ''),
        'Desmatamento e vegetação secundária':
          D.defsec.get(ee.Number(ctx.j).format(), ''),
        'período': periodo,
        'Área (ha)': r1(ctx.am)
      };
      props[valueCol] = r1(ee.Number(ctx.s.get(ctx.off + 1)));
      return props;
    }
  });
}

/** FeatureCollection servidor-side da TABELA PRINCIPAL (biomassa + estoque). */
function grassRowsPrincipal(contract, versionId, biomass, carbon, geom, D) {
  var nValue = 3 * (1 + LEG.DEFSEC_MODS.length);
  var groups = ee.List(reduceStack(
    grassPrincipalStack(contract, biomass, carbon), nValue, geom, contract.SCALE));

  return expandRows(groups, {
    info: D.info, biome: D.biome, sigla: D.sigla, nome: D.nome,
    prefixLen: 3, blockLen: 3,
    one: function (ctx) {
      return {
        produto: 'grassland', versao: versionId, ano: contract.YEAR,
        territorio: ctx.territorio, Bioma: ctx.biomeName, UF: ctx.ufSigla,
        'Unidade Federativa': ctx.ufNome, unidade: 't', classe: ctx.cls,
        'cobertura (n0)': ctx.info.get('n0', ''),
        'cobertura (n1)': ctx.info.get('n1', ''),
        'cobertura (n2)': ctx.info.get('n2', ''),
        'cobertura (n3)': ctx.info.get('n3', ''),
        'cobertura (n4)': ctx.info.get('n4', ''),
        'Desmatamento e vegetação secundária':
          D.defsec.get(ee.Number(ctx.j).format(), ''),
        'Área (ha)': r1(ctx.am),
        'Biomassa (t)': r1(ee.Number(ctx.s.get(ctx.off + 1))),
        'Estoque de carbono (t)': r1(ee.Number(ctx.s.get(ctx.off + 2)))
      };
    }
  });
}

/**
 * Executa as 3 tabelas de UMA versão campestre (ou de todas, sem `versionId`):
 * principal (anual), biomassa mensal e ANPP mensal. Região = bioma; a
 * diferenciação por UF sai da banda `territory` nas colunas UF/Unidade
 * Federativa. Exports agendados IMEDIATAMENTE (sem evaluate).
 * `done` (opcional) é chamado ao final do agendamento (após todas as versões).
 */
exports.runGrassland = function (contract, versionId, done) {
  setupTerritory(contract);
  var versions = versionId ? [versionId] : contract.VERSIONS;

  T.loadTerritories(function () {
    var D = T.buildLabelDicts(LEG);
    var geom = T.regionGeom(contract.BIOME_NAME);
    var slug = 'bioma';
    var totalScheduled = 0;

    versions.forEach(function (vid) {
      var biomass = productOf(contract, vid, 'biomass');
      var carbon = productOf(contract, vid, 'carbon');
      // NOTA (paridade): os ids mensais do catálogo são 'biomass'/'anpp', então
      // estas buscas por 'biomassMonthly'/'biomass_mensal' NÃO casam — as
      // tabelas mensais B/C ficam desativadas, exatamente como no motor legado.
      // (Corrigir o id aqui mudaria as saídas; tratar como mudança consciente.)
      var biomassM = productOf(contract, vid, 'biomassMonthly') ||
        productOf(contract, vid, 'biomass_mensal');
      var anppM = productOf(contract, vid, 'anppMonthly') ||
        productOf(contract, vid, 'anpp_mensal');

      if (!biomass && !biomassM) {
        print('[ERRO] grassland versões disponíveis:', contract.VERSIONS,
          '· recebido:', vid); return;
      }

      var context = 'grassland · ' + vid + ' · ' + slug;
      var scheduled = 0;

      /* A) tabela principal — biomassa + estoque no MESMO stack (anual). */
      if (biomass && carbon && INFRA.assetExists(biomass.asset) &&
          INFRA.assetExists(carbon.asset)) {
        var prefixA = contract.PREFIX + '_' + vid + '_' + slug + '_' + contract.YEAR;
        try {
          Export.table.toDrive({
            collection: grassRowsPrincipal(contract, vid, biomass, carbon, geom, D),
            description: 'WS_CARBONO_toDrive-' + prefixA,
            fileNamePrefix: prefixA,
            folder: contract.DRIVE_FOLDER, fileFormat: 'CSV', selectors: SEL_A
          });
          print('[OK]', context, 'principal · export IMEDIATO agendado.');
          scheduled++;
        } catch (e) {
          print('[ERRO export principal]', context, String(e).slice(0, 200));
        }
      }

      /* B) biomassa mensal — LONGA (1 linha por combinação × mês, `período`). */
      if (biomassM && INFRA.assetExists(biomassM.asset)) {
        var prefixB = contract.PREFIX + '_' + vid + '_biomassa_mensal_' +
          slug + '_' + contract.YEAR;
        var fcB = grassRowsMonthly(contract, biomassM, 1, 1, 'Biomassa (t)', geom, D);
        for (var m = 2; m <= 12; m++) {
          fcB = fcB.merge(
            grassRowsMonthly(contract, biomassM, m, m, 'Biomassa (t)', geom, D));
        }
        try {
          Export.table.toDrive({
            collection: fcB,
            description: 'WS_CARBONO_toDrive-' + prefixB,
            fileNamePrefix: prefixB,
            folder: contract.DRIVE_FOLDER, fileFormat: 'CSV',
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
      if (anppM && INFRA.assetExists(anppM.asset)) {
        var prefixC = contract.PREFIX + '_' + vid + '_anpp_mensal_' +
          slug + '_' + contract.YEAR;
        var fcC = grassRowsMonthly(contract, anppM, 1, 1, 'ANPP (t MS/ano)', geom, D);
        for (var k = 2; k <= 12; k++) {
          fcC = fcC.merge(
            grassRowsMonthly(contract, anppM, k, k, 'ANPP (t MS/ano)', geom, D));
        }
        try {
          Export.table.toDrive({
            collection: fcC,
            description: 'WS_CARBONO_toDrive-' + prefixC,
            fileNamePrefix: prefixC,
            folder: contract.DRIVE_FOLDER, fileFormat: 'CSV',
            selectors: SEL_MENSAL.concat(['ANPP (t MS/ano)'])
          });
          print('[OK]', context, 'anpp mensal · export IMEDIATO agendado ' +
            '(período 2023_01..2023_12).');
          scheduled++;
        } catch (e) {
          print('[ERRO export anpp]', context, String(e).slice(0, 200));
        }
      }

      print('[FIM]', vid, '·', scheduled, 'de 3 exports agendados imediatos.');
      totalScheduled += scheduled;
    });
    print('[FIM] grassland ·', versions.join(', '), '·', totalScheduled,
      'exports agendados imediatos.');
    if (done) done(totalScheduled);
  });
};

/* ---- Exposição p/ QA/testes --------------------------------------------- */
exports.r1 = r1;
exports.emitCols = emitCols;
exports.colName = colName;
exports.refColumns = refColumns;
exports.forestColumns = forestColumns;
exports.SEL_A = SEL_A;
exports.SEL_MENSAL = SEL_MENSAL;
