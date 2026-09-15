# IFN — Inventário Florestal Nacional (parcelas, padrão BR)

Parcelas do Inventário Florestal Nacional — base de referência de biomassa em
campo para amostragem de covariáveis e validação independente.

## Dados

- **Assets GEE (padrão):**
  - `projects/ee-ipam/assets/IFN/IFN_2026_BR_PLOTS-v13` — plots (grade de parcelas)
  - `projects/ee-ipam/assets/IFN/IFN_2026_BR_Field_plots` — field plots (parcelas de campo)
- **Produtor:** Serviço Florestal Brasileiro / IPAM (atualização 2026)
- **Versão:** 2026 (BR — Brasil)

## Uso no projeto

- **Papel:** dados observados de biomassa em parcela (calibração suporte e
  **validação independente**).
- **Onde entra:**
  - Cerrado v00: `mb_carbon_agc_ifn.js` (amostra covariáveis nas parcelas),
    `ifn_vs_gedi.js` (convergência IFN ↔ GEDI, buffer 30 m);
  - v07: **validação externa** do produto (critério de aceite — viés absoluto,
    Bloco E da consulta estratégica).

## Notas do projeto

- **Padrão à frente:** os assets `IFN_2026_BR_*`; o cerrado v00 ainda referencia
  a versão regional `IFN_2026_Field_Cerrado`.
- Atenção ao *support mismatch*: parcela (unidade amostral) × footprint GEDI
  25 m — misturar como treino exige agregação/alometria; o uso preferido é
  validação.