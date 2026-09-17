/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · stats_engine (módulo require)
 * ---------------------------------------------------------------------------
 * Motor das estatísticas de AGC (agbd, t/ha) por classe LULC C11 para as
 * versões V03–V08 (2023). Requerido pelos steps `7_statistics.js` de cada
 * versão e por scripts ad-hoc no Code Editor.
 *
 * Expõe:
 *   runForVersion(versionId)  → CSV único `stats_forest_<v>_<territorio>_2023.csv`
 *                               com UMA linha por combinação (classe LULC × def_sec),
 *                               colunas em formato gráfico pronto para gráficos.
 *
 * Estratificação por desmatamento/vegetação secundária (def_sec, C11):
 *   banda classification_<ano> (unmask(0)); na redução o def_sec entra como
 *   COLUNAS MOD (área_modX/estoque_modX, X = 0..7) — Σ def_sec = total; as
 *   combinações (classe × def_sec) são expandidas SERVIDOR-SIDE (rowsFC —
 *   ee.List.map/flatten, export agendado IMEDIATO no parse, sem evaluate;
 *   M2 spike 2026-09-17). O groupField é a banda LULC CRUA (padrão
 *   comprovado — banda derivada no group retorna groups=null no Code Editor).
 *
 * Método:
 *   área_ha  = pixelArea()/10000, mascarado SÓ pelo LULC;
 *   estoque  = banda (t/ha) × pixelArea()/10000  → TOTAL em t;
 *   w2       = (std_ensemble × pixelArea)² — apenas nos pixels preditos;
 *   reducer  = ee.Reducer.sum().repeat(19).group({groupField:19}) sobre o
 *              stack [área, estoque, w2, (área_modX, estoque_modX)×8, n0]
 *              — a banda de classificação (LULC cru) na ÚLTIMA posição;
 *   incerteza ± = √(Σ w2) — v07/v08; demais: 0.
 * Colunas CSV: version, ano, territorio, Bioma, UF, Unidade Federativa,
 *   classe, cobertura (n0..n4), Desmatamento e vegetação secundária,
 *   Área (ha), Estoque de carbono (t) [, Incerteza do estoque (t)].
 *   Incerteza: coluna emitida APENAS quando a versão tem banda de incerteza
 *   (v07/v08 — stdBand); v03–v06 ficam sem a coluna.
 * Território: banda `territory` = bioma(GEOCODE)×100+uf(CD_UF), agrupada
 *   por um único reduce. Bioma/UF/Unidade Federativa decodificados via
 *   ee.Dictionary por código IBGE (sem string-match, sem evaluate).
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/0_contract_stats.js');
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/module_lulc_legends.js');

var YEAR = C.YEAR;
var SCALE = C.SCALE;
var BASE = 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST';
var N_VALUE = 3 + 2 * LEG.DEFSEC_MODS.length; // área, estoque, w2 + (área_mod, estoque_mod)×8
var REDUCER = ee.Reducer.sum().repeat(N_VALUE)
  .group({ groupField: N_VALUE, groupName: 'classe' })
  .group({ groupField: N_VALUE + 1, groupName: 'territory' });

/* ---- Território (banda `territory` = bioma×UF, igual references/fire) ----
 * paintBiomes pinta os 6 biomas IBGE (GEOCODE); dentro da geometria do
 * Pantanal o valor é constante = Pantanal. A banda de UF só é pintada quando
 * UF_LIST != [] (código uf = 0 → região pura do bioma, CSV idêntico ao antigo);
 * no recorte do Pantanal só MS/MT aparecem no UF_LIST. encode = bioma×100+uf.
 * Rótulos Bioma/UF/Unidade Federativa decodificados por dicionário (getInfo 1×);
 * `territorio` mantém o rótulo `Pantanal (bioma)` (D2) — a diferenciação por UF
 * fica nas colunas `UF`/`Unidade Federativa`. */
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

/** Decodificação de território SÓ no servidor (M2): labels por ee.Dictionary. */

/**
 * Verifica se um asset IMAGE existe (por pasta de asset).
 * listAssets pode lançar erro quando a pasta não existe — try/catch torna a
 * consulta segura para QA/stats.
 */
function assetExists(imageId) {
  var parts = imageId.split('/');
  parts.pop();
  try {
    var r = ee.data.listAssets(parts.join('/'));
    return (r.assets || []).some(function (a) { return a.id === imageId; });
  } catch (e) {
    return false;
  }
}

/**
 * Resolve o mosaico de UMA versão, com fallback automático:
 *   1) merge anual exportado (agc_pred_v0X_merged_<ano>);
 *   2) senão, mosaico da ImageCollection PREDICTIONS/COL da própria versão.
 * Evita o erro "Cannot read property 'forEach' of undefined" quando o merge
 * não existe no Earth Engine.
 */
function safeMosaic(v) {
  if (assetExists(v.mosaic)) return ee.Image(v.mosaic);
  var colPath = v.mosaic.replace(/\/[^/]+$/, '/COL');
  print('[AVISO] merge não encontrado — usando COL mosaic de', v.id, '→', colPath);
  return ee.ImageCollection(colPath)
    .filter(ee.Filter.eq('year', YEAR))
    .mosaic()
    .rename([v.band].concat(v.stdBand ? [v.stdBand] : []));
}

function biome() {
  return ee.FeatureCollection(C.BIOME_FC)
    .filter(ee.Filter.eq(C.BIOME_PROP, C.BIOME_NAME))
    .first().geometry();
}

/** Stack [área_ha, estoque, w2, (área_modX, estoque_modX)×8, n0]: área por
 * classe do LULC (sempre informativa, mask só no LULC), estoque/incerteza nos
 * pixels preditos e estratificação def_sec em COLUNAS MOD (Σ def_sec = total).
 * A banda de classificação é o LULC CRU (n0), na ÚLTIMA posição. */
function statsImage(v) {
  var img = safeMosaic(v);
  var value = img.select(v.band).rename('valor');
  var lulc = ee.Image(C.LULC_ASSET).select(C.LULC_BAND).rename('n0');
  var mask = value.mask().and(lulc.mask());
  var areaHa = ee.Image.pixelArea().divide(10000);
  var defsec = ee.Image(LEG.DEF_SEC_ASSET).select(LEG.defsecBand(YEAR)).unmask(0);
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
    .concat([lulc, TERRITORY_IMAGE]));
}

function reduceFor(v, geom) {
  return statsImage(v).reduceRegion({
    reducer: REDUCER, geometry: geom, scale: SCALE, maxPixels: 1e13,
    tileScale: 2
  }).get('groups');
}

/* --------------------------------------------------------------------------
 * M2 — montagem SERVIDOR-SIDE (export IMEDIATO, sem evaluate; spike
 * 2026-09-17). Rótulos por ee.Dictionary (fontes: LEG + FCs IBGE) capturados
 * como constantes nas lambdas; `sum` é LISTA por grupo; combinação def_sec j
 * ocupa 2 elementos em off = 3 + j*2 (s[off] = área, s[off+1] = estoque);
 * s[2] = Σ w2 → incerteza ± √ em versões com stdBand. Área ≤ 0 → descartado.
 * ------------------------------------------------------------------------ */

/** Arredondamento servidor-side (1 casa decimal — espelho do r() legado). */
function r1(n) { return ee.Number(n).multiply(10).round().divide(10); }

/** ee.Dictionary de rótulos (constantes p/ as lambdas do rowsFC). */
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

/** FeatureCollection servidor-side das linhas (classe × def_sec) de uma
 * versão — espelho byte a byte do buildRows legado. */
function rowsFC(v, geom, D) {
  var groups = ee.List(reduceFor(v, geom));
  var vId = v.id;
  var withStd = !!v.stdBand;

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
        var off = 3 + j * 2;
        var am = ee.Number(s.get(off));
        var props = {
          version: vId, ano: YEAR,
          territorio: territorio, Bioma: biomeName, UF: ufSigla,
          'Unidade Federativa': ufNome,
          classe: cls,
          'cobertura (n0)': info.get('n0', ''),
          'cobertura (n1)': info.get('n1', ''),
          'cobertura (n2)': info.get('n2', ''),
          'cobertura (n3)': info.get('n3', ''),
          'cobertura (n4)': info.get('n4', ''),
          'Desmatamento e vegetação secundária':
            D.defsec.get(ee.Number(j).format(), ''),
          'Área (ha)': r1(am),
          'Estoque de carbono (t)': r1(ee.Number(s.get(off + 1)))
        };
        if (withStd) {
          props['Incerteza do estoque (t)'] =
            r1(ee.Number(s.get(2)).max(0).sqrt());
        }
        return ee.List(ee.Algorithms.If(am.gt(0), [ee.Feature(null, props)], []));
      }
      return ee.List(LEG.DEFSEC_MODS.map(one));
    }
    return ee.List(ee.List(td.get('groups')).map(expandClass));
  }

  return ee.FeatureCollection(ee.List(groups.map(expandTerritory)).flatten());
}

/** Colunas dos CSVs das estatísticas (export único, só combinações,
 * sem .geo/system:index). Nomes já prontos para gráfico. `Incerteza do
 * estoque (t)` é adicionada apenas quando a versão tem banda (v.stdBand). */
function statsColumns(v) {
  var cols = ['version', 'ano', 'territorio', 'Bioma', 'UF',
    'Unidade Federativa', 'classe',
    'cobertura (n0)', 'cobertura (n1)', 'cobertura (n2)', 'cobertura (n3)',
    'cobertura (n4)', 'Desmatamento e vegetação secundária',
    'Área (ha)', 'Estoque de carbono (t)'];
  if (v.stdBand) cols.push('Incerteza do estoque (t)');
  return cols;
}

/**
 * Gera as estatísticas de UMA versão (V03–V08). ALL por área Pantanal;
 * a diferenciação por UF sai da banda `territory` (colunas UF/Unidade
 * Federativa). Export agendado IMEDIATAMENTE (montagem servidor-side).
 * Uso: engine.runForVersion('v07');
 */
exports.runForVersion = function (versionId) {
  var v = C.VERSIONS.filter(function (x) { return x.id === versionId; })[0];
  if (!v) { print('[ERRO] versão desconhecida:', versionId,
    '— disponíveis:', C.VERSIONS.map(function (x) { return x.id; }).join(', '));
    return; }
  print('MAPBIOMAS-CARBONO · Pantanal Forest · 7_statistics ·', v.id);

  loadTerritories(function () {
    var D = buildLabelDicts();
    var fc = rowsFC(v, biome(), D);
    var slug = 'bioma';
    var fileName = C.PREFIX + '_' + v.id + '_' + slug + '_' + YEAR;
    try {
      Export.table.toDrive({
        collection: fc,
        description: 'WS_CARBONO_stats_forest_' + v.id + '_' + slug + '_' + YEAR,
        folder: C.DRIVE_FOLDER,
        fileNamePrefix: fileName,
        fileFormat: 'CSV',
        selectors: statsColumns(v)
      });
      print('[OK]', v.id, '· export IMEDIATO agendado (', C.BIOME_NAME,
        '· contagem de linhas você confere na task/CSV).');
    } catch (e) {
      print('[ERRO export]', fileName, String(e).slice(0, 200));
    }
  });
};

/**
 * O comparativo entre versões (V03–V08) é montado OFFLINE no Colab
 * (statistics_gcn → build_compare_forest), a partir dos `stats_forest_*.csv`.
 * O CSV do GEE contém UMA linha por combinação (classe × def_sec); as
 * agregações n0→n1, marcador e total são derivadas offline (in-memory),
 * somando as combinações por classe.
 */