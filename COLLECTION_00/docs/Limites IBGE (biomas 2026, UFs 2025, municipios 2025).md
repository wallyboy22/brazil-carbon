# Limites IBGE — Biomas (2026) · UFs (2025) · Municípios (2025)

Limites oficiais do IBGE para recorte de território e agregação estatística.

## Dados

- **Assets GEE (padrão):**
  - `projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_biomas_IBGE_2026`
  - `projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_ufs_IBGE_2025`
  - `projects/ee-ipam/assets/ORIGINAIS/IBGE/limite_municipios_IBGE_2025`
- **Produtor:** IBGE (importados para o projeto em `ee-ipam`)

## Uso no projeto

- **Papel:** definem o território dos produtos e as unidades de agregação.
- **Onde entra:** recorte do bioma nas estatísticas florestais/campestres
  (`limite_biomas_IBGE_2026`); agregação por UF (`limite_ufs_IBGE_2025`);
  municípios habilitam agregação municipal futura.

## Notas do projeto

- **Padrão:** assets oficiais `ee-ipam/ORIGINAIS/IBGE`.
- O `stats_engine` ainda usa `projects/mapbiomas-brazil/auxiliar/limites/UF_IBGE_2022`
  como `UF_ASSET` — migrar para `limite_ufs_IBGE_2025` à frente.