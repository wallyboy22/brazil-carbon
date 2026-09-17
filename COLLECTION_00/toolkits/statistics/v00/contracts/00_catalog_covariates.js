/******************************************************************************
 * MAPBIOMAS-CARBONO — toolkit statistics/v00 · Catálogo de COVARIÁVEIS
 * ---------------------------------------------------------------------------
 * Registro dos datasets que alimentam as matrizes de treino e as validações
 * (externos GEE/papers + internos do projeto). NÃO é consumido pelo motor de
 * estatísticas; serve de índice único para preflight/QA e para os contratos.
 * Fonte: COLLECTION_00/docs/README.md (fichas por dataset).
 ******************************************************************************/

// ---- Externos (catálogo GEE) -------------------------------------------------
exports.EXTERNAL = [
  { id: 'gedi_l4a', dataset: 'GEDI L4A AGBD v2.1', role: 'amostra AGC',
    assets: ['LARSE/GEDI/GEDI04_A_002'], bands: ['agbd', 'agbd_se'], since: 'v00' },
  { id: 'gedi_l4a_index', dataset: 'GEDI L4A table index', role: 'descoberta de granules',
    assets: ['LARSE/GEDI/GEDI04_A_002_INDEX'], bands: ['table_id', 'time_start', 'time_end'],
    since: 'v00' },
  { id: 'hls', dataset: 'NASA HLS v2 (L30/S30)', role: 'covariável óptica florestal',
    assets: ['NASA/HLS/HLSL30/v002', 'NASA/HLS/HLSS30/v002'],
    bands: ['Fmask', 'NDVI', 'EVI', 'NDMI', 'BAI', 'SAVI', 'BSI',
      'P10', 'P50', 'P90', 'AMP'], since: 'v01' },
  { id: 'palsar', dataset: 'JAXA ALOS PALSAR-2 (SAR_EPOCH)', role: 'radar/estrutura',
    assets: ['JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH'],
    bands: ['HH_db', 'HV_db', 'HV_HH', 'RVI'], since: 'v01' },
  { id: 'hand', dataset: 'HAND Height Above Nearest Drainage (global)',
    role: 'topografia', assets: ['users/gena/global-hand/hand-100'],
    bands: ['HAND', 'classes geomorfológicas'], since: 'v01' },
  { id: 'era5land', dataset: 'ERA5-Land Monthly Aggregated (ECMWF)', role: 'clima',
    assets: ['ECMWF/ERA5_LAND/MONTHLY_AGGR'],
    bands: ['CWD atual', 'CWD climatológico', 'CWD 3yr', 'Tmean', 'Prec'],
    since: 'v01' },
  { id: 'landsat_c02', dataset: 'Landsat C02 L2 (L5/L7/L8/L9)', role: 'biomassa campestre',
    assets: ['LANDSAT/LC08/C02/T1_L2'],
    note: 'série L5/L7/L8/L9 (Fonseca log-linear)', since: 'gv01' },
  { id: 'mcd15a3h', dataset: 'MODIS MCD15A3H v6.1 (LAI-FPAR)', role: 'fPAR',
    assets: ['MODIS/061/MCD15A3H'], bands: ['Fpar'], since: 'gv01' },
  { id: 'mcd18a1', dataset: 'MODIS MCD18A1 v6.1 (DSR)', role: 'radiação de superfície',
    assets: ['MODIS/061/MCD18A1'], bands: ['DSR'], since: 'gv01' },
  { id: 'mod17a2h', dataset: 'MODIS MOD17A2H v6.1 (GPP)', role: 'εCA observada',
    assets: ['MODIS/061/MOD17A2H'], bands: ['Gpp'], since: 'gv02' }
];

// ---- Internos do projeto -----------------------------------------------------
exports.INTERNAL = [
  { id: 'ifn', dataset: 'IFN — Inventário Florestal Nacional (padrão BR)',
    role: 'covariáveis + validação',
    assets: ['projects/ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13',
      'projects/ee-ipam/assets/IFN/IFN_2026_BR_Field_plots'], since: 'v00/v07' },
  { id: 'field_grassland', dataset: 'Parcelas de campo grassland (calibração Fonseca)',
    role: 'reestima Fonseca', assets: [null], // @todo c.FIELD.ASSET (contrato grassland v02)
    bands: ['biomass_kg_ha'], since: 'gv02' }
];

/** Todos os registros (externos + internos). */
exports.ALL = exports.EXTERNAL.concat(exports.INTERNAL);
