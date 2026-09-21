/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de TERRITÓRIOS
 * ---------------------------------------------------------------------------
 * Níveis territoriais do app (mecanismo estilo toolkit de referência):
 * cada nível tem um asset + propriedade; a UI lista os valores distintos e
 * filtra/zoom. Assets do PRÓPRIO projeto.
 *
 *   bioma  → BIOMES_FC (prop `Bioma`)
 *   uf     → UFS_FC    (prop `NM_UF`)
 *   regiao → recortes custom do projeto (BAP, Matopiba)
 *   brasil → união de tudo
 *
 * BIOMAS/UFS: dicionários estáticos código→nome (rótulos, sem getInfo).
 ******************************************************************************/
var LIM = require(
  'users/workspaceipam/mapbiomas-carbono:COLLECTION_00/toolkits/view/v00/contracts/00_catalog_limits.js');

// ---- Biomas (IBGE) -----------------------------------------------------------
exports.BIOMAS = {
  0: 'Não observado', 1: 'Amazônia', 2: 'Caatinga', 3: 'Cerrado',
  4: 'Mata Atlântica', 5: 'Pampa', 6: 'Pantanal'
};

// ---- UFs (IBGE — códigos 11..53) --------------------------------------------
exports.UFS = {
  0: { sigla: '', nome: 'Não observado' },
  11: { sigla: 'RO', nome: 'Rondônia' }, 12: { sigla: 'AC', nome: 'Acre' },
  13: { sigla: 'AM', nome: 'Amazonas' }, 14: { sigla: 'RR', nome: 'Roraima' },
  15: { sigla: 'PA', nome: 'Pará' }, 16: { sigla: 'AP', nome: 'Amapá' },
  17: { sigla: 'TO', nome: 'Tocantins' }, 21: { sigla: 'MA', nome: 'Maranhão' },
  22: { sigla: 'PI', nome: 'Piauí' }, 23: { sigla: 'CE', nome: 'Ceará' },
  24: { sigla: 'RN', nome: 'Rio Grande do Norte' },
  25: { sigla: 'PB', nome: 'Paraíba' }, 26: { sigla: 'PE', nome: 'Pernambuco' },
  27: { sigla: 'AL', nome: 'Alagoas' }, 28: { sigla: 'SE', nome: 'Sergipe' },
  29: { sigla: 'BA', nome: 'Bahia' }, 31: { sigla: 'MG', nome: 'Minas Gerais' },
  32: { sigla: 'ES', nome: 'Espírito Santo' }, 33: { sigla: 'RJ', nome: 'Rio de Janeiro' },
  35: { sigla: 'SP', nome: 'São Paulo' }, 41: { sigla: 'PR', nome: 'Paraná' },
  42: { sigla: 'SC', nome: 'Santa Catarina' }, 43: { sigla: 'RS', nome: 'Rio Grande do Sul' },
  50: { sigla: 'MS', nome: 'Mato Grosso do Sul' }, 51: { sigla: 'MT', nome: 'Mato Grosso' },
  52: { sigla: 'GO', nome: 'Goiás' }, 53: { sigla: 'DF', nome: 'Distrito Federal' }
};

// ---- Níveis territoriais (ordem exibida na UI) ------------------------------
// kind: 'fc' (asset+prop) · 'custom' (regiões nomeadas) · 'all' (Brasil).
exports.LEVELS = {
  bioma: { label: 'Bioma', kind: 'fc', asset: LIM.BIOMES_FC,
    prop: LIM.BIOME_NAME_PROP },
  uf: { label: 'UF', kind: 'fc', asset: LIM.UFS_FC, prop: LIM.UF_NAME_PROP },
  regiao: { label: 'Região', kind: 'custom', regions: [
    { name: 'BAP',
      asset: 'projects/ee-arcplan/assets/bap_pantanal_planalto' },
    { name: 'Matopiba',
      asset: 'projects/mapbiomas-workspace/AUXILIAR/ESTATISTICAS/' +
        'COLECAO8/VERSAO-1/matopiba' }
  ] },
  brasil: { label: 'Brasil', kind: 'all' }
};

/** Ordem dos níveis na UI. */
exports.LEVEL_ORDER = ['bioma', 'uf', 'regiao', 'brasil'];
