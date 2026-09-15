# MapBiomas Brasil — Coleção 11 (cobertura e uso)

Mapa anual de cobertura e uso da terra do Brasil (30 m) — define o universo
(máscaras) e a legenda das estatísticas.

## Dados

- **Asset GEE:** `projects/mapbiomas-public/assets/brazil/lulc/collection11/mapbiomas_brazil_collection11_coverage_v3`
- **Produtor:** MapBiomas
- **Versão:** Coleção 11 (coverage v3)
- **Disponibilidade:** 1985–presente
- **Link oficial:** https://brazil.mapbiomas.org (mapas/legenda)

## Uso no projeto

- **Papel:** máscara de domínio e legenda de agregação.
- **Classes:** máscara florestal `{3,4,6,7,49}` (Formação Florestal,
  Savana-Estépica Florestada, Floresta Aluvial, Savana Alagada, Restinga Arbórea);
  campestre `{11,12,50}`.
- **Onde entra:** `forest/covariate/_lulc.js` (`since_v01`; máscara de treino desde
  v06); `grassland/v0X` (rotula, não mascara); `statistics/*` (legenda C11 via
  `module_lulc_legends.js`).

## Notas do projeto

- Máscara LULC aplicada **apenas no treino** (v07): a predição não é mascarada.
- Estatísticas agregam por `n0/n1/marcador` (Floresta / Campestre / Outros).