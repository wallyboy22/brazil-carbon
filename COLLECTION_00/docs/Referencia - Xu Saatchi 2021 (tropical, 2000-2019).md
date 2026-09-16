# Referência — Xu & Saatchi 2021 (tropical, série 2000–2019)

Atualização da linhagem Saatchi: predição corrigida de carbono/biomassa com
série anual (2000–2019).

## Dados

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2`
- **Paper:** a identificar (linhagem Saatchi/Xu, 2021) — **citado quando confirmado**
- **Cobertura:** tropicais (a confirmar)
- **Série temporal:** 2000–2019 (bandas anuais `t10a`)
- **Versão:** v2

## Contexto científico

- Sucessor metodológico do Saatchi 2011: modelagem espaço-temporal com correção
  das predições (`pred_corr`) ao longo do período 2000–2019.
- `cd` (carbon density?) × `ab` (aboveground?) — significados das bandas a
  confirmar (possível AGB e carbono no mesmo asset).

## Uso planejado

- Interesse central: séries **temporais** 2000–2019 vs nossa extensão de série
  futura (retrospectiva 1985 / bookkeeping) — comparação de dinâmica e
  magnitude do estoque.
- Atenção à escala espacial e unidades antes de comparar com o produto de 30 m.

## A confirmar no GEE

- `print('bands', img.bandNames())` — quais bandas anuais, unidades (AGB/AGC/Mg/ha),
  extensão e paper de referência do asset.