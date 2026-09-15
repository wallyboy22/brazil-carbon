# MAPBIOMAS CARBONO

Scripts do **Google Earth Engine** para o mapeamento de **carbono acima do solo (AGC)** do MapBiomas — Coleção 0 (amostras GEDI) e experimentos.

## Relação com o repositório GEE (espelho)

> Este repositório é o **irmão gêmeo (espelho / backup)** do repositório oficial hospedado no **Google Earth Engine**:
>
> | Qual | Onde | Papel |
> |---|---|---|
> | **Fonte da verdade** | `https://earthengine.googlesource.com/users/workspaceipam/mapbiomas-carbono` | Repositório onde o código **vive e roda** no GEE |
> | **Este repositório** | `https://github.com/wallyboy22/brazil-carbon` | **Espelho/backup** para compartilhamento fácil |
>
> O GEE é o repositório canônico — edições e commits acontecem lá; este espelho apenas replica o conteúdo.

## ⚠️ Atenção à estrutura de `require()` — dependência do repositório GEE original

Os scripts usam módulos compartilhados via `require()` com caminhos **ancorados no repositório original do GEE**:

```js
// Exemplos reais:
require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/0_contract_stats.js')
require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/forest/statistics/stats_engine.js')
require('users/workspaceipam/mapbiomas-carbono:COLLECTION_00/pantanal/grassland/statistics/stats_engine.js')
```

**Importante para quem clonar este espelho:**

- Esses `require()` só resolvem dentro do GEE com acesso ao repositório
  `users/workspaceipam/mapbiomas-carbono`. Este espelho no GitHub é **somente fonte** (`source`).
- Para **rodar** os scripts em outra conta/projeto:
  - tenha permissão de leitura no repositório GEE original, **ou**
  - copie a pasta `COLLECTION_00/` para seu próprio repositório GEE e
    **reescreva o prefixo** de cada `require()` para `users/<seu-usuario>/<seu-repo>:...`.
- Os scripts também referenciam **assets GEE** (ex.: `projects/mapbiomas-public/...`,
  `projects/ee-ipam/...`, `LARSE/GEDI/...`) que precisam estar disponíveis ao projeto.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `BETA/` | Experimentos e versões beta — `model/`, `mosaicos/` (landtrendr) e `statistics/` (ex.: `toTable-QCN_por_TI`) |
| `COLLECTION_00/` | **Cofre da Coleção 0** — scripts por bioma e pipeline: `cerrado/forest` · `pantanal/{forest,grassland}` · `docs/` (referência de datasets GEDI) |

A **porta de entrada** é o [COLLECTION_00/README.md](COLLECTION_00/README.md) (cofre de conhecimento —
convenções, versões, assets). A referência de datasets externos fica em [COLLECTION_00/docs/](COLLECTION_00/docs/README.md).

## Licença

Ver [LICENSE](LICENSE).