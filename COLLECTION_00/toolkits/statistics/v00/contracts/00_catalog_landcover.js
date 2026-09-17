/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Catálogo de LANDCOVER (C11)
 * ---------------------------------------------------------------------------
 * Fonte única dos assets de cobertura (MapBiomas Coleção 11) usados nas
 * estatísticas e das legendas/níveis. Delega ao `module_legends.js` (que é o
 * dono dos assets e da árvore de classes) para não duplicar definição.
 *
 *   C11_ASSET      → cobertura (bandas `classification_1985..2025`)
 *   DEF_SEC_ASSET  → desmatamento e vegetação secundária (0..7)
 *   landcoverBand  → 'classification_<ano>'
 *   defsecBand     → 'classification_<ano>' (def_sec)
 ******************************************************************************/
var LEG = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/module_legends.js');

exports.C11_ASSET = LEG.C11_ASSET;
exports.DEF_SEC_ASSET = LEG.DEF_SEC_ASSET;

/** Banda de cobertura (LULC) do ano `y`. */
exports.landcoverBand = function (y) { return 'classification_' + y; };

/** Banda de desmatamento/vegetação secundária (def_sec) do ano `y`. */
exports.defsecBand = LEG.defsecBand;

/** Módulos def_sec (0..7). */
exports.DEFSEC_MODS = LEG.DEFSEC_MODS;

/** Legenda de def_sec (0..7) por extenso. */
exports.DEF_SEC_VEG_LEGEND = LEG.DEF_SEC_VEG_LEGEND;

/** Módulo de legendas completo (n0..n4, natureza, marcador, infoMap). */
exports.LEG = LEG;
