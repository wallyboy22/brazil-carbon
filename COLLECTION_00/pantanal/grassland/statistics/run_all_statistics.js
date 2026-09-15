/****** Adam
 * MAPBIOMAS-CARBONO — Pantanal Grassland · Estatísticas · TODAS as versões (driver)
 * ---------------------------------------------------------------------------
 * Driver ÚNICO da cadeia campestre: itera as versões dos produtos (v01–v02),
 * chamando `stats_engine.runForVersion(versionId)` para cada uma, no mesmo
 * `require` e com os mesmos prefixos/folder do motor compartilhado:
 *
 *   · motor:   statistics/stats_engine.js (require path abaixo)
 *   · saída:   MAPBIOMAS_CARBONO_ESTATISTICAS · `stats_grassland_<v>_<produto>_<regiao>_2023.csv`
 *
 * Substitui rodar `v0X/7_statistics.js` um a um. Uso no Code Editor: só rodar.
 * O comparativo entre produtos/versões (v02) é montado OFFLINE no Colab
 * (statistics_gcn), a partir destes mesmos CSVs.
 ******************************************************************************/
var engine = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/stats_engine.js');

var VERSIONS = ['v01', 'v02'];

print('MAPBIOMAS-CARBONO · Pantanal Grassland · estatísticas · TODAS as versões:',
  VERSIONS.join(', '));

VERSIONS.forEach(function (versionId) {
  engine.runForVersion(versionId);
});
