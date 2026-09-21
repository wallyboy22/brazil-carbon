/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest v08 · 2_0_IFN_EXPORT_FOOTPRINT
 * ---------------------------------------------------------------------------
 * Pré-requisito da variante IFN: normaliza as parcelas do IFN
 * (`IFN_2026_BR_PLOTS-v13`) para o schema do pipeline —
 *   · filtra ao domínio (BAP) e `AGB_Mg_ha > 0`;
 *   · reduz a geometria ao CENTROIDE;
 *   · grava o alvo `agbd = AGB_Mg_ha` (t/ha).
 * Exporta UMA FC por ano em `V08_IFN/SAMPLES/ifn_footprint_<ANO>` (espelha o
 * `2_0_gedi_export_footprint`; o IFN é um retrato único → 1 asset).
 *
 * Uso (SOURCE='ifn'): rodar uma vez; aguarde a task antes do 2_1.
 ******************************************************************************/
var c = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_contract.js');
var src = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/v08/0_covariate_source.js');

var S = c.SOURCE_CFG;
var YEAR = c.YEAR;
var SAMPLES_ROOT = c.ASSET_ROOT + '/SAMPLES';
var DOMAIN = src.getDomain().geometry();

var EXPORT_TO_ASSET = true;
var EXPORT_TO_DRIVE = false;   // CSV (opcional)
var EXPORT_FOLDER = 'GEE_Exports_AGC-v3';

/** Parcelas IFN normalizadas (centroide + `agbd`). */
function ifnFootprints() {
  return ee.FeatureCollection(S.footprintSource)
    .filterBounds(DOMAIN)
    .filter(ee.Filter.gt(S.targetProp, 0))
    .map(function (f) {
      var centroid = f.geometry().centroid(30);
      return ee.Feature(centroid)
        .copyProperties(f, S.sampleProps)
        .set('agbd', f.get(S.targetProp));
    });
}

print('MAPBIOMAS-CARBONO · Pantanal Forest v08 · 2_0_ifn_export_footprint');
print('[FONTE]', S.label, '· fonte crua', S.footprintSource);
print('[DOMÍNIO]', c.BAP_ASSET);
print('[SAÍDA]', SAMPLES_ROOT + '/ifn_footprint_' + YEAR);
src.ensureFolder(SAMPLES_ROOT);

var fc = ifnFootprints();
var name = 'ifn_footprint_' + YEAR;

if (EXPORT_TO_ASSET) {
  Export.table.toAsset({
    collection: fc,
    description: 'WS_CARBONO_toAsset-' + name,
    assetId: SAMPLES_ROOT + '/' + name
  });
  print('[TASK] Asset:', SAMPLES_ROOT + '/' + name);
}
if (EXPORT_TO_DRIVE) {
  Export.table.toDrive({
    collection: fc, description: 'WS_CARBONO_toDrive-' + name,
    folder: EXPORT_FOLDER, fileNamePrefix: name, fileFormat: 'CSV',
    selectors: ['agbd'].concat(S.sampleProps)
  });
  print('[TASK] Drive:', name + '.csv');
}

fc.size().evaluate(function (n) { print('[PARCELAS]', n); });
print('[FIM] aguarde a task antes do 2_1.');
