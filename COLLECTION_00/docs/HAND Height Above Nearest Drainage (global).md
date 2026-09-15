# HAND — Height Above Nearest Drainage (global)

Distância vertical de cada pixel até o curso d'água mais próximo — proxy de
umidade/geomorfologia do terreno.

## Dados

- **Asset GEE:** `users/gena/global-hand/hand-100`
- **Produtor:** Gennadii Donchyts (Google) — HAND global
- **Versão:** 1 (resolução 100 m)
- **Link oficial:** https://developers.google.com/earth-engine/datasets/catalog/users_gena_global-hand_hand-100

## Uso no projeto

- **Papel:** topografia relativa à drenagem.
- **Bandas (2):** HAND contínuo (`Float32`) + **classes geomorfológicas 1–4** (`Uint8`).
- **Onde entra:** `forest/covariate/_hand.js` (`since_v01`).

## Notas do projeto

- Classes geomorfológicas 1–4 entram como variável categórica; o HAND contínuo,
  como variável numérica.