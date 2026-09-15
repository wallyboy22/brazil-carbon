# Parcelas de campo — calibração do modelo de biomassa campestre

Dados primários de campo (parcelas) usados para reestimar o modelo Fonseca da
pipeline campestre (grassland v02).

## Dados

- **Asset GEE:** `c.FIELD.ASSET` (configurável no `0_contract.js` da v02) —
  hoje `null` (sem asset carregado).
- **Propriedade principal:** `biomass_kg_ha` (biomassa medida na parcela).
- **Produtor:** equipe de campo MapBiomas Carbono (a consolidar).

## Uso no projeto

- **Papel:** reestimativa do **Fonseca log-linear** em parcelas de campo
  (calibração da biomassa campestre).
- **Onde entra:** `grassland/v02/2_1_amostras_campo_toAsset.js` (amostra
  covariáveis nas parcelas → matriz de calibração) e `2_3_gcn` (ajuste do modelo →
  `biomass_model.json`).

## Notas do projeto

- Sem `FIELD.ASSET`, a pipeline roda com **coeficientes provisórios do Pampa** e
  **clamp [0.3, 12] Mg/ha**, avisando no console.
- Enquanto não há fit, a εCA e a fração de carbono também permanecem hipóteses
  provisórias do Pampa.