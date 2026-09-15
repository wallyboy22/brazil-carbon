/****** Adam
 * MAPBIOMAS-CARBONO — Pantanal Forest · Estatísticas · TODAS as versões (driver)
 * ---------------------------------------------------------------------------
 * Driver ÚNICO da cadeia florestal: itera `C.VERSIONS` (V03–V08), chamando
 * `stats_engine.runForVersion(v.id)` para cada uma, no mesmo `require` e com
 * os mesmos prefixos/folder do motor compartilhado:
 *
 *   · contratos: statistics/0_contract_stats.js
 *   · motor:     statistics/stats_engine.js (require path abaixo)
 *   · saída:     MAPBIOMAS_CARBONO_ESTATISTICAS · `stats_forest_<v>_<regiao>_2023.csv`
 *
 * Substitui rodar `v0X/7_statistics.js` um a um. Uso no Code Editor: só rodar.
 * As agregações n1/marcador/total continuam OFFLINE no Colab (statistics_gcn),
 * a partir destes mesmos CSVs n0.
 ******************************************************************************/
var C = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/0_contract_stats.js');
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js');

print('MAPBIOMAS-CARBONO · Pantanal Forest · estatísticas · TODAS as versões:',
  C.VERSIONS.map(function (x) { return x.id; }).join(', '));

C.VERSIONS.forEach(function (v) {
  engine.runForVersion(v.id);
});
