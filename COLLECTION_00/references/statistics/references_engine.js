/******************************************************************************
 * MAPBIOMAS-CARBONO — Referências (validação) · references_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas dos mapas de REFERÊNCIA de biomassa/carbono por
 * classe LULC C11, para TODOS os biomas do Brasil (IBGE 2026). Requerido
 * pelos steps `7_references.js` e por scripts ad-hoc no Code Editor.
 *
 * Expõe:
 *   runAllReferences(opts?) → UM CSV por REF (19 arquivos), com as linhas de
 *   TODOS os biomas combinadas (coluna `territorio` distingue cada um):
 *                    stats_references_<ref_id>_2023.csv
 *
 * Exige de TODO REF uma linha de combinação (classe LULC × def_sec) para CADA
 * bioma, com as colunas:
 *   fonte, ref_id, territorio, classe, cobertura (n0..n4),
 *   Desmatamento e vegetação secundária, ano_lulc, ano,
 *   Área (ha), <pool> (t C) | <pool> (t MS)  (pools de estoque; a unidade
 *                    em t C vs t MS sai no RÓTULO da coluna),
 *   Incerteza (t C)   (erro da ref, quando existe — cc saatchi_carbon_error)
 *
 * REGRA UNIDADE (comparador comum garantido por construção):
 *   - magnitude 'carbono'      → só <pool> (t C) (a banda JÁ é t C/ha);
 *   - magnitude 'biomassa'     → <pool> (t MS) (nativa, t/ha → t) E
 *                                <pool> (t C) (= nativa × CARBON_FRACTION) —
 *                                sempre existe ≥1 coluna comparável em C;
 *   - magnitude 'incerteza'    → a própria coluna é `Incerteza (t C)`.
 *
 * Método (padrão comprovado — SEM banda derivada como groupField):
 *   área_ha  = pixelArea()/10000, mascarado SÓ pelo LULC;
 *   pool     = banda (t/ha ou t C/ha) × pixelArea()/10000 × fator;
 *   def_sec  = banda classification_<ano> (unmask(0)); estratificação por
 *              colunas mod (área, pools) × (def_sec 0..7), Σ def_sec = total;
 *   reducer  = ee.Reducer.sum().repeat(9·(1+k)).group({groupField:9·(1+k)})
 *              sobre o stack [área, pools, (área, pools)×mod0..7, classe] —
 *              a banda de classificação é o LULC CRU (select+rename) na
 *              ÚLTIMA posição; cada grupo = CLASSE; as combinações
 *              classe × def_sec são expandidas no buildRows client-side
 *              (combinações com área = 0 são descartadas).
 *   Xu (multi_year) = 1 reduce POR ano (banda `b<i>`, i = ano-1999), linhas
 *             combinadas num ÚNICO CSV com a coluna `ano`.
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/references/statistics/0_contract_references.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;

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

/** Normaliza cada grupo para {code, sums:[...]} (lista OU chaves sum/sum_1…). */
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
    return { code: g['classe'], sums: s };
  });
}

/** Rótulo gráfico de um stem/pool (agb → 'AGB', total → 'Total', …). */
var POOL_LABEL = {
  agb: 'AGB', agc: 'AGC', bgb: 'BGB', bgc: 'BGC', live: 'Live',
  total: 'Total', cdw: 'CDW', litter: 'Litter', incerteza: 'Incerteza'
};

/**
 * Colunas de VALOR que o ref emite (cada uma vira um total em t no CSV).
 * pool = {band, col}; stem = nome do pool; suffix = marcador de unidade
 * ('tC' carbono | 'tB' biomassa). Para 'biomassa' emite as DUAS
 * (<stem>_tB nativa e <stem>_tC convertida); p/ 'carbono' só <stem>_tC;
 * p/ 'incerteza' a coluna é `Incerteza (t C)`.
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

/**
 * Stack [área, pools, (área, pools)×mod0..7, classe]:
 *   - área/pools base como hoje (máscaras lulc / ref×lulc);
 *   - colunas mod = mesma banda mascarada por def_sec.eq(m) (Σ mods = total);
 *   - banda FINAL = LULC cru (select+rename), integer — grupo do reducer.
 * A derivada (banda `combo`) NÃO é usada como groupField (cliente legado do
 * Code Editor retorna groups=null p/ banda derivada).
 */
function refStack(r, bandName) {
  var cols = emitCols(r);
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('classe');
  var area = ee.Image.pixelArea().divide(10000);
  var areaHa = area.rename('area_ha').updateMask(lulc.mask());
  var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR)).unmask(0);

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
  return ee.Image.cat(base.concat(mods).concat([lulc]));
}

function reduceFor(r, bandName, geom) {
  var base = 1 + emitCols(r).length;
  var n = base * (1 + LEG.DEFSEC_MODS.length);
  return refStack(r, bandName).reduceRegion({
    reducer: ee.Reducer.sum().repeat(n)
      .group({ groupField: n, groupName: 'classe' }),
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

/** Expande os grupos (CLASSE) em linhas de combinação (classe × def_sec),
 * usando as colunas mod (Σ def_sec = total) e descartando combinações com
 * área = 0 (paridade com o formato combo). */
function buildRows(refInfo, territorio, ano, groups) {
  var cols = emitCols(refInfo);
  var base = 1 + cols.length;
  var rows = [];
  groups = normalize(groupsOrEmpty(groups, refInfo.id + ' · ' + territorio +
    (refInfo.multi_year ? ' · ano ' + ano : '') +
    ' (buildRows — reduzindo a linhas por combinação classe × def_sec)'));
  if (!groups.length) { print('[AVISO]', refInfo.id, territorio,
    (refInfo.multi_year ? 'ano ' + ano : ''), '· 0 linhas geradas'); return rows; }

  groups.forEach(function (g) {
    var s = g.sums;
    var info = LEG.info(g.code);
    LEG.DEFSEC_MODS.forEach(function (m, j) {
      var off = base + j * base;
      var areaMod = s[off];
      if (areaMod <= 0) return;
      var rowData = row(refInfo, territorio, ano, {
        classe: g.code,
        'cobertura (n0)': info.n0,
        'cobertura (n1)': info.n1,
        'cobertura (n2)': info.n2,
        'cobertura (n3)': info.n3,
        'cobertura (n4)': info.n4,
        'Desmatamento e vegetação secundária': LEG.defsecInfo(m).label,
        'Área (ha)': r(areaMod)
      });
      cols.forEach(function (c, i) {
        rowData[colName(c)] = r(s[off + 1 + i]);
      });
      if (refInfo.magnitude !== 'incerteza') {
        rowData['Incerteza (t C)'] = 0;
      }
      rows.push(rowData);
    });
  });
  return rows;
}

/** Colunas dos CSVs das referências (export único, só combinações,
 * sem .geo/system:index). Nomes prontos p/ gráfico. */
function statsColumns(refInfo) {
  var cols = ['fonte', 'ref_id', 'territorio', 'classe',
    'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
    'cobertura (n4)', 'Desmatamento e vegetação secundária',
    'ano_lulc', 'ano', 'Área (ha)'];
  emitCols(refInfo).forEach(function (c) { cols.push(colName(c)); });
  if (refInfo.magnitude !== 'incerteza') cols.push('Incerteza (t C)');
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
function regionTerritorio(biome) { return biome.nome + ' (bioma)'; }
function regionGeom(biome) {
  return ee.FeatureCollection(C.BIOME_FC)
    .filter(ee.Filter.eq(C.BIOME_PROP, biome.nome))
    .first().geometry();
}

/**
 * Gera as estatísticas de TODOS os refs (ou um subconjunto), combinando os
 * seis biomas num ÚNICO CSV por ref (linhas distinguidas por `territorio`).
 * Uso: engine.runAllReferences() |
 *      runAllReferences({ ref_ids: ['qcnr_total'], biomes: ['pantanal'] })
 * → 1 CSV por ref (19 arquivos no modo completo):
 *   stats_references_<ref_id>_2023.csv
 */
exports.runAllReferences = function (opts) {
  opts = opts || {};
  var refs = C.REFERENCES.filter(function (r) {
    return !opts.ref_ids || opts.ref_ids.indexOf(r.id) > -1;
  });
  var biomes = C.BIOMES.filter(function (b) {
    return !opts.biomes || opts.biomes.indexOf(b.slug) > -1;
  });

  var tot = refs.length;
  var finished = 0;
  function jobDone() {
    finished++;
    if (finished === tot) {
      print('[FIM] references ·', finished, '/', tot, 'CSVs agendados.');
    }
  }

  refs.forEach(function (r) {
    print('MAPBIOMAS-CARBONO · references · 7_references ·', r.id);
    if (!assetExists(r.asset)) {
      print('[ERRO] asset não encontrado:', r.asset);
      jobDone(); return;
    }

    var years = r.multi_year
      ? range(r.multi_year.start, r.multi_year.end) : [null];
    var allRows = [];
    var biomeDone = 0;
    biomes.forEach(function (b) {
      var territory = regionTerritorio(b);
      var geom = regionGeom(b);
      var yearDone = 0;
      years.forEach(function (y) {
        var bandName = r.multi_year ? bandForYear(r, y) :
          r.pools[0].band;
        var ano = r.multi_year ? y : (isNumericEpoch(r.epoch) ? r.epoch : null);
        reduceFor(r, bandName, geom).evaluate(function (groups) {
          allRows.push.apply(allRows,
            buildRows(r, territory, ano, groups));
          yearDone++;
          if (yearDone === years.length) {
            biomeDone++;
            if (biomeDone === biomes.length) {
              var fileName = C.PREFIX + '_' + r.id + '_' + YEAR;
              exportCsv(allRows, fileName,
                'WS_CARBONO_stats_references_' + r.id + '_' + YEAR,
                statsColumns(r));
              print('[OK]', r.id, '·', allRows.length, 'linhas ·',
                'export agendado (' + biomes.length + ' biomas)');
              jobDone();
            }
          }
        }, function (err) {
          print('[ERRO]', r.id, territory,
            (r.multi_year ? 'ano ' + y + ' ' : ''), String(err).slice(0, 200));
          yearDone++;
          if (yearDone === years.length) {
            biomeDone++;
            if (biomeDone === biomes.length) jobDone();
          }
        });
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