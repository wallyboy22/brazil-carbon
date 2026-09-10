# v07 · gate offline do Pantanal Forest (`2_3_gcn`)

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
| 01 | `2_3_1_gcn_cell01_autentication_drive.py` | autentica Earth Engine e monta o Google Drive | — |
| 02 | `2_3_2_gcn_cell02_diagnostico.py` | diagnóstico da matriz: distribuição do alvo, correlação das bandas, resíduo×agbd_se, Moran's I + variograma | `f1..f4_*.png` |
| 03 | `2_3_3_gcn_cell03_cv_regularizacao.py` | CV **espacial em blocos**, RF×GBM×SVR, curva de aprendizado, varredura `minLeafPopulation`, avaliação log(1+agbd) com fator de Duan | `f5..f8_*.png` + `gate_state.json` |
| 04 | `2_3_4_gcn_cell04_thinning_figuras.py` | thinning OFF-LINE em grade 60–90 m (mantém o footprint de menor `agbd_se`), figuras antes×depois, exporta a matriz thinned | `f9/f10_*.png` + `samples_thinned_v07.csv` |
| 05 | `2_3_5_gcn_cell05_champion.py` | decide `log_target`/`minLeafPopulation`, fixa o ensemble, importância de permutação, grava o **champion** | `f11_*.png` + `champion.json` |
| 06 | `2_3_6_gcn_cell06_relatorio.py` | lê `gate_state.json` + `champion.json` e gera o **relatório de recomendações** (tabela decisória MUDAR/MANTER por parâmetro do `0_contract.js`) | `relatorio_recomendacoes.md` |

## Estrutura de pastas no Drive

O `2_2_toDrive_matrix.js` exporta os CSVs para **uma pasta única** `MyDrive/mapbiomas_carbono/`
(no GEE, `folder:` não cria subpastas). As células do `2_3_gcn` tratam essa pasta como a
**raiz do balde**: `CONF["DRIVE_ROOT"]` aponta para ela, os CSVs são lidos direto
(`MATRIX_DIR = ""`) e as figuras/artefatos vão para a subpasta `figures/` criada pelo
próprio Python. Para usar outra pasta, ajuste `CONF["DRIVE_ROOT"]` na célula 00 e o
`DRIVE_ROOT` do `2_2_toDrive_matrix.js`.

## Biblioteca de figuras

Todas as figuras são salvas na subpasta `figures/` da pasta de output no Drive
(`CONF["DRIVE_ROOT"]/figures/`), espelhando a pasta `figures/` deste repositório. Após a
execução, baixe/exporte as figuras para cá:

```
v07/2_3_gcn/figures/f1_alvo_distribuicao.png
v07/2_3_gcn/figures/f2_correlacao_bandas.png
... (+ diagnostico.json, gate_state.json, champion.json, relatorio_recomendacoes.md)
```

## Do champion para o modelo

1. Abra `champion.json` (gerado pela célula 05).
2. Copie os valores para o topo de `v07/0_contract.js`
   (`MIN_LEAF_POP`, `VARIABLES_PER_SPLIT`, `LOG_TARGET`, `LOG_OFFSET`,
   `SMEAR_FACTOR`, `ENSEMBLE`).
3. Rode no GEE: `3_model_training.js` → `4_spatial_prediction.js`.

## Configuração rápida (célula `2_3_0_gcn_cell00_util.py`)

| Chave | Padrão | O quê |
|-------|--------|-------|
| `BLOCK_M` | 3000 m | blocos espaciais da CV (teste 1–5 km) |
| `THIN_M` | 75 m | grade do thinning (teste 60–90 m) |
| `MIN_LEAF_CANDIDATES` | `[5,10,20,30]` | varredura `minLeafPopulation` |
| `N_MEMBERS` | 5 | membros do ensemble |
| `BAND_FRACTION` | 0.8 | ~80% das bandas por membro |

## Próximos passos (fora do escopo desta rodada)

- **Quantificação de toneladas por classe de cobertura**: repetir a estratégia
  desta célula — exportar a mesma matriz, somar `agbd` (e incerteza por
  propagação do ensemble) dentro de cada classe C11 — como script espelho
  `toAsset/toDrive` do 2_2.
- GEDI footprints dos demais `TRAIN_YEARS` (2019–2022): nova pipeline que
  extrai o footprint por ano antes de re-exportar a matriz.