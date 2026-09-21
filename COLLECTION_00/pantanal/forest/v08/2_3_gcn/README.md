# v08 · gate offline do Pantanal Forest (`2_3_gcn`)

**gcn = google collab notebook.** Cada `*.py` é **uma célula de um Colab qualquer** — você
abre um notebook do Google Colab (um em branco ou um próprio) e em cada célula **cola o
conteúdo** do `*.py` do fluxo, na ordem abaixo.

> Não há imports entre as células: a célula 00 (util) carrega `CONF` e as funções
> compartilhadas no namespace do runtime, e as células 01–06 só as usam. Assim não
> existem `import` de módulos próprios (que quebrariam com nomes `2_3_*`).

## Fluxo de execução (ordem)

| Ordem | Arquivo | O que faz | Artefatos gerados |
|-------|---------|-----------|-------------------|
| 00 | `2_3_0_gcn_cell00_util.py` | carrega `CONF` + funções compartilhadas no namespace | nada (configura o runtime) |
| 00b | `2_3_0b_gcn_cell00b_reorganize.py` | (opcional, 1×) reorganiza a raiz **flat** em subpastas de **contexto** `<VERSION>_<SOURCE>` (ex.: `v08_gedi/`, `v08_ifn/`) | — |
| 01 | `2_3_1_gcn_cell01_autentication_drive.py` | autentica Earth Engine e monta o Google Drive | — |
| 02 | `2_3_2_gcn_cell02_diagnostico.py` | diagnóstico da matriz: distribuição do alvo, correlação das bandas, resíduo×agbd_se, Moran's I + variograma | `f1..f4_*.png` |
| 03 | `2_3_3_gcn_cell03_cv_regularizacao.py` | CV **espacial em blocos**, RF×GBM×SVR, curva de aprendizado, varredura `minLeafPopulation`, avaliação log(1+agbd) com fator de Duan | `f5..f8_*.png` + `gate_state.json` |
| 04 | `2_3_4_gcn_cell04_thinning_figuras.py` | thinning OFF-LINE em grade 60–90 m (mantém o footprint de menor `agbd_se`), figuras antes×depois, exporta a matriz thinned | `f9/f10_*.png` + `samples_thinned_<SOURCE>_v08.csv` |
| 05 | `2_3_5_gcn_cell05_champion.py` | decide `log_target`/`minLeafPopulation`, fixa o ensemble, importância de permutação, grava o **champion** | `f11_*.png` + `champion.json` |
| 06 | `2_3_6_gcn_cell06_relatorio.py` | lê `gate_state.json` + `champion.json` e gera o **relatório de recomendações** (tabela decisória MUDAR/MANTER por parâmetro do `0_contract.js`) | `relatorio_recomendacoes.md` |

> **Escopo do gate (validação).** O gate é um passo **offline de validação/decisão**:
> o thinning (célula 04) existe para dar **CV espacial honesta** (quebra autocorrelação)
> e para decidir o champion — **não** alimenta o treino de produção. O
> `3_model_training.js` treina na **matriz completa** (`MATRIX/`), aplicando os
> hiperparâmetros decididos aqui. A coluna `w = 1/agbd_se²` também é **reservada**
> (o GEE não aceita pesos no treino hoje) — fica no CSV para uso offline futuro.

## Estrutura de pastas no Drive

O `2_2_<fonte>_toDrive_matrix.js` (`gedi`/`ifn`) exporta os CSVs para **uma pasta única**
`MyDrive/mapbiomas_carbono/` (no GEE, `folder:` **não** cria subpastas). A subetapa **00b**
(`reorganize_root`) move os arquivos da raiz **flat** para subpastas de **contexto**
`<VERSION>_<SOURCE>`:

```
MyDrive/mapbiomas_carbono/
  v08_gedi/
    agb_matrix_gedi_v08_<cell>_<ano>.csv
    samples_thinned_gedi_v08.csv (+ .note.txt)
    figures/   # f1..f11_*.png, diagnostico.json, gate_state.json, champion.json, relatorio_*.md
  v08_ifn/
    ...
```

As células do `2_3_gcn` resolvem o **contexto** (`<VERSION>_<SOURCE>`) a partir de
`CONF["VERSION"]` + `CONF["SOURCE"]`: `matrix_dir()` = `<contexto>/` e `fig_dir()` =
`<contexto>/figures/`. **Retrocompatível**: sem a reorg (raiz flat), lê a raiz e
seleciona a fonte por `CONF["SOURCE"]`.

> **Fonte de amostra (`CONF["SOURCE"]`)**: `'gedi'` | `'ifn'` — deve casar com o
> `SOURCE` do `0_contract.js`. Se `None`, o `load_matrix()` **deriva
> automaticamente** (com aviso, usando a 1ª fonte disponível) e lê o **contexto
> ativo** + a raiz flat — não quebra por fontes mistas. Defina `SOURCE` (ou rode
> a reorg 00b) para escolher com clareza.

## Biblioteca de figuras

Todas as figuras são salvas na pasta `figures/` do **contexto** no Drive
(`CONF["DRIVE_ROOT"]/<VERSION>_<SOURCE>/figures/`), espelhando a pasta `figures/` deste
repositório. Após a execução, baixe/exporte as figuras para cá:

```
v08/2_3_gcn/figures_<SOURCE>/f1_alvo_distribuicao.png
v08/2_3_gcn/figures_<SOURCE>/f2_correlacao_bandas.png
... (+ diagnostico.json, gate_state.json, champion.json, relatorio_recomendacoes.md)
```

## Do champion para o modelo

1. Abra `champion.json` (gerado pela célula 05).
2. Copie os valores para o topo de `v08/0_contract.js`
   (`MIN_LEAF_POP`, `VARIABLES_PER_SPLIT`, `ENSEMBLE`).
3. Rode no GEE: `3_model_training.js` → `4_spatial_prediction.js`.

## Configuração rápida (célula `2_3_0_gcn_cell00_util.py`)

| Chave | Padrão | O quê |
|-------|--------|-------|
| `VERSION` | `v08` | versão (prefixo do contexto `<VERSION>_<SOURCE>`) |
| `SOURCE` | `None` | `'gedi'` \| `'ifn'`; `None` deriva dos CSVs (obrigatório se houver fontes mistas) |
| `BLOCK_M` | 3000 m | blocos espaciais da CV (teste 1–5 km) |
| `THIN_M` | 75 m | grade do thinning (teste 60–90 m) |
| `MIN_LEAF_CANDIDATES` | `[5,10,20,30]` | varredura `minLeafPopulation` |
| `N_MEMBERS` | 5 | membros do ensemble |
| `BAND_FRACTION` | 0.8 | ~80% das bandas por membro |

## Próximos passos

- **Quantificação de toneladas por classe de cobertura**: repetir a estratégia
  desta célula — exportar a mesma matriz, somar `agbd` (e incerteza por
  propagação do ensemble) dentro de cada classe C11 — como script espelho
  `toAsset/toDrive` do 2_2.
- GEDI footprints dos demais `TRAIN_YEARS` (2019–2022): nova pipeline que
  extrai o footprint por ano antes de re-exportar a matriz.