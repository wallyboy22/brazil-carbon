# MAPBIOMAS-CARBONO — pantanal/grassland v02 · Revisão e avanços

> Revisão completa da v02 (métodos GEE + estratégia vs. v01) feita após o
> relato de sintaxe `$` em `2_1_amostras_campo_toAsset.js`. Objetivo: saber
> como avançar, não retroceder. Ações executadas marcadas ✅; dependentes de
> dados externos marcadas 🔲.

---

## 1. A sintaxe `$` (origem do relato)

Os únicos `$` da pipeline eram **âncoras de regex** (sintaxe válida em GEE,
não template literals):

- `2_1_amostras_campo_toAsset.js` — `ASSET_ROOT.replace(/\/V02$/, '/FIELD')` ✅
- `6_qa.js` — `ASSET_ROOT.replace(/V02$/, 'V01')` ✅

**Fix:** substituídos por `String.replace(caminho, ...)` (o `ASSET_ROOT` só
contém `/V02` no fim → resultado idêntico, **zero `$`**). Varredura completa
confirmou: **0 arrow functions, 0 template literals, 0 `$`** em código
executável dos pipelines panthaneiros (os backticks achados estão só em
comentários markdown). A base é ES5-limpa para o Code Editor.

## 2. Revisão técnica (métodos GEE)

**Já boas práticas (manter):** ES5; assets anuais consolidados; cascade
(`5_carbon` lê o asset de `3_biomass`); `stats_engine` com error callbacks,
`assetExists`, `groupsOrEmpty`, QA de somas (espelha o forest); gate
`2_3_gcn` com aceite F20.

**Correções aplicadas (hardenings):**

| Item | Mudança | Arquivo |
|---|---|---|
| B1 ✅ | **DSR_QC** no cálculo da PARa (qualidade ≤1 e bits de nuvem/sombra). Só `Fpar_QC` era usado (reflexão C11). | `0_sensor_landsat_modis.js` |
| B3 ✅ | `.evaluate` sem error callback em `2_mask_grassland` (mesma classe de bug vista no forest). | `2_mask_grassland.js` |
| B4 ✅ | **NDWI seco por percentil 10** dos 12 meses (antes: jul/ago/set fixos — reflexão C9 evolução). | `0_sensor_landsat_modis.js` |
| B6 ✅ | `ensureFolder`/`assetExists` extraídos para **`pantanal/module_infra.js`** — desacopla grassland da dependência `forest/v01`. | `module_infra.js` (novo) |

**Lacunas registradas (não executadas):** janela DSR `[t, t+4d]` pode sair do mês
(centrar `[t−2, t+2]`); `monthlyBiomass` re-deriva o grafos Landsat num 2º
caminho (só custo); **interpolação temporal** para mês sem MCD15A3H (C11) —
pendente de implementar antes da série.

## 3. Revisão estratégica (vs. v01) e avanços

| Decisão | Status |
|---|---|
| Produto em **todo o bioma** (req. usuário) + stats do bioma inteiro | v01 ✅ (mantido) |
| **Biomassa calibrada por campo** (Fonseca refit) | Arquitetura pronta; **🔲 falta asset de parcelas** → rodar `2_1` + gate `2_3_gcn` |
| Clamp de suporte `[0.3, 12]` Mg/ha | ✅ mantido |
| εCA do Pampa **provisória** | ✅ mantida na v02; **novo `2_5_eca_observada`** para substituir por ε medida (B6) |
| **Elegibilidade do carbono (D15)** | ✅ **ativa por padrão**: `STABILITY_YEARS = [2021, 2022, 2023]` → banda `elig_carbon` no produto; evita contar floresta com modelo de campo |
| Máscara de água permanente (C9) | ✅ `MASK_WATER=true` + NDWI seco por quantil (B4) |
| Série 2000–2023 (fase 5) | 🔲 só após εCA + cheia/água dinâmica resolvidas |

## 4. Como avançar (ordem proposta)

1. 🔲 **Campo (dominante, G25):** importar asset com `biomass_kg_ha`/
   `date` → preencher `c.FIELD.ASSET` → rodar `2_1_amostras_campo_toAsset` →
   gate `2_3_gcn` → copiar `coefficients`/`source` do `biomass_model.json`
   para `0_contract.js`. Critérios de aceite em `2_3_gcn/README.md` (F20).
2. **εCA observada:** rodar `2_5_eca_observada.js` (novo) → comparar com
   `ECA_MONTHLY`; se diferença > ±30% em >2 meses, adotar ε ajustada por
   classe/estado hidrológico e ligar `ECA_MODULATE_CWD` quando houver máscara.
3. **Cheia dinâmica (C9/C10):** máscara mensal por NDWI (`MASK_FLOOD`) e
   interpolação temporal do fPAR — pré-requisitos da série.
4. **Série 2000–2023 (fase 5):** módulo separado, Landsat L5–L9 + SLC-off
   tratado; decisão de produto "séries" aprovada pela equipe antes do custo.