/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Catálogo de LIMITES (IBGE)
 * ---------------------------------------------------------------------------
 * Fonte única dos recortes territoriais (bioma / UF / município) e dos nomes
 * de propriedades consumidos pelo `module_territory.js` e pelos contratos.
 *
 * Assets (padrão IBGE via IPAM):
 *   BIOMES_FC → biomas 2026 (prop de NOME `Bioma`)
 *   UFS_FC    → UFs 2025    (código `CD_UF`, sigla `SIGLA_UF`, nome `NM_UF`)
 *   MUNS_FC   → municípios 2025 (ainda não usado; id a confirmar)
 *
 * Nota: o paint do bioma usa o CÓDIGO numérico `CD_BIOMA` (1..6) do asset
 * (o diagnóstico `run/00_diagnose_territories.js` confirmou `CD_BIOMA`/`GEOCODE`
 * = 1..6); os rótulos vêm do dicionário estático `00_catalog_territories.js`.
 ******************************************************************************/

// ---- Assets de limite --------------------------------------------------------
exports.BIOMES_FC =
  'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.UFS_FC =
  'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_ufs_IBGE_2025';
// @todo id exato não confirmado (docs: limite_municipios_IBGE_2025)
exports.MUNS_FC = null;

// ---- Propriedades ------------------------------------------------------------
exports.BIOME_CODE_PROP = 'CD_BIOMA'; // código numérico do bioma (1..6)
exports.BIOME_NAME_PROP = 'Bioma';    // nome do bioma (ex.: 'Pantanal')
exports.UF_CODE_PROP = 'CD_UF';
exports.UF_SIGLA_PROP = 'SIGLA_UF';
exports.UF_NAME_PROP = 'NM_UF';

// ---- Biomas do Brasil (slug p/ seleção; nome = valor de BIOME_NAME_PROP) ------
exports.BIOMES = [
  { slug: 'amazonia',       nome: 'Amazônia' },
  { slug: 'caatinga',       nome: 'Caatinga' },
  { slug: 'cerrado',        nome: 'Cerrado' },
  { slug: 'mata_atlantica', nome: 'Mata Atlântica' },
  { slug: 'pampa',          nome: 'Pampa' },
  { slug: 'pantanal',       nome: 'Pantanal' }
];
