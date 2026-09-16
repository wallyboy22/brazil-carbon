# Referência — Xu & Saatchi 2021 (tropical, série 2000–2019)

Atualização da linhagem Saatchi: predição corrigida de carbono/biomassa com
série 2000–2019.

## Dados (medidos no GEE)

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/Saatchi_Xu2021_t10a_cd_ab_pred_corr_2000_2019_v2`
- **Tipo:** IMAGE · **20 bandas** (b1..b20) — bandas genéricas, sem ano/variável no metadata
- **Escala:** ~11.1 km (0.1°) · **CRS:** EPSG:4326
- **Cobertura:** global (extensão global, sem footprint)
- **Stats no Pantanal:** mediana por banda ~16.7–18.2 · máx ~110–121 · valid ~99–100%
- **Paper:** a identificar — PDF `xu_saatchi2021.pdf` salvo em `docs/Referências de mapeamento/`

## Contexto científico

- Sucessor metodológico do Saatchi 2011: modelagem espaço-temporal com
  **predição corrigida** (`pred_corr`) ao longo de 2000–2019.
- Nome sugere `cd` (carbono/density) × `ab` (acima do solo) e ~10 passos de tempo
  × 2 variáveis — **mapear banda→ano/variável** ainda pendente (usar o PDF).
- Faixa em t/ha no Pantanal (med ~17, máx ~121) condiz com estoque + baixa
  resolução (média de ~0.1°).

## Uso planejado

- Valor central: **série temporal 2000–2019** vs nossa extensão de série
  (retrospectiva 1985/bookkeeping) — comparação de dinâmica e magnitude.
- Só depois de mapear bandas; comparar em escala ~10 km (nunca pixel 30 m).

## A confirmar

- Semântica de cada banda (ano + AGB/C), unidade exata (t/ha), e paper de
  referência — a partir de `xu_saatchi2021.pdf`.