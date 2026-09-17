/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · engine (motor unificado)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas por classe LULC C11 dos domínios:
 *   runForest(contract, versionId?)      — AGC florestal (V03–V08), tabela LARGA
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
 *
 * Território: SEMPRE cruza bioma × UF; rótulos por dicionário estático
 * (module_territory). Coluna `territorio` removida; entra `ecossistema`.
 * Não faz require de contratos: os drivers (run/*) injetam o contrato.
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

/** Configura o território do módulo (contrato plano). */
function setupTerritory(contract) { T.configure(contract.territory); }

/** Colunas territoriais/categóricas comuns (sem `territorio`). */
function coberturaCols() {
  return ['cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
    'cobertura (n4)', 'Desmatamento e vegetação secundária'];
}

/**
 * Expansão SERVIDOR-SIDE das combinações (classe × def_sec) de um conjunto de
 * grupos (classe → território → sum). `spec`:
 *   info, biome, sigla, nome (ee.Dictionary)
 *   prefixLen, blockLen     — layout do `sum` por combinação def_sec
 *   one(ctx)                — monta o objeto de props (ctx: s, off, am, j, cls,
 *                             info, biomeName, ufSigla, ufNome)
 * A combinação é descartada quando área ≤ 0.
 */
function expandRows(groups, spec) {
  function expandTerritory(tEl) {
    var td = ee.Dictionary(tEl);
    var codigo = ee.Number(td.get('territory')).int();
    var biomeId = codigo.divide(100).int();
    var ufId = codigo.mod(100).int();
    var biomeName = ee.String(spec.biome.get(biomeId, ''));
    var ufSigla = ee.String(spec.sigla.get(ufId, ''));
    var ufNome = ee.String(spec.nome.get(ufId, ''));

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
          biomeName: biomeName, ufSigla: ufSigla, ufNome: ufNome
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

/** Nome GRÁFICO da coluna: '<Autor> <pool> (t MS|t C)'. */
function colName(c, refInfo) {
  var label = POOL_LABEL[c.stem] || c.stem.toUpperCase();
  var src = (refInfo && refInfo.fonte_curta) ? refInfo.fonte_curta + ' ' : '';
  return src + label + ' (' + (c.suffix === 'tB' ? 't MS' : 't C') + ')';
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

/** Banda do ano de um ref multi_year (Xu): o mais recente <= YEAR. */
function refBandName(contract, r) {
  if (!r.multi_year) return null;
  return bandForYear(r, Math.min(contract.YEAR, r.multi_year.end));
}

/**
 * Stack LARGO de um GRUPO de referências: [área, (colunas de valor de cada
 * ref, na ordem), (…)×8 mods, classe, territory]. A área é compartilhada.
 * Retorna { image, nBase, colNames } (colNames[i] = nome da coluna de valor i).
 */
function groupStack(contract, refs) {
  var lulc = lulcImage(contract).rename('classe');
  var area = ee.Image.pixelArea().divide(10000);
  var areaHa = area.rename('area_ha').updateMask(lulc.mask());
  var defsec = defsecImage(contract);
  var base = [areaHa];
  var colNames = [];

  refs.forEach(function (r) {
    var bandName = refBandName(contract, r);
    emitCols(r).forEach(function (c) {
      var img = valueImage(r, bandName || c.band);
      base.push(img.multiply(area).multiply(c.mult)
        .unmask(0).updateMask(img.mask().and(lulc.mask())));
      colNames.push(colName(c, r));
    });
  });

  var mods = [];
  LEG.DEFSEC_MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    base.forEach(function (bnd, i) {
      mods.push(bnd.updateMask(cond).rename(
        i === 0 ? 'area_mod' + m : 'pool_mod' + m + '_' + i));
    });
  });
  return {
    image: ee.Image.cat(base.concat(mods).concat([lulc, T.territoryImage()])),
    nBase: base.length,
    colNames: colNames
  };
}

/** Banda do ano Y para ref multi_year (Xu): `b<i>` com i = Y - start + 1. */
function bandForYear(r, y) {
  return r.multi_year ? 'b' + (y - r.multi_year.start + 1) : null;
}

/** Colunas do CSV de um grupo de referências. */
function refColumns(groupRefs) {
  var cols = ['ecossistema', 'Bioma', 'UF', 'Unidade Federativa', 'classe']
    .concat(coberturaCols())
    .concat(['ano_lulc', 'Área (ha)']);
  groupRefs.forEach(function (r) {
    emitCols(r).forEach(function (c) { cols.push(colName(c, r)); });
  });
  return cols;
}

/** FeatureCollection servidor-side de um grupo de refs × bioma. */
function groupRows(contract, groupRefs, scale, geom, D) {
  var YEAR = contract.YEAR;
  var g = groupStack(contract, groupRefs);
  var n = g.nBase * (1 + LEG.DEFSEC_MODS.length);
  var groups = ee.List(reduceStack(g.image, n, geom, scale));
  var nBands = g.colNames.length;

  return expandRows(groups, {
    info: D.info, biome: D.biome, sigla: D.sigla, nome: D.nome,
    prefixLen: g.nBase, blockLen: g.nBase,
    one: function (ctx) {
      var props = {
        ecossistema: 'referencia',
        Bioma: ctx.biomeName, UF: ctx.ufSigla, 'Unidade Federativa': ctx.ufNome,
        classe: ctx.cls,
        'cobertura (n0)': ctx.info.get('n0'),
        'cobertura (n1)': ctx.info.get('n1'),
        'cobertura (n2)': ctx.info.get('n2'),
        'cobertura (n3)': ctx.info.get('n3'),
        'cobertura (n4)': ctx.info.get('n4'),
        'Desmatamento e vegetação secundária':
          D.defsec.get(ee.Number(ctx.j).format()),
        ano_lulc: YEAR,
        'Área (ha)': r1(ctx.am)
      };
      for (var i = 0; i < nBands; i++) {
        props[g.colNames[i]] = r1(ee.Number(ctx.s.get(ctx.off + 1 + i)));
      }
      return props;
    }
  });
}

/**
 * Gera as estatísticas das referências AGRUPADAS por família (campo `grupo`),
 * com UM CSV por grupo (métricas de cada ref em colunas distintas). Refs
 * multi-ano (Xu) usam UM ano: min(contract.YEAR, multi_year.end).
 * Uso: engine.runReferences(contract) |
 *      engine.runReferences(contract, { ref_ids: ['zimbres_agb'] }) |
 *      engine.runReferences(contract, { biomes: ['cerrado'] })
 * `done` (opcional) é chamado ao final do agendamento.
 */
exports.runReferences = function (contract, opts, done) {
  opts = opts || {};
  if (typeof opts === 'string') opts = { ref_ids: [opts] };
  var onlyRefs = opts.ref_ids
    ? (Array.isArray(opts.ref_ids) ? opts.ref_ids : [opts.ref_ids]) : null;
  var onlyBiomes = opts.biomes
    ? (Array.isArray(opts.biomes) ? opts.biomes : [opts.biomes]) : null;
  setupTerritory(contract);

  if (onlyRefs) {
    var known = contract.REFERENCES.map(function (r) { return r.id; });
    onlyRefs.forEach(function (id) {
      if (known.indexOf(id) === -1) print('[AVISO] ref_id desconhecido:', id);
    });
  }
  if (onlyBiomes) {
    var slugs = contract.BIOMES.map(function (b) { return b.slug; });
    onlyBiomes.forEach(function (s) {
      if (slugs.indexOf(s) === -1) print('[AVISO] bioma desconhecido:', s);
    });
  }

  var refs = contract.REFERENCES.filter(function (r) {
    return !onlyRefs || onlyRefs.indexOf(r.id) > -1;
  });
  var selBiomes = contract.BIOMES.filter(function (b) {
    return !onlyBiomes || onlyBiomes.indexOf(b.slug) > -1;
  });
  var D = T.buildLabelDicts(LEG);
  var grupos = contract.GRUPOS || {};

  // Agrupa por família, preservando a ordem de aparição.
  var byGroup = {};
  var order = [];
  refs.forEach(function (r) {
    var g = r.grupo || r.id;
    if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
    byGroup[g].push(r);
  });

  var scheduled = 0;
  order.forEach(function (g) {
    var groupRefs = byGroup[g].filter(function (r) {
      var ok = INFRA.assetExists(r.asset);
      if (!ok) print('[AVISO] ref', r.id, 'indisponível — ignorada no grupo', g);
      return ok;
    });
    if (!groupRefs.length) {
      print('[AVISO] grupo', g, 'sem refs disponíveis — ignorado.');
      return;
    }
    var scale = (grupos[g] && grupos[g].scale) || groupRefs[0].scale;

    var fcs = selBiomes.map(function (b) {
      return groupRows(contract, groupRefs, scale, T.regionGeom(b.nome), D);
    });
    var fc = fcs[0];
    for (var i = 1; i < fcs.length; i++) fc = fc.merge(fcs[i]);
    var fileName = contract.PREFIX + '_' + g + '_' + contract.YEAR;
    print('MAPBIOMAS-CARBONO · references · run_references · grupo', g,
      '(' + groupRefs.length, 'refs)');
    try {
      Export.table.toDrive({
        collection: fc,
        description: 'WS_CARBONO_stats_references_' + g + '_' + contract.YEAR,
        folder: contract.DRIVE_FOLDER,
        fileNamePrefix: fileName,
        fileFormat: 'CSV',
        selectors: refColumns(groupRefs)
      });
      print('[OK]', g, '· export IMEDIATO agendado (',
        selBiomes.length, 'bioma(s)).');
      scheduled++;
    } catch (e) {
      print('[ERRO export]', fileName, String(e).slice(0, 200));
    }
  });
  print('[FIM] references ·', order.length, 'grupos ·', scheduled,
    'exports agendados imediatos.');
  if (done) done(scheduled, order.length);
};

/* ==========================================================================
 * FOREST (tabela LARGA: todas as versões em colunas)
 * ======================================================================== */

/** Aceita seleção posicional (string) OU objeto: { version: 'v07' }. */
function selVersion(versionId) {
  if (versionId && typeof versionId === 'object') return versionId.version || null;
  return versionId || null;
}

/**
 * Caminho do mosaico de uma versão (auto-descoberta):
 *   1) merge anual exportado (agc_pred_v0X_merged_<ano>);
 *   2) senão, ImageCollection PREDICTIONS/COL da própria versão;
 *   3) senão, null (versão indisponível — ignorada).
 */
function mosaicPath(v) {
  if (INFRA.assetExists(v.mosaic)) return v.mosaic;
  var colPath = v.mosaic.replace(/\/[^/]+$/, '/COL');
  if (INFRA.assetExists(colPath)) return colPath;
  return null;
}

/**
 * Resolve o mosaico de UMA versão a partir do `path` já resolvido por
 * `mosaicPath` (merge ou COL). Não testa existência de novo.
 */
function safeMosaic(contract, v, path) {
  if (path === v.mosaic) return ee.Image(v.mosaic);
  print('[AVISO] merge não encontrado — usando COL mosaic de', v.id, '→', path);
  return ee.ImageCollection(path)
    .filter(ee.Filter.eq('year', contract.YEAR))
    .mosaic()
    .rename([v.band].concat(v.stdBand ? [v.stdBand] : []));
}

function stdVersionsOf(versions) {
  return versions.filter(function (v) { return !!v.stdBand; });
}

/**
 * Stack largo: [área, estoque_v1..vn, w2_(versões com std), (…)×8 mods,
 * lulc, territory]. A área é compartilhada; cada versão contribui com o
 * estoque total e, quando houver, o w2 = (std×área)².
 */
function forestWideStack(contract, versions, paths) {
  var lulc = lulcImage(contract).rename('n0');
  var areaHa = ee.Image.pixelArea().divide(10000);
  var defsec = defsecImage(contract);
  var base = [areaHa.rename('area_ha').updateMask(lulc.mask())];

  versions.forEach(function (v) {
    var value = safeMosaic(contract, v, paths[v.id]).select(v.band);
    var mask = value.mask().and(lulc.mask());
    base.push(value.multiply(areaHa).rename('estoque_' + v.id)
      .unmask(0).updateMask(mask));
  });
  stdVersionsOf(versions).forEach(function (v) {
    var img = safeMosaic(contract, v, paths[v.id]);
    var mask = img.select(v.band).mask().and(lulc.mask());
    base.push(img.select(v.stdBand).rename('w2_' + v.id)
      .multiply(areaHa).pow(2).updateMask(mask));
  });

  var mods = [];
  LEG.DEFSEC_MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    base.forEach(function (bnd, i) {
      mods.push(bnd.updateMask(cond).rename('mod' + m + '_' + i));
    });
  });
  return ee.Image.cat(base.concat(mods).concat([lulc, T.territoryImage()]));
}

/** Colunas do CSV largo florestal. */
function forestColumns(versions) {
  var cols = ['ecossistema', 'Bioma', 'UF', 'Unidade Federativa', 'classe']
    .concat(coberturaCols())
    .concat(['ano_lulc', 'Área (ha)']);
  versions.forEach(function (v) { cols.push(v.id + ' Estoque (t)'); });
  stdVersionsOf(versions).forEach(function (v) {
    cols.push(v.id + ' Incerteza (t)');
  });
  return cols;
}

/** FeatureCollection servidor-side da tabela larga florestal. */
function forestRows(contract, versions, paths, geom, D) {
  var nBase = 1 + versions.length + stdVersionsOf(versions).length;
  var n = nBase * (1 + LEG.DEFSEC_MODS.length);
  var groups = ee.List(reduceStack(forestWideStack(contract, versions, paths), n, geom, contract.SCALE));
  var nVersions = versions.length;
  var std = stdVersionsOf(versions);
  var estCols = versions.map(function (v) { return v.id + ' Estoque (t)'; });
  var incCols = std.map(function (v) { return v.id + ' Incerteza (t)'; });

  return expandRows(groups, {
    info: D.info, biome: D.biome, sigla: D.sigla, nome: D.nome,
    prefixLen: nBase, blockLen: nBase,
    one: function (ctx) {
      var props = {
        ecossistema: 'florestal',
        Bioma: ctx.biomeName, UF: ctx.ufSigla, 'Unidade Federativa': ctx.ufNome,
        classe: ctx.cls,
        'cobertura (n0)': ctx.info.get('n0', ''),
        'cobertura (n1)': ctx.info.get('n1', ''),
        'cobertura (n2)': ctx.info.get('n2', ''),
        'cobertura (n3)': ctx.info.get('n3', ''),
        'cobertura (n4)': ctx.info.get('n4', ''),
        'Desmatamento e vegetação secundária':
          D.defsec.get(ee.Number(ctx.j).format(), ''),
        ano_lulc: contract.YEAR,
        'Área (ha)': r1(ctx.am)
      };
      for (var i = 0; i < nVersions; i++) {
        props[estCols[i]] = r1(ee.Number(ctx.s.get(ctx.off + 1 + i)));
      }
      for (var k = 0; k < std.length; k++) {
        props[incCols[k]] =
          r1(ee.Number(ctx.s.get(ctx.off + 1 + nVersions + k)).max(0).sqrt());
      }
      return props;
    }
  });
}

/**
 * Gera as estatísticas florestais numa ÚNICA tabela LARGA (todas as versões em
 * colunas). `versionId` aceita string ('v07') ou objeto ({ version: 'v07' });
 * sem ele, usa TODAS as versões DISPONÍVEIS (auto-descoberta: merge ou COL;
 * versões ausentes são ignoradas). `done` (opcional) ao final do agendamento.
 */
exports.runForest = function (contract, versionId, done) {
  setupTerritory(contract);
  var sel = selVersion(versionId);
  var requested;
  if (sel) {
    requested = contract.VERSIONS.filter(function (x) { return x.id === sel; });
    if (!requested.length) {
      print('[ERRO] versão desconhecida:', sel, '— disponíveis:',
        contract.VERSIONS.map(function (x) { return x.id; }).join(', '));
      if (done) done(0, 0);
      return;
    }
  } else {
    requested = contract.VERSIONS;
  }

  var paths = {};
  var versions = [];
  requested.forEach(function (v) {
    var p = mosaicPath(v);
    if (p) { paths[v.id] = p; versions.push(v); }
    else if (!sel) {
      print('[AVISO] versão', v.id, 'indisponível (sem merge nem COL) — ignorada.');
    }
  });
  if (!versions.length) {
    if (sel) print('[ERRO] versão', sel, 'indisponível (sem merge nem COL).');
    print('[ERRO] nenhuma versão disponível para exportar.');
    if (done) done(0, 0);
    return;
  }

  var slug = 'bioma';
  var namePart = sel ? sel + '_' + slug : slug;
  var fileName = contract.PREFIX + '_' + namePart + '_' + contract.YEAR;
  print('MAPBIOMAS-CARBONO ·', contract.BIOME_NAME, 'Forest · run_forest ·',
    versions.map(function (v) { return v.id; }).join(', '));

  var D = T.buildLabelDicts(LEG);
  var geom = T.regionGeom(contract.BIOME_NAME);
  var scheduled = 0;
  try {
    Export.table.toDrive({
      collection: forestRows(contract, versions, paths, geom, D),
      description: 'WS_CARBONO_stats_forest_' + namePart + '_' + contract.YEAR,
      folder: contract.DRIVE_FOLDER,
      fileNamePrefix: fileName,
      fileFormat: 'CSV',
      selectors: forestColumns(versions)
    });
    scheduled++;
    print('[OK] forest ·', versions.length, 'versão(ões) numa tabela larga.');
  } catch (e) {
    print('[ERRO export]', fileName, String(e).slice(0, 200));
  }
  print('[FIM]', contract.BIOME_NAME, 'Forest ·', scheduled, 'export(s) agendado(s).');
  if (done) done(scheduled, versions.length);
};

/* ==========================================================================
 * GRASSLAND (separado por versão; principal + mensais)
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
var SEL_A = ['ecossistema', 'produto', 'versao', 'ano', 'Bioma', 'UF',
  'Unidade Federativa', 'classe']
  .concat(coberturaCols())
  .concat(['Área (ha)', 'Biomassa (t)', 'Estoque de carbono (t)']);

var SEL_MENSAL = ['ecossistema', 'produto', 'versao', 'ano', 'Bioma', 'UF',
  'Unidade Federativa', 'classe']
  .concat(coberturaCols())
  .concat(['período', 'Área (ha)']);

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
        ecossistema: 'campestre',
        produto: 'grassland', versao: vId, ano: contract.YEAR,
        Bioma: ctx.biomeName, UF: ctx.ufSigla, 'Unidade Federativa': ctx.ufNome,
        classe: ctx.cls,
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
        ecossistema: 'campestre',
        produto: 'grassland', versao: versionId, ano: contract.YEAR,
        Bioma: ctx.biomeName, UF: ctx.ufSigla, 'Unidade Federativa': ctx.ufNome,
        classe: ctx.cls,
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
 * principal (anual), biomassa mensal e ANPP mensal. Mantém-se SEPARADO por
 * versão (o join largo é feito offline no Colab). `done` ao final.
 */
exports.runGrassland = function (contract, versionId, done) {
  setupTerritory(contract);
  var sel = selVersion(versionId);
  if (sel && contract.VERSIONS.indexOf(sel) === -1) {
    print('[ERRO] versão desconhecida:', sel, '— disponíveis:',
      contract.VERSIONS.join(', '));
    if (done) done(0);
    return;
  }
  var versions = sel ? [sel] : contract.VERSIONS;
  var D = T.buildLabelDicts(LEG);
  var geom = T.regionGeom(contract.BIOME_NAME);
  var slug = 'bioma';
  var totalScheduled = 0;

  versions.forEach(function (vid) {
    var biomass = productOf(contract, vid, 'biomass');
    var carbon = productOf(contract, vid, 'carbon');
    var biomassM = productOf(contract, vid, 'biomass_mensal') ||
      productOf(contract, vid, 'biomassMonthly');
    var anppM = productOf(contract, vid, 'anpp_mensal') ||
      productOf(contract, vid, 'anppMonthly');

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
        print('[OK]', context, 'biomassa mensal · export IMEDIATO agendado.');
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
        print('[OK]', context, 'anpp mensal · export IMEDIATO agendado.');
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
};

/* ---- Exposição p/ QA/testes --------------------------------------------- */
exports.r1 = r1;
exports.emitCols = emitCols;
exports.colName = colName;
exports.refColumns = refColumns;
exports.forestColumns = forestColumns;
exports.SEL_A = SEL_A;
exports.SEL_MENSAL = SEL_MENSAL;
