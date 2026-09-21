/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit view/v00 · Catálogo de LIMITES (IBGE)
 * ---------------------------------------------------------------------------
 * Recortes territoriais do projeto usados pelo app de visualização:
 *   BIOMES_FC → biomas 2026 (prop de nome `Bioma`, código `CD_BIOMA`)
 *   UFS_FC    → UFs 2025    (código `CD_UF`, sigla `SIGLA_UF`, nome `NM_UF`)
 * Reescrito do toolkit statistics/v00 (mesmos assets do projeto).
 ******************************************************************************/

exports.BIOMES_FC =
  'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.UFS_FC =
  'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_ufs_IBGE_2025';

exports.BIOME_CODE_PROP = 'CD_BIOMA';
exports.BIOME_NAME_PROP = 'Bioma';
exports.UF_CODE_PROP = 'CD_UF';
exports.UF_SIGLA_PROP = 'SIGLA_UF';
exports.UF_NAME_PROP = 'NM_UF';

/** Biomas do Brasil (slug p/ seleção; nome = valor de BIOME_NAME_PROP). */
exports.BIOMES = [
  { slug: 'amazonia', nome: 'Amazônia' },
  { slug: 'caatinga', nome: 'Caatinga' },
  { slug: 'cerrado', nome: 'Cerrado' },
  { slug: 'mata_atlantica', nome: 'Mata Atlântica' },
  { slug: 'pampa', nome: 'Pampa' },
  { slug: 'pantanal', nome: 'Pantanal' }
];
