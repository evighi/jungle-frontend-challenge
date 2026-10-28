- Tailwind CSS 4 e componentes baseados em shadcn/ui/Radix UI.
# Kurio — Marketplace de NFTs

Implementação frontend de um marketplace demonstrativo de NFTs para o desafio técnico Jungle Gaming. A aplicação permite explorar um catálogo, selecionar edições, gerenciar favoritos e carrinho, cadastrar conta/carteiras e simular uma compra com cotação e acompanhamento de pedido.

> **Ambiente demonstrativo:** o REST é interceptado pelo Mock Service Worker (MSW), os dados ficam no armazenamento do navegador e o pagamento/blockchain são simulados. Não existe transação com criptomoedas, banco de dados remoto nem backend financeiro real. Não utilize dados ou credenciais reais.

## Tecnologias

- React 19, TypeScript 6 e Vite 8.
- TanStack Router para rotas e parâmetros de busca na URL.
- TanStack Query para consultas, mutations, cache e invalidação.
- Axios para chamadas REST (`/api`).
- MSW 3 para handlers HTTP e cenários de falha.
- Socket.IO (`socket.io-client` no navegador e `socket.io` no servidor local) para eventos reais por WebSocket.
- Tailwind CSS 4 e componentes baseados em shadcn/ui/Radix UI.
- Playwright para testes E2E, acessibilidade básica e regressão visual.
- Lighthouse CI para auditorias de qualidade.

## Pré-requisitos

- Node.js e npm compatíveis com as versões declaradas no `package.json` (use uma versão atual/LTS de Node).
- Navegador Chromium instalado para os testes Playwright, ou instale-o conforme o comando abaixo.

## Instalação e execução

```bash
npm ci
npx playwright install chromium
```

Desenvolvimento (Vite, padrão na porta 5173):

```bash
npm run dev
```

Build otimizado e preview local (porta 4173):

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

Servidor Node/Express para demonstração/publicação (porta 3000, ou `PORT` definido pelo provedor):

```bash
npm run build
npm start
```

Abra o endereço informado pelo terminal. Em desenvolvimento e preview, o plugin do Vite disponibiliza o Socket.IO no mesmo host; no modo `npm start`, o servidor Express entrega `dist/` e o Socket.IO.

### Configuração dos mocks

- Por padrão, `VITE_ENABLE_MOCKS` diferente de `false` ativa o MSW no navegador, inclusive no build de demonstração.
- `VITE_ENABLE_MOCKS=false` desativa a interceptação HTTP; nesse caso, é necessário fornecer uma API real compatível com `/api`, que **não** faz parte deste repositório.
- O service worker fica em `public/mockServiceWorker.js` e os handlers em `src/mocks/`.
- O estado demonstrativo é mantido no `localStorage` do navegador. Um navegador/perfil limpo recupera as fixtures iniciais. Limpar os dados deste site redefine também as contas, carteiras, pedidos e preferências locais; faça isso somente em um ambiente de teste.

### Contas demonstrativas

| Conta | E-mail | Senha |
| --- | --- | --- |
| Ana Silva | `ana@kurio.test` | `Demo1234!` |
| Pedro Costa | `pedro@kurio.test` | `Demo1234!` |

As senhas demonstrativas são usadas somente para teste. O mock armazena derivação SHA-256 com salt em vez da senha em texto puro, mas **não** deve ser tratado como serviço de autenticação de produção.

### Cupom e redes

- `KURIO10`: desconto demonstrativo de 10% na cotação.
- `OLD10`: código demonstrativo expirado.
- Redes de cotação: Ethereum e Polygon. Taxas, carteiras, conexão e pagamentos são simulados.
- Valores de ETH trafegam como strings decimais; o mock de cotação converte para unidades inteiras (`bigint`) antes de calcular totais.

## Telas e rotas

| URL | Funcionalidade |
| --- | --- |
| `/` | Destaques, catálogo, busca, categoria, ordenação e paginação |
| `/nft/$nftId` | Galeria, edições, quantidade, favorito e adição ao carrinho |
| `/carrinho` | Quantidades, remoção, cupom, rede e cotação |
| `/login` | Autenticação |
| `/cadastro` | Cadastro |
| `/perfil` | Dados do colecionador, avatar por URL e senha |
| `/carteiras` | Cadastro, seleção da principal e conexão simulada |
| `/checkout?quoteId=...` | Revisão de cotação, carteira e confirmação do pedido |
| `/pedido/$orderId` | Acompanhamento do status, itens e resumo financeiro |

As buscas e os filtros do catálogo são codificados nos parâmetros de URL. As telas restritas dependem de sessão no mock; consultas REST protegidas verificam o token.

## Como demonstrar uma compra

1. Abra o catálogo, entre nos detalhes de um NFT e escolha uma edição e quantidade.
2. Adicione ao carrinho. É possível adicionar itens antes de criar uma conta; o carrinho visitante é transferido ao autenticar.
3. Entre com uma conta demonstrativa.
4. Acesse **Carteiras**, cadastre uma carteira da rede desejada e simule a conexão.
5. No carrinho, selecione a rede e, opcionalmente, aplique `KURIO10`.
6. Continue para o checkout com a cotação válida e selecione uma carteira conectada compatível.
7. Confirme o pedido e acompanhe o status em `/pedido/$orderId`.
8. A simulação parte de `PENDING` e depois termina em `CONFIRMED` ou `FAILED`; somente a confirmação efetiva desconta o estoque e atualiza o carrinho.

Uma cotação expira após cinco minutos. Um pedido possui chave de idempotência, para que a mesma tentativa não gere compras duplicadas. A escolha do resultado do pagamento pertence às regras do mock.

## API simulada: contratos resumidos

Todos os endpoints abaixo estão sob `/api`. As chamadas são feitas via Axios, exceto as pontes internas utilizadas para propagação de eventos de teste.

| Método e recurso | Objetivo |
| --- | --- |
| `GET /nfts` | Catálogo (`search`, `category`, `sort`, `page`) |
| `GET /nfts/:id` | Detalhe/edições/estoque |
| `POST /auth/register` | Criar conta |
| `POST /auth/login` | Autenticar |
| `GET /auth/session` | Recuperar sessão |
| `POST /auth/logout` | Encerrar sessão |
| `GET /favorites`, `POST/DELETE /favorites/:nftId` | Favoritos |
| `GET /cart` | Consultar carrinho |
| `POST /cart/items` | Adicionar NFT/edição |
| `PATCH/DELETE /cart/items/:nftId` | Alterar/remover item (edição opcional) |
| `POST /cart/merge` | Transferir carrinho visitante |
| `POST /quote`, `GET /quote/:quoteId` | Calcular/recuperar cotação |
| `POST /orders`, `GET /orders/:orderId` | Criar/consultar pedido e status |
| `GET/PATCH /profile`, `PATCH /profile/password` | Perfil e senha |
| `GET/POST /wallets`, `PATCH /wallets/:walletId` | Carteiras |
| `POST /wallets/:walletId/connection` | Conectar/desconectar (simulado) |

Para autenticação, o interceptor Axios envia `Authorization: Bearer <token>` quando há token local. Endpoints podem devolver erros de validação, não autorizado, não encontrado, conflito ou falha transitória. Os tipos de payload estão em `src/api/` e os handlers em `src/mocks/`.

### Exemplo de cotação

```json
{
  "network": "ethereum",
  "couponCode": "KURIO10"
}
```

O resultado contém `quoteId`, itens com preços por edição, `subtotalEth`, `discountEth`, `networkFeeEth`, `totalEth` e `expiresAt`.

### Exemplo de criação de pedido

```json
{
  "quoteId": "<quote-id-retornado-pela-api>",
  "idempotencyKey": "<uuid-da-tentativa>",
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

Reutilizar a mesma chave na mesma tentativa retorna o pedido correspondente. A chave reaproveitada com conteúdo divergente é tratada como conflito pelo mock.

## Falhas simuladas

O arquivo `src/mocks/scenarios.ts` lê a chave `kurio:mock-scenario:v1` do `localStorage`. **Atualmente essas condições são aplicadas ao catálogo e ao detalhe de NFTs**, não indiscriminadamente a todos os endpoints.

Exemplo para executar no console do navegador e recarregar a página:

```js
localStorage.setItem(
  "kurio:mock-scenario:v1",
  JSON.stringify({ delayMs: 2000, failure: "none" })
);
```

Valores aceitos para `failure`: `none`, `http500` e `network`; `delayMs` é limitado a 30.000 ms. Para restaurar o cenário padrão:

```js
localStorage.removeItem("kurio:mock-scenario:v1");
location.reload();
```

Os demais handlers implementam validações próprias de autenticação, cupom, estoque, carteira e pedido. Os cenários avançados de respostas fora de ordem e timeout após persistência do pedido ainda precisam de implementação/testes específicos antes de afirmar cobertura integral do enunciado.

## Tempo real

O navegador usa `socket.io-client` via WebSocket (`/socket.io`), no mesmo domínio da aplicação. O servidor de desenvolvimento/preview utiliza o plugin em `vite.config.ts`; a distribuição Node utiliza `server.mjs`.

- `nft.updated` (`nftId`, `version`): invalida consultas do catálogo, detalhe e carrinho/cotação para obter o estado atualizado via REST.
- `order.updated` (`orderId`, `version`): atualiza o acompanhamento de pedidos inscritos por `order.watch`/`order.unwatch`.
- O cliente ignora eventos antigos ou repetidos por versão em seus listeners e sincroniza recursos quando a conexão retorna.

**Limite conhecido:** a ponte de eventos atual conecta handlers MSW a um servidor Socket.IO verdadeiro por rotas internas `__mock/realtime/*`; não é uma implementação baseada em `@mswjs/socket.io-binding`. O isolamento de salas e a reconciliação precisam ser validados nos cenários avançados do desafio. Consulte `ARCHITECTURE.md`.

## Verificações

```bash
npm run lint
npm run build
npx playwright test
```

Testes específicos:

```bash
npx playwright test tests/marketplace.spec.ts tests/editions.spec.ts
npx playwright test tests/auth-cart.spec.ts tests/quote.spec.ts tests/orders.spec.ts
npx playwright test tests/network-failures.spec.ts tests/realtime.spec.ts
npx playwright test tests/accessibility.spec.ts
npx playwright test tests/tablet.spec.ts --project=desktop
```

Playwright utiliza Chromium com projetos `desktop` (1440 × 900) e `mobile` (390 × 844); o teste de tablet modifica o viewport para 768 × 1024 e executa pelo projeto desktop. O runner inicia `npm run preview` na porta 4173 quando necessário. Relatórios HTML são produzidos pelo Playwright; traces e screenshots são preservados em caso de falha.

Os baselines visuais versionados cobrem Home, detalhes, carrinho, checkout e confirmação. Se houver alteração visual intencional, revise a página antes de executar `--update-snapshots`.

### Lighthouse

Com o build e preview de produção ativos:

```bash
npx lhci collect
npx lhci upload --target=filesystem --outputDir=./reports/lighthouse/mobile
```

Para desktop:

```bash
npx lhci collect --collect.settings.preset=desktop
npx lhci upload --target=filesystem --outputDir=./reports/lighthouse/desktop
```

O arquivo `lighthouserc.cjs` define as URLs (`/` e `/nft/1`) e três repetições por URL. As medianas, condições e métricas estão em `docs/PERFORMANCE.md`; as 12 medições finais, em HTML e JSON, estão em `reports/lighthouse/final/`.

## Organização do código

```text
src/
  api/            # Axios, tipos e contratos REST
  components/     # UI reutilizável, layout, galeria e detalhes
  mocks/          # Handlers MSW, fixtures e persistência local
  pages/          # Telas do marketplace
  realtime/       # Cliente Socket.IO e hooks de sincronização
  main.tsx        # Bootstrap do MSW, Query e Router
  router.tsx      # Árvore de rotas e validação da busca
tests/            # Cenários E2E e baselines visuais
docs/             # Relatórios e decisões de projeto
server.mjs        # Servidor Express + Socket.IO de produção
vite.config.ts    # Configuração Vite + Socket.IO para dev/preview
```

Veja [ARCHITECTURE.md](./ARCHITECTURE.md) para fluxo de dados, cache, persistência, real-time e decisões técnicas.

## Limitações e pendências para a entrega

- Checkout atual ainda não possui todos os campos de dados do colecionador previstos no layout de referência.
- A tela do pedido exibe ID e resumo financeiro, mas não um identificador/hash de transação blockchain simulada.
- O cenário genérico de falhas MSW se aplica principalmente a leituras de NFTs; timeout após persistência, resposta fora de ordem e controles ampliados precisam de cobertura específica.
- A ponte de Socket.IO usa um servidor de demonstração; não substitui autorização de eventos em um backend de produção.
- A validação visual em tablet e a comparação final contra o Figma precisam de revisão manual complementar.
- Não há blockchain real, custódia de ativos ou garantia de persistência compartilhada entre dispositivos.

Essas limitações são transparentes para o avaliador; não representam funcionalidades que devam ser consideradas concluídas sem implementação e testes.
