/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Catálogo de TERRITÓRIOS
 * ---------------------------------------------------------------------------
 * Dicionários ESTÁTICOS de biomas e UFs usados para decodificar a banda
 * `territory` (= bioma×100 + uf) DENTRO do grafo do Earth Engine, sem
 * `getInfo`/`evaluate`. Espelha o padrão da referência do mapbiomas-fire
 * (`territories/bioma_estado.js` + `_shared/legends.js`).
 *
 *   BIOMAS → código CD_BIOMA (1..6) → nome
 *   UFS    → CD_UF (11..53) → {sigla, nome}
 *
 * O diagnóstico `run/00_diagnose_territories.js` confirma o código do bioma
 * (`CD_BIOMA`) e os valores de CD_UF/SIGLA_UF/NM_UF do asset.
 ******************************************************************************/

// ---- Biomas (IBGE) -----------------------------------------------------------
exports.BIOMAS = {
  0: 'Não observado',
  1: 'Amazônia',
  2: 'Caatinga',
  3: 'Cerrado',
  4: 'Mata Atlântica',
  5: 'Pampa',
  6: 'Pantanal'
};

// ---- UFs (IBGE — códigos 11..53) --------------------------------------------
exports.UFS = {
  0: { sigla: '', nome: 'Não observado' },
  11: { sigla: 'RO', nome: 'Rondônia' },
  12: { sigla: 'AC', nome: 'Acre' },
  13: { sigla: 'AM', nome: 'Amazonas' },
  14: { sigla: 'RR', nome: 'Roraima' },
  15: { sigla: 'PA', nome: 'Pará' },
  16: { sigla: 'AP', nome: 'Amapá' },
  17: { sigla: 'TO', nome: 'Tocantins' },
  21: { sigla: 'MA', nome: 'Maranhão' },
  22: { sigla: 'PI', nome: 'Piauí' },
  23: { sigla: 'CE', nome: 'Ceará' },
  24: { sigla: 'RN', nome: 'Rio Grande do Norte' },
  25: { sigla: 'PB', nome: 'Paraíba' },
  26: { sigla: 'PE', nome: 'Pernambuco' },
  27: { sigla: 'AL', nome: 'Alagoas' },
  28: { sigla: 'SE', nome: 'Sergipe' },
  29: { sigla: 'BA', nome: 'Bahia' },
  31: { sigla: 'MG', nome: 'Minas Gerais' },
  32: { sigla: 'ES', nome: 'Espírito Santo' },
  33: { sigla: 'RJ', nome: 'Rio de Janeiro' },
  35: { sigla: 'SP', nome: 'São Paulo' },
  41: { sigla: 'PR', nome: 'Paraná' },
  42: { sigla: 'SC', nome: 'Santa Catarina' },
  43: { sigla: 'RS', nome: 'Rio Grande do Sul' },
  50: { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  51: { sigla: 'MT', nome: 'Mato Grosso' },
  52: { sigla: 'GO', nome: 'Goiás' },
  53: { sigla: 'DF', nome: 'Distrito Federal' }
};
