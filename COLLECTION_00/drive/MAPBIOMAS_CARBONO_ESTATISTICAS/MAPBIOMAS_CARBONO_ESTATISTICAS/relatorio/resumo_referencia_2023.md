# MAPBIOMAS-CARBONO Pantanal — análise de dados de referência (2023)

Termos comuns: densidade **t C/ha** por classe; biomassa (t MS/ha)
comparada com AGB (lenhoso). Conversão AGB→C com fator 0.47.

## T1 · volumes por marcador × grupo de referência
                             count        mean        std    min         25%         50%         75%         max
marcador  ref_group                                                                                             
campestre Avitabile 2016      10.0  -99.992764   0.015114 -100.0 -100.000000 -100.000000  -99.993140  -99.952617
          Saatchi 2011        80.0  -61.290743  41.846948 -100.0 -100.000000  -89.559042  -17.404159    7.085698
          TCN (3ª CN)          0.0         NaN        NaN    NaN         NaN         NaN         NaN         NaN
          Xu & Saatchi 2021   60.0  -20.643319  63.232945 -100.0 -100.000000    5.437882   29.827635   82.201510
florestal Avitabile 2016      14.0 -100.000000   0.000000 -100.0 -100.000000 -100.000000 -100.000000 -100.000000
          Saatchi 2011       112.0  -57.875221  40.280230 -100.0 -100.000000  -49.508796  -19.858901   10.143259
          TCN (3ª CN)          0.0         NaN        NaN    NaN         NaN         NaN         NaN         NaN
          Xu & Saatchi 2021   60.0  -32.250942  44.148529 -100.0  -98.614667   -7.566343    1.716735   27.658458

## Produto — densidade por classe
                   count       mean       std  min        25%        50%        75%        max
produto                                                                                       
forest             340.0  18.815178  9.726448  0.0  14.489793  21.884627  25.343078  36.495000
grassland_biomass   48.0   0.000659  0.002114  0.0   0.000000   0.000000   0.000000   0.009877
grassland_carbon   188.0   0.000351  0.001177  0.0   0.000000   0.000000   0.000000   0.004938

## Viés do produto florestal (agbd tratado como C)
diff_pct mediana por referência (|produto - ref|/prod):
                median
ref_id                
saatchi_agc -24.461603
xu_live      -0.837358
tcn_agc            NaN

## T2 · distribuição do melhor ano de referência
produto            melhor_ref   
forest             saatchi_agc      {}
                   xu_live          {}
grassland_biomass  avitabile_agb    {}
                   saatchi_agb      {}
grassland_carbon   saatchi_agc      {}
                   xu_live          {}

## fator_impl (dens_prod / dens_ref — diagnóstico de unidade)
                   median  min    max
produto                              
forest              0.841  0.0  1.375
grassland_biomass   0.000  0.0  0.000
grassland_carbon    0.000  0.0  0.000

## Flags
- Xu2021 `b1..b20` -> anos 2000..2019 é PREMISSA (metadado ausente).
- AGB refs cobrem vegetação LENHOSA; campestre pode ficar sem
  cobertura (QA `ref_val_pct`).
- Produto florestal `fator_impl` mediano ~2 → confere C vs AGB.
