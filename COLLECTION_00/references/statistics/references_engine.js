/******************************************************************************
 * MAPBIOMAS-CARBONO — Referências (validação) · references_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas dos mapas de REFERÊNCIA de biomassa/carbono por
 * classe LULC C11, para TODOS os biomas do Brasil (IBGE 2026). Requerido
 * pelos steps `7_references.js` e por scripts ad-hoc no Code Editor.
 *
 * Expõe:
 *   runAllReferences(opts?) → UM CSV por REF (20 arquivos), com as linhas de
 *   TODOS os biomas × UFs combinadas (colunas `Bioma`/`UF`/`Unidade Federativa`
 *   distinguem cada cruzamento; `territorio` mantém o rótulo do bioma):
 *                    stats_references_<ref_id>_2023.csv
 *
 * Exige de TODO REF uma linha de combinação (classe LULC × def_sec) para CADA
 * bioma × UF com dado, com as colunas:
 *   fonte, ref_id, territorio, Bioma, UF, Unidade Federativa, classe,
 *   cobertura (n0..n4), Desmatamento e vegetação secundária, ano_lulc, ano,
 *   Área (ha), <pool> (t C) | <pool> (t MS)  (pools de estoque; a unidade
 *                    em t C vs t MS sai no RÓTULO da coluna),
 *   Incerteza (t C)   (SÓ quando a ref tem banda de erro — saatchi_carbon_error)
 *
 * REGRA UNIDADE (comparador comum garantido por construção):
 *   - magnitude 'carbono'      → só <pool> (t C) (a banda JÁ é t C/ha);
 *   - magnitude 'biomassa'     → <pool> (t MS) (nativa, t/ha → t) E
 *                                <pool> (t C) (= nativa × CARBON_FRACTION) —
 *                                sempre existe ≥1 coluna comparável em C;
 *   - magnitude 'incerteza'    → a própria coluna é `Incerteza (t C)`.
 *
* Método (padrão comprovado — banda LULC crua como groupField):
 *   área_ha  = pixelArea()/10000, mascarado SÓ pelo LULC;
 *   pool     = banda (t/ha ou t C/ha) × pixelArea()/10000 × fator;
 *   def_sec  = banda classification_<ano> (unmask(0)); estratificação por
 *              colunas mod (área, pools) × (def_sec 0..7), Σ def_sec = total;
 *   reducer  = ee.Reducer.sum().repeat(9·(1+k))
 *              .group({groupField:9·(1+k), groupName:'classe'})
 *              .group({groupField:9·(1+k)+1, groupName:'territory'})  ← aninhado
 *  sobre o stack [área, pools, (área, pools)×mod0..7, classe,
 *              territory] — a banda de classificação é o LULC CRU (select+
 *              rename) na ÚLTIMA posição de valor; `territory` = paint dos
 *              biomas (CD_BIOMA) ×100 + paint das UFs (CD_UF). A redução é
 *              feita POR BIOMA (loop client-side sobre os 6 biomas): reduzir
 *              o Brasil inteiro numa ÚNICA chamada estourava o limite interno
 *              do batch e retornava groups NULO para refs de pavimento fino
 *              (30/110/250 m) — perda silenciosa de dados (bug 2026-09-17,
 *              fix M1).
 *   Export IMEDIATO (M2 — spike 2026-09-17): a expansão classe × def_sec roda
 *              SERVIDOR-SIDE (ee.List.map/flatten, `sum` como lista, dropdown
 *              de áreas ≤ 0, arredondamento 1 casa) — NENHUM evaluate no
 *              caminho de export. Cada `Export.table.toDrive` é chamado no
 *              parse, então TODAS as tasks aparecem de imediato no Task
 *              Manager e rodam em paralelo na fila batch.
 *   Zimbres (domínio Cerrado): só gera linhas no Cerrado automaticamente.
 *   Xu (multi_year) = 1 reduce POR ano (banda `b<i>`, i = ano-1999), linhas
 *             combinadas num ÚNICO CSV com a coluna `ano`.
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/references/statistics/0_contract_references.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;

/* ---- Território (banda `territory` = bioma×UF, espelho do fire) -----------
 * Banda derivada por DICIONÁRIO de códigos IBGE (fonte única, sem
 * casamento por string): biomas `CD_BIOMA` (1..6) e UFs `CD_UF` (11..53)
 * pintados via ee.Image.paint; encode = bioma×100 + uf. Nomes (Bioma/UF/
 * Unidade Federativa) vêm dos FCs (getInfo 1× no loadTerritories). O grupo
 * EXTERNO do reducer aninha por essa banda (semântica validada — spike
 * 2026-09-16); refs de domínio restrito (Zimbres) geram só as regiões do
 * mapa automaticamente. */
var _TERRITORY = { biomeLabels: {}, ufLabels: {} };
var TERRITORY_IMAGE = ee.Image()
  .paint(ee.FeatureCollection(C.BIOME_FC)
    .map(function (f) { return f.set('_b', ee.Number.parse(f.get('CD_BIOMA'))); }), '_b')
  .multiply(100)
  .add(ee.Image()
    .paint(ee.FeatureCollection(C.UF_FC)
      .map(function (f) { return f.set('_u', ee.Number.parse(f.get('CD_UF'))); }), '_u'))
  .rename('territory').int();

/** Carrega 1× os rótulos bioma/UF dos FCs (dicionário por código). */
function loadTerritories(cb) {
  ee.FeatureCollection(C.BIOME_FC).getInfo(function (bf) {
    ee.FeatureCollection(C.UF_FC).getInfo(function (ufs) {
      (bf.features || []).forEach(function (f) {
        _TERRITORY.biomeLabels[parseInt(f.properties['CD_BIOMA'], 10)] =
          f.properties[C.BIOME_PROP] || f.properties['NM_BIOMA'];
      });
      (ufs.features || []).forEach(function (f) {
        _TERRITORY.ufLabels[parseInt(f.properties['CD_UF'], 10)] = {
          sigla: f.properties['SIGLA_UF'] || '',
          nome: f.properties[C.UF_NAME_PROP] || '' };
      });
      cb();
    }, function () {
      print('[ERRO] não foi possível carregar UF_FC:', C.UF_FC); cb();
    });
  }, function () {
    print('[ERRO] não foi possível carregar BIOME_FC:', C.BIOME_FC); cb();
  });
}

/** Verifica se um asset IMAGE existe (por pasta de asset). */
function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) { return false; }
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
  return ee.Image.cat(base.concat(mods).concat([lulc, TERRITORY_IMAGE]));
}

function reduceFor(r, bandName, geom) {
  var base = 1 + emitCols(r).length;
  var n = base * (1 + LEG.DEFSEC_MODS.length);
  return refStack(r, bandName).reduceRegion({
    reducer: ee.Reducer.sum().repeat(n)
      .group({ groupField: n, groupName: 'classe' })
      .group({ groupField: n + 1, groupName: 'territory' }),
    geometry: geom, scale: r.scale, maxPixels: 1e13, tileScale: 2
  }).get('groups');
}

/** Banda do ano Y para ref multi_year (Xu): `b<i>` com i = Y - start + 1. */
function bandForYear(r, y) {
  return r.multi_year ? 'b' + (y - r.multi_year.start + 1) : null;
}

/** Colunas dos CSVs das referências (export único, só combinações,
 * sem .geo/system:index). Nomes prontos p/ gráfico. A coluna de incerteza
 * existe APENAS quando o próprio ref é uma banda de erro (magnitude
 * 'incerteza' → emitCols já a inclui pelo rótulo `Incerteza (t C)`). */
function statsColumns(refInfo) {
  var cols = ['fonte', 'ref_id', 'territorio', 'Bioma', 'UF',
    'Unidade Federativa', 'classe',
    'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
    'cobertura (n4)', 'Desmatamento e vegetação secundária',
    'ano_lulc', 'ano', 'Área (ha)'];
  emitCols(refInfo).forEach(function (c) { cols.push(colName(c)); });
  return cols;
}

/** Geometria de um bioma (recorte por região para a redução por bioma). */
function regionGeom(biome) {
  return ee.FeatureCollection(C.BIOME_FC)
    .filter(ee.Filter.eq(C.BIOME_PROP, biome.nome))
    .first().geometry();
}

/* --------------------------------------------------------------------------
 * M2 — Montagem SERVIDOR-SIDE das linhas (classes × def_sec), sem evaluate.
 * Os rótulos (cobertura n0..n4, def_sec, Bioma/UF) são ee.Dictionary com a
 * fonte única das legendas (LEG) e dos FCs IBGE; as lambdas capturam esses
 * objetos como CONSTANTES na serialização (funciona no Code Editor legado).
 * Layout do `sum` (validado por spike 2026-09-17): LISTA por grupo; cada
 * combinação def_sec j ocupa  base elementos a partir de off = base + j*base;
 * s[off] = área (ha), s[off+1+i] = pool i. Combinações com área ≤ 0 são
 * descartadas. Arredondamento 1 casa = paridade com o buildRows legado.
 * ------------------------------------------------------------------------ */

/** Arredondamento servidor-side (1 casa decimal — espelho do r() legado). */
function r1(n) { return ee.Number(n).multiply(10).round().divide(10); }

/** Dicionário client-side (código → {n0..n4}) montado das legendas oficiais
 * (fonte única em LEG.infoMap()). */
var LEG_INFO_PLAIN = LEG.infoMap();

/** ee.Dictionary de rótulos (constantes p/ as lambdas do rowsFC). */
function buildLabelDicts() {
  var info = {}, biome = {}, sigla = {}, nome = {}, defsec = {};
  Object.keys(LEG_INFO_PLAIN).forEach(function (k) {
    info[k] = LEG_INFO_PLAIN[k];
  });
  Object.keys(_TERRITORY.biomeLabels).forEach(function (k) {
    biome[k] = _TERRITORY.biomeLabels[k];
  });
  Object.keys(_TERRITORY.ufLabels).forEach(function (k) {
    sigla[k] = _TERRITORY.ufLabels[k].sigla;
    nome[k] = _TERRITORY.ufLabels[k].nome;
  });
  Object.keys(LEG.DEF_SEC_VEG_LEGEND).forEach(function (k) {
    defsec[k] = LEG.DEF_SEC_VEG_LEGEND[k];
  });
  return {
    info: ee.Dictionary(info),
    biome: ee.Dictionary(biome),
    sigla: ee.Dictionary(sigla),
    nome: ee.Dictionary(nome),
    defsec: ee.Dictionary(defsec)
  };
}

/**
 * Monta servidor-side a FeatureCollection de linhas (classe × def_sec) de um
 * ref × bioma × ano, dentro do grafo do EE (export vira task IMEDIATA, sem
 * evaluate). `D` = dicionários de buildLabelDicts(); espelho byte a byte do
 * buildRows legado.
 */
function rowsFC(refInfo, bandName, ano, geom, D) {
  var cols = emitCols(refInfo);
  var base = 1 + cols.length;
  var poolNames = cols.map(function (c) { return colName(c); });
  var nBands = cols.length;
  var source = refInfo.fonte;
  var rid = refInfo.id;
  var anoVal = (ano === null || ano === undefined) ? ''
    : (typeof ano === 'number') ? ee.Number(ano) : ano;
  var groups = ee.List(reduceFor(refInfo, bandName, geom));

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
        var off = base + j * base;
        var am = ee.Number(s.get(off));
        var props = {
          fonte: source, ref_id: rid,
          territorio: territorio, Bioma: biomeName, UF: ufSigla,
          'Unidade Federativa': ufNome,
          classe: cls,
          'cobertura (n0)': info.get('n0'),
          'cobertura (n1)': info.get('n1'),
          'cobertura (n2)': info.get('n2'),
          'cobertura (n3)': info.get('n3'),
          'cobertura (n4)': info.get('n4'),
          'Desmatamento e vegetação secundária':
            D.defsec.get(ee.Number(j).format()),
          ano_lulc: YEAR, ano: anoVal,
          'Área (ha)': r1(am)
        };
        for (var i = 0; i < nBands; i++) {
          props[poolNames[i]] = r1(ee.Number(s.get(off + 1 + i)));
        }
        return ee.List(ee.Algorithms.If(am.gt(0), [ee.Feature(null, props)], []));
      }
      return ee.List(LEG.DEFSEC_MODS.map(one));
    }
    return ee.List(ee.List(td.get('groups')).map(expandClass));
  }

  return ee.FeatureCollection(ee.List(groups.map(expandTerritory)).flatten());
}

/**
 * Gera as estatísticas de TODOS os refs (ou um subconjunto), combinando os
 * biomas × UFs num ÚNICO CSV por ref (colunas `Bioma`/`UF`/`Unidade
 * Federativa`; `territorio` = rótulo do bioma).
 * Uso: engine.runAllReferences() |
 *      runAllReferences({ ref_ids: ['zimbres_agb'] }) |
 *      runAllReferences({ biomes: ['cerrado'] })
 * → 1 CSV por ref (20 arquivos no modo completo):
 *   stats_references_<ref_id>_2023.csv
 */
exports.runAllReferences = function (opts) {
  opts = opts || {};
  var refs = C.REFERENCES.filter(function (r) {
    return !opts.ref_ids || opts.ref_ids.indexOf(r.id) > -1;
  });
  var selBiomes = C.BIOMES.filter(function (b) {
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

  loadTerritories(function () {
    var D = buildLabelDicts();
    refs.forEach(function (r) {
      print('MAPBIOMAS-CARBONO · references · 7_references ·', r.id);
      if (!assetExists(r.asset)) {
        print('[ERRO] asset não encontrado:', r.asset);
        jobDone(false); return;
      }

      var years = r.multi_year
        ? range(r.multi_year.start, r.multi_year.end) : [null];
      var fcs = [];
      selBiomes.forEach(function (b) {
        var geom = regionGeom(b);
        years.forEach(function (y) {
          var bandName = r.multi_year ? bandForYear(r, y) : r.pools[0].band;
          var ano = r.multi_year ? y :
            (isNumericEpoch(r.epoch) ? r.epoch : null);
          fcs.push(rowsFC(r, bandName, ano, geom, D));
        });
      });

      var fc = fcs[0];
      for (var i = 1; i < fcs.length; i++) fc = fc.merge(fcs[i]);
      var fileName = C.PREFIX + '_' + r.id + '_' + YEAR;
      try {
        Export.table.toDrive({
          collection: fc,
          description: 'WS_CARBONO_stats_references_' + r.id + '_' + YEAR,
          folder: C.DRIVE_FOLDER,
          fileNamePrefix: fileName,
          fileFormat: 'CSV',
          selectors: statsColumns(r)
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