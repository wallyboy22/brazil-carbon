/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · run · PANTANAL (driver)
 * ---------------------------------------------------------------------------
 * Driver único do bioma Pantanal: dispara as estatísticas da FLORESTA (AGC,
 * V03–V08) e dos CAMPOS (produtos v01–v02) via motor unificado.
 *
 *   · contrato: contracts/contract_pantanal.js (escopos FOREST e GRASSLAND)
 *   · motor:    engine/engine.js
 *   · saída:    MAPBIOMAS_CARBONO_ESTATISTICAS ·
 *               stats_forest_<v>_bioma_2023.csv
 *               stats_grassland_<v>_<regiao>_2023.csv (+ _biomassa_mensal_ /
 *               _anpp_mensal_ longos)
 *
 * Uso no Code Editor: só rodar. Para um escopo/versão específico:
 *   engine.runForest(PANTANAL.FOREST, 'v07');
 *   engine.runGrassland(PANTANAL.GRASSLAND, 'v02');
 ******************************************************************************/
var PANTANAL = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

print('MAPBIOMAS-CARBONO ·', PANTANAL.BIOME_NAME,
  '· estatísticas (floresta + campos)');
print('  · forest    :',
  PANTANAL.FOREST.VERSIONS.map(function (x) { return x.id; }).join(', '));
print('  · grassland :', PANTANAL.GRASSLAND.VERSIONS.join(', '));

engine.runForest(PANTANAL.FOREST);
engine.runGrassland(PANTANAL.GRASSLAND);
