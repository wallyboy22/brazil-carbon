# Referência — fund_amz_sem_quil_para_v02 (Amazônia)

Asset de apoio do produto v02 — domínio Amazônia, `sem_quil` (sem áreas
quilombolas?), destinado `para_v02`.

## Dados (medidos no GEE)

- **Asset GEE:** `projects/ee-ipam/assets/CCAL/DATASETS/Biomass_ref_maps/fund_amz_sem_quil_para_v02`
- **Tipo:** IMAGE · 1 banda `b1`
- **Escala:** ~31.9 m · **CRS:** (sem EPSG no metadata — provavelmente projeção
  customizada/UFTM region)
- **Cobertura:** Amazônia (bbox ~[-75.2, -19.3, -36.4, 6.8])
- **Stats:** min 1 · med ~125 · max **700** · valid ~40% — **não é máscara 0/1**;
  parece campo de biomassa/estoque (max 700 t/ha em florestas amazônicas).

## Contexto

- Nome sugere "fundo amazônia sem quilombolas para v02": recorte/máscara de
  domínio (ou campo de biomassa) preparado para a versão v02 do produto florestal.
- Sem paper associado — **contexto a confirmar com a equipe** (para que serve
  exatamente no pipeline v02).

## Uso planejado

- Definir com a equipe: se é máscara de domínio (excluir/pontuar áreas) ou
  referência de biomassa para a v02; até lá, manter fora do catálogo de
  validação e registrar status "a definir".

## A confirmar

- Significado (`sem_quil`, `fund`), CRS real, unidade (t/ha?) e papel no v02.