/******************************************************************************
 * MAPBIOMAS-CARBONO — Pantanal Forest · covariate/_metadata.js
 * ---------------------------------------------------------------------------
 * COVARIATES_REGISTRY — registro de proveniência de cada covariável.
 *
 * CONVENÇÃO since_vNN: para cada covariável, a lista `versions` marca com a
 * tag 'since_vNN' o momento em que aquela formulação entrou (e se manteve
 * até hoje), em vez de listar todas as versões vNN→vMM intermediárias.
 * Mudanças subsequentes entram como itens novos na lista (ex.: PALSAR
 * 'since_v01' → 'v08').
 *
 * Consumo: o orquestrador da versão expõe COVARIATES_REGISTRY; `3_model_training`
 * treina o ensemble e o passo `3_1_model_metadata` (após as tasks) grava a
 * proveniência nas propriedades do asset do modelo (ee.data.setAssetProperties;
 * `ee.Classifier` não é `ee.Element` e não aceita `.set()`).
 ******************************************************************************/

exports.COVARIATES_VERSION = 'since_v03';

exports.COVARIATES_REGISTRY = [
  {
    id: 'hls',
    name: 'HLS Spectral Composite',
    description: 'Índices espectrais (NDVI/EVI/NDMI/BAI/SAVI/BSI) em percentis ' +
      'P10/P50/P90 + amplitude (AMP) sobre o ano.',
    source: 'NASA/HLS/HLSL30/v002 + HLSS30/v002',
    bands: [].concat(
      ['NDVI', 'EVI', 'NDMI', 'BAI', 'SAVI', 'BSI']
        .map(function (b) { return b + '_p10'; }),
      ['NDVI', 'EVI', 'NDMI', 'BAI', 'SAVI', 'BSI']
        .map(function (b) { return b + '_p50'; }),
      ['NDVI', 'EVI', 'NDMI', 'BAI', 'SAVI', 'BSI']
        .map(function (b) { return b + '_p90'; }),
      ['NDVI', 'EVI', 'NDMI', 'BAI', 'SAVI', 'BSI']
        .map(function (b) { return b + '_amp'; })),
    type: 'continuous',
    unit: 'dimensionless',
    resolution: '30 m',
    versions: [{ tag: 'since_v01', method: 'composição anual por percentis, Fmask' }],
    author: 'IPAM (pipeline v01/pantanal)',
    notes: 'Máscara Fmask (nuvem/sombra/cirrus); reflectância /10000.'
  },
  {
    id: 'palsar',
    name: 'PALSAR-2 SAR Composite',
    description: 'Retroespalhamento HH e HV em dB, razão HV/HH e RVI.',
    source: 'JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH',
    bands: ['HH_db', 'HV_db', 'HV_HH_ratio', 'RVI'],
    type: 'continuous',
    unit: 'dB (HH/HV); dimensionless (ratio, RVI)',
    resolution: '25 m (reprojetado p/ 30 m)',
    versions: [
      { tag: 'since_v01', method: '.first() por célula',
        note: 'Platôs de HV/HH alinhados à grade (não recomendado).' },
      { tag: 'v08', method: 'mediana global determinística',
        note: 'Fix do artefato de excesso de carbono pós-v07.' }
    ],
    author: 'IPAM (pipeline v08/pantanal — fix global)',
    notes: 'DN<=0 mascarado como nodata; filtro speckle focal_mean(3).'
  },
  {
    id: 'hand',
    name: 'HAND + Classes geomorfológicas',
    description: 'Altura relativa à drenagem (m) e classes 1-4 de terreno.',
    source: 'users/gena/global-hand/hand-100',
    bands: ['HAND_m', 'geomorph_class'],
    type: 'continuous (HAND_m) + categorical (geomorph_class)',
    unit: 'm; classe 1-4',
    resolution: '30 m',
    versions: [{ tag: 'since_v01', method: 'mosaic HAND + thresholds 5/15/45 m' }],
    author: 'IPAM (pipeline v01/pantanal)',
    notes: 'Classes: 1 < 5, 2 [5,15), 3 [15,45), 4 ≥ 45 m.'
  },
  {
    id: 'era5',
    name: 'ERA5-Land: CWD, temperatura e precipitação',
    description: 'Déficit hídrico climático atual/climatológico/3yr, ' +
      'temperatura média anual e precipitação anual.',
    source: 'ECMWF/ERA5_LAND/MONTHLY_AGGR',
    bands: ['CWD_current', 'CWD_clim', 'CWD_3yr', 'Tmean_C', 'Prec_mm'],
    type: 'continuous',
    unit: 'mm (CWD/P); °C (Tmean)',
    resolution: '~9 km (reprojetado p/ 30 m)',
    versions: [{ tag: 'since_v01', method: 'Σ max(ETP−P,0); clima 2010-2020; 3yr rolante' }],
    author: 'IPAM (pipeline v01/pantanal)',
    notes: 'CWD_3yr soma os 3 anos anteriores; Tmean em °C (K−273,15).'
  },
  {
    id: 'mapbiomas_lulc',
    name: 'MapBiomas Coleção 11 — uso e cobertura',
    description: 'Classe de uso/cobertura do ano (rótulo do pixel).',
    source: 'projects/mapbiomas-public/assets/brazil/lulc/collection11',
    bands: ['mapbiomas_lulc'],
    type: 'categorical',
    unit: 'código C11',
    resolution: '30 m',
    versions: [{ tag: 'since_v01', method: 'classification_<ano>' }],
    author: 'MapBiomas',
    notes: 'Usada como covariável e como máscara de TREINO (não de predição).'
  },
  {
    id: 'training_masks',
    name: 'Máscaras de treino (LULC + extras)',
    description: 'Restrição das amostras de treino: florestas LULC ' +
      '(3,4,6,7,49) AND máscaras extras. NÃO mascara a predição.',
    source: 'MapBiomas C11 + PALSAR validade (v08)',
    bands: ['forest_mask', 'mask_palsar_nodata'],
    type: 'mask (Uint8 0/1)',
    resolution: '30 m',
    versions: [
      { tag: 'since_v06', method: 'getForestMask (LULC) — MASK_MODE prediction_year' },
      { tag: 'since_v07', method: 'getTrainingMask + registry EXTRA_MASK_BUILDERS',
        note: 'MASK_MODE training_only; predição não mascarada.' },
      { tag: 'v08', method: '+ extra palsar_nodata',
        note: 'Exclui footprints sem dado SAR válido no mosaico global.' }
    ],
    author: 'IPAM (pipeline v06/v07/v08/pantanal)',
    notes: 'Registry extensível em _training.js; contrato lista TRAINING_MASKS.'
  },
  {
    id: 'ensemble',
    name: 'Ensemble RF por subamostragem de bandas',
    description: 'Subconjunto determinístico de FEATURE_BANDS por membro i ' +
      '(~BAND_FRACTION via hash banda+i).',
    source: 'derivado das FEATURE_BANDS do contrato',
    bands: ['subconjunto de FEATURE_BANDS por membro'],
    type: 'n/a (seleção de bandas)',
    resolution: 'n/a',
    versions: [{ tag: 'since_v07', method: 'hashString + BAND_FRACTION',
      note: 'Resposta D15-17: N=5, 80% bandas, 80% linhas.' }],
    author: 'IPAM (pipeline v07/pantanal)',
    notes: 'getMemberBands(i) deterministic — mesmo hash em qualquer execução.'
  }
];