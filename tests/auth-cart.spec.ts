import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "Demo1234!";

async function login(
    page: Page,
    email: string
) {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(PASSWORD);

    await page
        .getByRole("button", { name: "Entrar", exact: true })
        .click();
}

async function logout(page: Page) {
    await page
        .getByRole("button", { name: "Sair da conta" })
        .click();

    await expect(
        page.getByRole("link", { name: "Entrar" })
    ).toBeVisible();
}

async function addNFT(page: Page, id: string) {
    await page.goto(`/nft/${id}`);

    await page
        .getByRole("button", { name: "Adicionar ao carrinho" })
        .click();

    await expect(page).toHaveURL(/\/carrinho/);
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const initialized = sessionStorage.getItem(
            "kurio:e2e-initialized"
        );

        if (initialized) return;

        localStorage.removeItem("kurio:auth-token");
        localStorage.removeItem("kurio:guest-cart:v1");
        localStorage.removeItem("kurio:user-cart:user-1");
        localStorage.removeItem("kurio:user-cart:user-2");
        localStorage.removeItem("kurio:sessions:v1");

        sessionStorage.setItem(
            "kurio:e2e-initialized",
            "true"
        );
    });

    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", {
            name: "Todos os NFTs",
        })
    ).toBeVisible();
});

test(
    "deve transferir carrinho visitante e manter isolamento entre usuários",
    async ({ page }) => {
        // 1. Visitante adiciona Emerald Ape.
        await addNFT(page, "1");

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        // 2. Ana faz login.
        await login(page, "ana@kurio.test");

        await expect(
            page.getByRole("button", { name: "Sair da conta" })
        ).toBeVisible();

        // 3. Emerald Ape deve ter sido transferido para Ana.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 1 itens",
            })
        ).toBeVisible();

        // 4. Ana adiciona Sage Nomad ao próprio carrinho.
        await addNFT(page, "2");

        await expect(
            page.getByRole("heading", { name: "Sage Nomad" })
        ).toBeVisible();

        // 5. Agora Ana deve ter dois NFTs.
        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 2 itens",
            })
        ).toBeVisible();

        // 6. Verifica persistência após refresh.
        await page.reload();

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", { name: "Sage Nomad" })
        ).toBeVisible();

        // 7. Ana faz logout.
        await logout(page);

        // 8. Carrinho visitante deve estar vazio após transferência.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", {
                name: "Seu carrinho está vazio",
            })
        ).toBeVisible();

        // 9. Pedro faz login.
        await login(page, "pedro@kurio.test");

        await expect(
            page.getByRole("button", { name: "Sair da conta" })
        ).toBeVisible();

        // 10. Pedro não pode acessar os NFTs da Ana.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", {
                name: "Seu carrinho está vazio",
            })
        ).toBeVisible();

        // 11. Pedro faz logout.
        await logout(page);

        // 12. Ana entra novamente.
        await login(page, "ana@kurio.test");

        await page.goto("/carrinho");

        // 13. Ana recupera os dois NFTs.
        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", { name: "Sage Nomad" })
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 2 itens",
            })
        ).toBeVisible();
    }
);

test(
    "deve transferir carrinho visitante ao criar uma conta",
    async ({ page }) => {
        // E-mail exclusivo para evitar conflitos entre execuções.
        const email = `teste-${crypto.randomUUID()}@kurio.test`;

        // 1. Visitante adiciona Emerald Ape.
        await addNFT(page, "1");

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        // 2. Visitante acessa a página de cadastro.
        await page.goto("/cadastro");

        // 3. Preenche os dados da nova conta.
        await page
            .getByLabel("Nome completo")
            .fill("Usuário Teste");

        await page
            .getByLabel("E-mail")
            .fill(email);

        await page
            .getByLabel("Senha", { exact: true })
            .fill(PASSWORD);

        await page
            .getByLabel("Confirmar senha")
            .fill(PASSWORD);

        // 4. Finaliza o cadastro.
        await page
            .getByRole("button", { name: "Criar conta" })
            .click();

        // 5. Confirma que está autenticado.
        await expect(
            page.getByRole("button", { name: "Sair da conta" })
        ).toBeVisible();

        // 6. Verifica se o NFT foi transferido.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 1 itens",
            })
        ).toBeVisible();

        // 7. Atualiza a página e confirma a persistência.
        await page.reload();

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        // 8. Faz logout.
        await logout(page);

        // 9. O carrinho visitante deve estar vazio.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", {
                name: "Seu carrinho está vazio",
            })
        ).toBeVisible();

        // 10. Faz login na conta recém-criada.
        await login(page, email);

        await expect(
            page.getByRole("button", { name: "Sair da conta" })
        ).toBeVisible();

        // 11. Verifica que o NFT continua na conta.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 1 itens",
            })
        ).toBeVisible();
    }
);

test(
    "não deve duplicar itens ao repetir a transferência do carrinho",
    async ({ page }) => {
        // 1. Visitante adiciona Emerald Ape.
        await addNFT(page, "1");

        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        // 2. Faz login na conta da Ana.
        await login(page, "ana@kurio.test");

        await expect(
            page.getByRole("button", { name: "Sair da conta" })
        ).toBeVisible();

        // 3. Confirma a primeira transferência.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 1 itens",
            })
        ).toBeVisible();

        // 4. Repete a chamada da API de transferência.
        const firstRetry = await page.evaluate(async () => {
            const token = localStorage.getItem("kurio:auth-token");

            const response = await fetch("/api/cart/merge", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        });

        // 5. API deve responder com sucesso.
        expect(firstRetry.status).toBe(200);

        // Continua existindo apenas um item.
        expect(firstRetry.data.totalItems).toBe(1);

        // 6. Repete mais uma vez.
        const secondRetry = await page.evaluate(async () => {
            const token = localStorage.getItem("kurio:auth-token");

            const response = await fetch("/api/cart/merge", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        });

        expect(secondRetry.status).toBe(200);
        expect(secondRetry.data.totalItems).toBe(1);

        // 7. Atualiza a página.
        await page.reload();

        // 8. Confirma que a quantidade não foi duplicada.
        await expect(
            page.getByRole("heading", { name: "Emerald Ape" })
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 1 itens",
            })
        ).toBeVisible();
    }
);

test(
    "deve somar quantidades ao transferir NFT já existente no carrinho",
    async ({ page }) => {
        // 1. Prepara o carrinho da Ana com 2 Emerald Apes.
        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:user-cart:user-1",
                JSON.stringify([
                    {
                        nftId: "1",
                        quantity: 2,
                    },
                ])
            );
        });

        // 2. Visitante adiciona mais 1 Emerald Ape.
        await addNFT(page, "1");

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 1 itens",
            })
        ).toBeVisible();

        // 3. Faz login na conta da Ana.
        await login(page, "ana@kurio.test");

        await expect(
            page.getByRole("button", {
                name: "Sair da conta",
            })
        ).toBeVisible();

        // 4. Abre o carrinho da Ana.
        await page.goto("/carrinho");

        // 5. O Emerald Ape deve continuar aparecendo.
        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible();

        // 6. A quantidade total deve ser 3.
        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 3 itens",
            })
        ).toBeVisible();

        // 7. Atualiza a página.
        await page.reload();

        // 8. A quantidade deve permanecer em 3.
        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 3 itens",
            })
        ).toBeVisible();

        // 9. Repete a transferência pela API.
        const result = await page.evaluate(async () => {
            const token = localStorage.getItem("kurio:auth-token");

            const response = await fetch("/api/cart/merge", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        });

        expect(result.status).toBe(200);
        expect(result.data.totalItems).toBe(3);

        // 10. Confirma que o carrinho visitante foi limpo.
        const guestCart = await page.evaluate(() => {
            return localStorage.getItem("kurio:guest-cart:v1");
        });

        expect(guestCart).toBeNull();
    }
);

test(
    "deve preservar os carrinhos quando a transferência exceder o estoque",
    async ({ page }) => {
        // 1. Prepara o carrinho da Ana com 8 Emerald Apes.
        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:user-cart:user-1",
                JSON.stringify([
                    {
                        nftId: "1",
                        quantity: 8,
                    },
                ])
            );
        });

        // 2. Visitante adiciona mais um Emerald Ape.
        await addNFT(page, "1");

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 1 itens",
            })
        ).toBeVisible();

        // 3. Faz login na conta da Ana.
        await login(page, "ana@kurio.test");

        // 4. O login deve funcionar.
        await expect(
            page.getByRole("button", {
                name: "Sair da conta",
            })
        ).toBeVisible();

        // 5. A transferência deve apresentar erro de estoque.
        await expect(
            page.getByRole("alert")
        ).toContainText("Estoque insuficiente");

        // 6. Confirma que a API continua retornando HTTP 409.
        const response = await page.evaluate(async () => {
            const token = localStorage.getItem("kurio:auth-token");

            const result = await fetch("/api/cart/merge", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return {
                status: result.status,
                data: await result.json(),
            };
        });

        expect(response.status).toBe(409);

        expect(response.data.message).toContain(
            "Estoque insuficiente"
        );

        // 7. Verifica que o carrinho da Ana não foi alterado.
        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 8 itens",
            })
        ).toBeVisible();

        // 8. Confirma que o visitante manteve seu item.
        const guestCart = await page.evaluate(() => {
            const stored = localStorage.getItem(
                "kurio:guest-cart:v1"
            );

            return stored ? JSON.parse(stored) : [];
        });

        expect(guestCart).toEqual([
            {
                nftId: "1",
                quantity: 1,
            },
        ]);

        // 9. Confirma novamente o carrinho da Ana no armazenamento.
        const userCart = await page.evaluate(() => {
            const stored = localStorage.getItem(
                "kurio:user-cart:user-1"
            );

            return stored ? JSON.parse(stored) : [];
        });

        expect(userCart).toEqual([
            {
                nftId: "1",
                quantity: 8,
            },
        ]);
    }
);

test(
  "deve bloquear acesso ao carrinho com sessão inválida",
  async ({ page }) => {
    // 1. Faz login na conta da Ana.
    await login(page, "ana@kurio.test");

    await expect(
      page.getByRole("button", {
        name: "Sair da conta",
      })
    ).toBeVisible();

    // 2. Adiciona um NFT ao carrinho privado.
    await addNFT(page, "1");

    await expect(
      page.getByRole("heading", {
        name: "Emerald Ape",
      })
    ).toBeVisible();

    // 3. Simula uma requisição com token inválido.
    const result = await page.evaluate(async () => {
      const response = await fetch("/api/cart", {
        headers: {
          Authorization: "Bearer token-invalido-123",
        },
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    });

    // 4. A API deve impedir o acesso.
    expect(result.status).toBe(401);

    expect(result.data.message).toContain(
      "Sessão inválida ou expirada"
    );

    // 5. O carrinho privado não deve ter sido alterado.
    const storedCart = await page.evaluate(() => {
      const stored = localStorage.getItem(
        "kurio:user-cart:user-1"
      );

      return stored ? JSON.parse(stored) : [];
    });

    expect(storedCart).toEqual([
      {
        nftId: "1",
        quantity: 1,
      },
    ]);
  }
);