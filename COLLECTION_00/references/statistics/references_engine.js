/******************************************************************************
 * MAPBIOMAS-CARBONO — Referências (validação) · references_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas dos mapas de REFERÊNCIA de biomassa/carbono por
 * classe LULC C11, para TODOS os biomas do Brasil (IBGE 2026). Requerido
 * pelos steps `7_references.js` e por scripts ad-hoc no Code Editor.
 *
 * Expõe:
 *   runAll(opts?) → UM CSV por REF × BIOMA (19 refs × 6 biomas =
 *                   114 arquivos em DRIVE_FOLDER):
 *                    stats_references_<ref_id>_<slug_bioma>_2023.csv
 *
 * Cada CSV tem UMA linha por classe LULC (nível n0), com as colunas:
 *   fonte, ref_id, territorio, classe, n0, n1, n2, n3, n4, natureza, marcador,
 *   ano_lulc, ano, area_ha,
 *   <pool>_tC | <pool>_tB   (pools de estoque; NO SUFIXO vai o marcador da
 *                            unidade: tC = tonelada de CARBONO, tB = de BIOMASSA),
 *   incerteza_tC,           (erro da ref, quando existe — cc saatchi_carbon_error)
 *   area_mod0..7_ha, <pool>_mod0..7_tC|_tB  (estratificação def_sec).
 *
 * REGRA UNIDADE (comparador comum garantido por construção):
 *   - magnitude 'carbono'      → só <pool>_tC (a banda JÁ é t C/ha);
 *   - magnitude 'biomassa'     → <pool>_tB (nativa, t/ha → t) E <pool>_tC
 *                                (= nativa × CARBON_FRACTION) — sempre existe
 *                                ≥1 coluna comparável em C;
 *   - magnitude 'incerteza'    → a própria coluna é `incerteza_tC`.
 *
 * Método (molde forest/stats_engine.js):
 *   área_ha  = pixelArea()/10000, mascarado SÓ pelo LULC;
 *   pool     = banda (t/ha ou t C/ha) × pixelArea()/10000 × fator;
 *   def_sec  = module_lulc_legends.js :: DEF_SEC_ASSET, bandas
 *              classification_<ano> — `unmask(0)` ⇒ Σ área_mod0..7 = área_ha;
 *   reducer  = ee.Reducer.sum().repeat(N).group({groupField:N}) — a banda de
 *              classificação fica na ÚLTIMA posição do stack;
 *   Xu (multi_year) = 1 reduce POR ano (banda `b<i>`, i = ano-1999), linhas
 *              combinadas num ÚNICO CSV com a coluna `ano`.
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/references/statistics/0_contract_references.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var MODS = LEG.DEFSEC_MODS; // [0..7]

/** Verifica se um asset IMAGE existe (por pasta de asset). */
function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) { return false; }
}

/** Valida o array de grupos retornado por reduceRegion().get('groups'). */
function groupsOrEmpty(groups, ctx) {
  if (!groups || typeof groups.forEach !== 'function') {
    print('[AVISO] sem dados (provável ref ausente ou sem interseção):', ctx);
    return [];
  }
  return groups;
}

/** Normaliza cada grupo para {classe, sums:[...]} (lista OU chaves sum/sum_1…). */
function normalize(groups) {
  return (groups || []).map(function (g) {
    var s;
    if (g['sum'] !== undefined && typeof g['sum'].length === 'number') {
      s = g['sum'];
    } else {
      s = [];
      var i = 0;
      while (g['sum' + (i === 0 ? '' : '_' + i)] !== undefined) {
        s.push(g['sum' + (i === 0 ? '' : '_' + i)]);
        i++;
      }
    }
    return { classe: g['classe'], sums: s };
  });
}

/**
 * Colunas de VALOR que o ref emite (cada uma vira um total em t no CSV).
 * pool = {band, col}; stem = nome do pool; suffix = marcador de unidade
 * ('tC' carbono | 'tB' biomassa). Para 'biomassa' emite as DUAS
 * (<stem>_tB nativa e <stem>_tC convertida); p/ 'carbono' só <stem>_tC;
 * p/ 'incerteza' a coluna é `incerteza_tC`.
 */
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

/** Nome da coluna de valor de uma emissão (<stem>_t<C|B>). */
function colName(c) { return c.stem + '_' + c.suffix; }
/** Nome da coluna def_sec de uma emissão (<stem>_mod<m>_t<C|B>). */
function colModName(c, m) { return c.stem + '_mod' + m + '_' + c.suffix; }

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

/** Número de bandas de valor do stack (área + pools + 8×(área_mod+pools_mod)). */
function nValue(k) { return 1 + k + MODS.length * (1 + k); }

/**
 * Stack [area_ha, <pools>, (area_modX, <pools>_modX)×8, classe]:
 *   - área sempre informativa (máscara só no LULC);
 *   - pools somam nos pixels válidos (ref × LULC);
 *   - def_sec.unmask(0) ⇒ área_mod fecha com a área da classe.
 */
function refStack(r, bandName) {
  var cols = emitCols(r);
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
  var area = ee.Image.pixelArea().divide(10000);
  var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR)).unmask(0);

  // Imagens nativas por coluna (resolvidas uma única vez por banda).
  var raw = cols.map(function (c) {
    return { col: c, img: valueImage(r, c.band) };
  });

  var valBands = [];
  raw.forEach(function (x) {
    var v = x.img.multiply(area).multiply(x.col.mult)
      .unmask(0).updateMask(x.img.mask().and(lulc.mask()));
    valBands.push(v.rename(colName(x.col)));
  });

  var modBands = [];
  MODS.forEach(function (m) {
    var cond = defsec.eq(m);
    modBands.push(
      area.rename('area_mod' + m).updateMask(lulc.mask()).updateMask(cond));
    raw.forEach(function (x) {
      modBands.push(x.img.multiply(area).multiply(x.col.mult)
        .unmask(0).updateMask(x.img.mask().and(lulc.mask()))
        .rename(colModName(x.col, m)).updateMask(cond));
    });
  });

  return ee.Image.cat(
    [area.rename('area_ha').updateMask(lulc.mask())]
      .concat(valBands).concat(modBands).concat([lulc]));
}

function reduceFor(r, bandName, geom) {
  var stack = refStack(r, bandName);
  var n = nValue(emitCols(r).length);
  return stack.reduceRegion({
    reducer: ee.Reducer.sum().repeat(n).group({
      groupField: n, groupName: 'classe' }),
    geometry: geom, scale: r.scale, maxPixels: 1e13, tileScale: 2
  }).get('groups');
}

function r(n) { return Math.round(n * 10) / 10; }

function row(refInfo, territorio, ano, extra) {
  var base = { fonte: refInfo.fonte, ref_id: refInfo.id,
    territorio: territorio, ano_lulc: YEAR, ano: ano };
  for (var k in extra) { if (extra.hasOwnProperty(k)) base[k] = extra[k]; }
  return base;
}

/** Banda do ano Y para ref multi_year (Xu): `b<i>` com i = Y - start + 1. */
function bandForYear(r, y) {
  return r.multi_year ? 'b' + (y - r.multi_year.start + 1) : null;
}

/** Expande os grupos decimais em linhas n0 (uma por classe LULC presente). */
function buildRows(refInfo, territorio, ano, groups) {
  var rows = [];
  groups = normalize(groupsOrEmpty(groups, refInfo.id + ' · ' + territorio +
    (refInfo.multi_year ? ' · ano ' + ano : '') +
    ' (buildRows — reduzindo a linhas n0 por classe)'));
  if (!groups.length) { print('[AVISO]', refInfo.id, territorio,
    (refInfo.multi_year ? 'ano ' + ano : ''), '· 0 linhas geradas'); return rows; }

  var cols = emitCols(refInfo);
  var k = cols.length;
  groups.forEach(function (g) {
    var s = g.sums;
    var info = LEG.info(g['classe']);
    var rowData = row(refInfo, territorio, ano, {
      classe: g['classe'], n0: info.n0, n1: info.n1, n2: info.n2,
      n3: LEG.n3Of(g['classe']), n4: LEG.n4Of(g['classe']),
      natureza: info.natureza, marcador: info.marcador,
      area_ha: r(s[0])
    });
    cols.forEach(function (c, j) {
      rowData[colName(c)] = r(s[1 + j]);
    });
    rowData['incerteza_tC'] = refInfo.magnitude === 'incerteza'
      ? r(s[1]) : 0;
    MODS.forEach(function (m, mi) {
      var offset = 1 + k + mi * (1 + k);
      rowData['area_mod' + m + '_ha'] = r(s[offset]);
      cols.forEach(function (c, j) {
        rowData[colModName(c, m)] = r(s[offset + 1 + j]);
      });
    });
    rows.push(rowData);
  });
  return rows;
}

/** Colunas dos CSVs das referências (export único, só n0, sem .geo/system:index). */
function statsColumns(refInfo) {
  var cols = ['fonte', 'ref_id', 'territorio', 'classe', 'n0', 'n1', 'n2',
    'n3', 'n4', 'natureza', 'marcador', 'ano_lulc', 'ano', 'area_ha'];
  emitCols(refInfo).forEach(function (c) { cols.push(colName(c)); });
  cols.push('incerteza_tC');
  MODS.forEach(function (m) {
    cols.push('area_mod' + m + '_ha');
    emitCols(refInfo).forEach(function (c) { cols.push(colModName(c, m)); });
  });
  return cols;
}

/** Exporta UMA tabela (selectors excluem .geometry/system:index). */
function exportCsv(rows, fileName, description, selectors) {
  if (!rows.length) return;
  Export.table.toDrive({
    collection: ee.FeatureCollection(rows.map(function (r2) {
      return ee.Feature(null, r2); })),
    description: description,
    folder: C.DRIVE_FOLDER,
    fileNamePrefix: fileName,
    fileFormat: 'CSV',
    selectors: selectors
  });
}

/** Região (bioma) do contrato. */
function regionSlug(biome) { return biome.slug; }
function regionTerritorio(biome) { return biome.nome + ' (bioma)'; }
function regionGeom(biome) {
  return ee.FeatureCollection(C.BIOME_FC)
    .filter(ee.Filter.eq(C.BIOME_PROP, biome.nome))
    .first().geometry();
}

/**
 * Gera as estatísticas de TODOS os refs × biomas (ou um subconjunto).
 * Uso: engine.runAll() | runAll({ ref_ids: ['qcnr_total'], biomes: ['pantanal'] })
 * → 1 CSV por ref × bioma (114 arquivos no modo completo).
 */
exports.runAll = function (opts) {
  opts = opts || {};
  var refs = C.REFERENCES.filter(function (r) {
    return !opts.ref_ids || opts.ref_ids.indexOf(r.id) > -1;
  });
  var biomes = C.BIOMES.filter(function (b) {
    return !opts.biomes || opts.biomes.indexOf(b.slug) > -1;
  });

  var jobs = [];
  refs.forEach(function (r) {
    biomes.forEach(function (b) { jobs.push({ r: r, b: b }); });
  });

  var tot = jobs.length;
  var finished = 0;
  function jobDone() {
    finished++;
    if (finished === tot) {
      print('[FIM] references ·', finished, '/', tot, 'CSVs agendados.');
    }
  }

  jobs.forEach(function (job) {
    var r = job.r, territory = regionTerritorio(job.b);
    print('MAPBIOMAS-CARBONO · references · 7_references ·', r.id, '·',
      territory);
    if (!assetExists(r.asset)) {
      print('[ERRO] asset não encontrado:', r.asset);
      jobDone(); return;
    }

    var years = r.multi_year
      ? range(r.multi_year.start, r.multi_year.end) : [null];
    var yearDone = 0;
    var allRows = [];
    years.forEach(function (y) {
      var bandName = r.multi_year ? bandForYear(r, y) :
        r.pools[0].band;
      var ano = r.multi_year ? y : (isNumericEpoch(r.epoch) ? r.epoch : null);
      reduceFor(r, bandName, regionGeom(job.b)).evaluate(function (groups) {
        allRows.push.apply(allRows,
          buildRows(r, territory, ano, groups));
        yearDone++;
        if (yearDone === years.length) {
          var fileName = C.PREFIX + '_' + r.id + '_' +
            regionSlug(job.b) + '_' + YEAR;
          exportCsv(allRows, fileName,
            'WS_CARBONO_stats_references_' + r.id + '_' +
              regionSlug(job.b) + '_' + YEAR, statsColumns(r));
          print('[OK]', r.id, territory, '·', allRows.length, 'linhas ·',
            (allRows.length ? 'export agendado' : 'sem dados'));
          jobDone();
        }
      }, function (err) {
        print('[ERRO]', r.id, territory,
          (r.multi_year ? 'ano ' + y + ' ' : ''), String(err).slice(0, 200));
        yearDone++;
        if (yearDone === years.length) jobDone();
      });
    });
  });
}

function range(start, end) {
  var out = [];
  for (var i = start; i <= end; i++) out.push(i);
  return out;
}

function isNumericEpoch(e) {
  return e !== null && e !== undefined && /^\d{4}$/.test(String(e));
}