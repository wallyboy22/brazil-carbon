/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · Estatísticas (contrato)
 * ---------------------------------------------------------------------------
 * Estatísticas de AGC (agbd, Mg/ha) por classe LULC C11 para as versões
 * V03–V08 da cadeia florestal. Molde herdado de
 * `mapbiomas_solo/collection3/statistics` (pixelArea → grupo por classe →
 * Export.table.toDrive).
 *
 * Convenções:
 *   - todas as versões preveem APENAS 2023; mosaico final:
 *     <V0X>/PREDICTIONS/agc_pred_v0X_merged_2023
 *   - banda de predição: 'prediction_2023'; v07/v08 têm incerteza de ensemble
 *     em 'agbd_std_2023' (desvio padrão dos membros, Mg/ha)
 *   - incerteza agregada (v07): std_total = sqrt( Σ (std × área_ha)² )
 ******************************************************************************/

exports.ECO = 'pantanal';
exports.SCOPE = 'forest';
exports.YEAR = 2023;
exports.SCALE = 30;

// ---- Versões contempladas (todas 2023) ------------------------------------
// stdBand: null para versões sem incerteza de ensemble (incerteza = 0).
exports.VERSIONS = [
  {
    id: 'v03',
    mosaic: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V03/PREDICTIONS/agc_pred_v03_merged_2023',
    band: 'prediction_2023',
    stdBand: null
  },
  {
    id: 'v04',
    mosaic: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V04/PREDICTIONS/agc_pred_v04_merged_2023',
    band: 'prediction_2023',
    stdBand: null
  },
  {
    id: 'v05',
    mosaic: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V05/PREDICTIONS/agc_pred_v05_merged_2023',
    band: 'prediction_2023',
    stdBand: null
  },
  {
    id: 'v06',
    mosaic: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V06/PREDICTIONS/agc_pred_v06_merged_2023',
    band: 'prediction_2023',
    stdBand: null
  },
  {
    id: 'v07',
    mosaic: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V07/PREDICTIONS/agc_pred_v07_merged_2023',
    band: 'prediction_2023',
    stdBand: 'agbd_std_2023'
  },
  {
    id: 'v08',
    mosaic: 'projects/mapbiomas-brazil/assets/CARBON/MAPPING/COLLECTION_00/PANTANAL_FOREST/V08/PREDICTIONS/agc_pred_v08_merged_2023',
    band: 'prediction_2023',
    stdBand: 'agbd_std_2023'
  }
];

// ---- Território -------------------------------------------------------------
// Área de análise = bioma; UF opcional (UF_LIST = ['MS','MT'] habilita o
// detalhamento por unidade federativa). UF_LIST vazio → só o bioma.
exports.BIOME_FC = 'projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026';
exports.BIOME_PROP = 'Bioma';
exports.BIOME_NAME = 'Pantanal';
exports.UF_LIST = [];
/** @todo preencher quando UF_LIST != [] */
exports.UF_ASSET = 'projects/mapbiomas-brazil/auxiliar/limites/UF_IBGE_2022';
exports.UF_PROP = 'SIGLA';
exports.UF_NAME = 'UF';

// ---- LULC Coleção 11 (classificação do ano de análise) ---------------------
exports.LULC_ASSET =
  'projects/mapbiomas-public/assets/brazil/lulc/collection11/' +
  'mapbiomas_brazil_collection11_coverage_v3';
exports.LULC_BAND = 'classification_' + exports.YEAR; // ex.: classification_2023

// ---- Saída -------------------------------------------------------------------
// CSVs para o Drive, em MAPBIOMAS_CARBONO_ESTATISTICAS do usuário.
exports.DRIVE_FOLDER = 'MAPBIOMAS_CARBONO_ESTATISTICAS';
exports.PREFIX = 'stats_forest';

// Unidades das colunas de valor.
exports.STOCK_UNIT = 'Mg';       // agbd (AGC) em Mg/ha × área_ha
exports.UNCERT_MODE = 'sd_ens';  // incerteza = stdDev do ensemble (v07)