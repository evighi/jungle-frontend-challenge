# Auditoria de performance — Kurio

## Ambiente

- Data: 28/10/2026
- Sistema operacional: Windows
- Navegador: Headless Chrome 155
- Lighthouse: 12.6.1
- Aplicação: build de produção do Vite
- Servidor local: http://127.0.0.1:4173
- Cenário: mocks padrão

## Páginas auditadas

- Página inicial: /
- Detalhes do NFT: /nft/1

Cada página foi auditada três vezes em mobile e
três vezes em desktop.

Os valores apresentados são as medianas das
três execuções correspondentes.

## Pontuações

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Início | Mobile | 90 | 95 | 100 | 100 |
| NFT | Mobile | 90 | 96 | 100 | 100 |
| Início | Desktop | 100 | 95 | 100 | 100 |
| NFT | Desktop | 100 | 96 | 100 | 100 |

## Métricas

| Página | Perfil | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: |
| Início | Mobile | 3,24 s | 0 | 25 ms |
| NFT | Mobile | 3,22 s | 0 | 15,5 ms |
| Início | Desktop | 0,72 s | 0 | 0 ms |
| NFT | Desktop | 0,74 s | 0 | 0 ms |

## Metas do desafio

- Performance >= 90
- Accessibility >= 95
- Best Practices >= 95
- SEO >= 90

Todas as metas foram atingidas nas quatro
combinações de página e dispositivo.

## Observações

A performance mobile atingiu a meta mínima de 90.

As primeiras auditorias identificaram ausência
de meta description e robots.txt inválido.

Após as correções, o SEO atingiu 100 pontos
em ambas as páginas e dispositivos.

Os relatórios completos HTML e JSON devem
acompanhar as evidências da entrega.

## Reprodução

Primeiro:

npm run build

Em outro terminal:

npm run preview -- --host 127.0.0.1

Auditoria mobile:

npx lhci collect

Auditoria desktop:

npx lhci collect --collect.settings.preset=desktop

Para exportar os resultados:

npx lhci upload --target=filesystem --outputDir=./reports/lighthouse/resultado