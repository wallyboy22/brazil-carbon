# JAXA ALOS PALSAR-2 SAR Composite (SAR_EPOCH)

Mosaico anual de retroespalhamento SAR (bandas HH/HV) do ALOS-2 — covariável de
estrutura vertical da vegetação (cadeia florestal).

## Dados

- **Asset GEE:** `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH`
- **Produtor:** JAXA
- **Versão:** YEARLY / SAR_EPOCH (mosaico reduzido por época)
- **Disponibilidade:** 2007–presente (por ano)
- **Link oficial:** https://developers.google.com/earth-engine/datasets/catalog/JAXA_ALOS_PALSAR_YEARLY_SAR_EPOCH

## Uso no projeto

- **Papel:** complemento ao óptico — sensibilidade à estrutura/especkle da vegetação.
- **Bandas derivadas (4):** `HH_db`, `HV_db`, `HV_HH_ratio`, `RVI`;
  conversão dB (`pow(2)·log10·10−83`) e smooth `focal_mean(3)`.
- **Onde entra:** `forest/covariate/_palsar.js` — amostra per-célula (`since_v01`)
  e mosaico global (`v08`).

## Notas do projeto

- **v01–v07:** `.first()` por célula sobre `SAR_EPOCH` — gerou **platôs de carbono**
  alinhados à grade (diagnóstico documentado na v08).
- **v08:** mosaico **global determinístico** por **mediana** das observações do
  bioma; `DN ≤ 0` mascarado como **nodata**; máscara `palsar_nodata` exclui do
  treino footprints sem dado de SAR.
- Lição registrada: covariável SAR deve ser um mosaico global determinístico,
  nunca amostragem arbitrária por célula.