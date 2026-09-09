# v03 — Gate offline

A análise offline recebe os CSVs/Assets da matriz v03 e deve registrar:

- tipos e valores ausentes;
- redundância e correlação;
- validação espacial;
- comparação RF/GBM/SVR;
- champion, métricas e configuração do modelo.

Somente o champion validado deve ser usado em `3_model_training` e
`4_spatial_prediction`.
