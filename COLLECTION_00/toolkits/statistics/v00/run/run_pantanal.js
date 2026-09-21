/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · run · PANTANAL (driver)
 * ---------------------------------------------------------------------------
 * Driver único do bioma Pantanal: dispara as estatísticas da FLORESTA (AGC,
 * V03–V07 + V08_GEDI/V08_IFN) e dos CAMPOS (produtos v01–v02) via motor unificado.
 *
 *   · contrato: contracts/contract_pantanal.js (escopos FOREST e GRASSLAND)
 *   · motor:    engine/engine.js
 *   · saída:    MAPBIOMAS_CARBONO_ESTATISTICAS ·
 *               stats_forest_<escopo>_2023.csv
 *               stats_grassland_<v>_<escopo>_2023.csv (+ _biomassa_mensal_ /
 *               _anpp_mensal_ longos)
 *
 * ESCOPOS TERRITORIAIS: definidos em TERRITORY_SCOPES (contrato). Default
 * ['bioma_uf']; opções: bioma_uf · bioma · uf · bap · bap_planalto ·
 * bap_pantanal · matopiba. Cada escopo gera um CSV (custo EECU × nº de escopos).
 *
 * Uso no Code Editor: só rodar. Para um escopo/versão específico:
 *   engine.runForest(PANTANAL.FOREST, 'v07');
 *   engine.runGrassland(PANTANAL.GRASSLAND, 'v02');
 ******************************************************************************/
var PANTANAL = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/contracts/contract_pantanal.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/statistics/v00/engine/engine.js');

// Seleção (opcional): null = todas as versões DISPONÍVEIS (auto-descoberta).
// Ex.: ONLY.forest = 'v07'; ONLY.grassland = 'v02'.
var ONLY = {
  forest: null,
  grassland: null
};

print('======================================================================');
print('MAPBIOMAS-CARBONO · estatísticas · processamento em andamento.');
print('As tasks são agendadas agora, mas podem levar alguns minutos para');
print('aparecer no Task Manager (aba "Tasks"). Aguarde — não rode de novo.');
print('======================================================================');
print('MAPBIOMAS-CARBONO ·', PANTANAL.BIOME_NAME,
  '· estatísticas (floresta + campos)');
print('  · forest    :',
  PANTANAL.FOREST.VERSIONS.map(function (x) { return x.id; }).join(', '));
print('  · grassland :', PANTANAL.GRASSLAND.VERSIONS.join(', '));

var pending = 2;
function scopeDone() {
  pending--;
  if (pending === 0) {
    print('======================================================================');
    print('[FIM] Tasks agendadas. Aguarde alguns minutos e confira o Task Manager;');
    print('ao concluírem, os CSVs aparecem no Drive em MAPBIOMAS_CARBONO_ESTATISTICAS/.');
    print('======================================================================');
  }
}

engine.runForest(PANTANAL.FOREST, ONLY.forest, scopeDone);
engine.runGrassland(PANTANAL.GRASSLAND, ONLY.grassland, scopeDone);
