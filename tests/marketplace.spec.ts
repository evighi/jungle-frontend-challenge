import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const initialized = sessionStorage.getItem(
            "kurio:e2e-initialized"
        );

        if (initialized) return;

        localStorage.removeItem("kurio:guest-cart:v1");

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

test("deve carregar o catálogo de NFTs", async ({ page }) => {
    await page.goto("/");

    await expect(
        page.getByRole("heading", { name: "Todos os NFTs" })
    ).toBeVisible();

    await expect(
        page.getByRole("heading", { name: "Emerald Ape" })
    ).toBeVisible();
});

test("deve buscar um NFT e preservar a busca após refresh", async ({
    page,
}) => {
    await page.goto("/");

    const search = page.getByRole("textbox", {
        name: "Buscar NFTs",
    });

    await search.fill("Emerald");

    await expect(
        page.getByRole("heading", { name: "Emerald Ape" })
    ).toBeVisible();

    await expect(page).toHaveURL(/search=Emerald/);

    await page.reload();

    await expect(search).toHaveValue("Emerald");

    await expect(
        page.getByRole("heading", { name: "Emerald Ape" })
    ).toBeVisible();
});

test("deve apresentar estado vazio na busca", async ({ page }) => {
    await page.goto("/");

    await page
        .getByRole("textbox", { name: "Buscar NFTs" })
        .fill("NFT-INEXISTENTE-123");

    await expect(
        page.getByText("Nenhum NFT encontrado.")
    ).toBeVisible();
});

test("deve abrir os detalhes de um NFT", async ({ page }) => {
    await page.goto("/nft/1");

    await expect(
        page.getByRole("heading", { name: "Emerald Ape" })
    ).toBeVisible();

    await expect(
        page.getByTestId("nft-selected-price")
    ).toHaveText("0.85 ETH");
});

test("deve tratar um NFT inexistente", async ({ page }) => {
    await page.goto("/nft/999");

    await expect(
        page.getByRole("heading", {
            name: "NFT não encontrado",
        })
    ).toBeVisible();
});

test("deve adicionar ao carrinho e persistir após refresh", async ({
    page,
}) => {
    // 1. Abre os detalhes do NFT
    await page.goto("/nft/1");

    // 2. Adiciona ao carrinho
    await page
        .getByRole("button", {
            name: "Adicionar ao carrinho",
        })
        .click();

    // 3. Confirma a navegação para o carrinho
    await expect(page).toHaveURL(/\/carrinho/);

    // 4. Confirma que o NFT foi adicionado
    await expect(
        page.getByRole("heading", {
            name: "Emerald Ape",
        })
    ).toBeVisible();

    // 5. Confirma que temos exatamente 1 item
    await expect(
        page.getByRole("link", {
            name: "Abrir carrinho com 1 itens",
        })
    ).toBeVisible();

    // 6. Atualiza a página
    await page.reload();

    // 7. Confirma que o NFT continua no carrinho
    await expect(
        page.getByRole("heading", {
            name: "Emerald Ape",
        })
    ).toBeVisible();

    // 8. Confirma que a quantidade foi preservada
    await expect(
        page.getByRole("link", {
            name: "Abrir carrinho com 1 itens",
        })
    ).toBeVisible();

    // 9. Aumenta a quantidade
    await page
        .getByRole("button", {
            name: "Aumentar quantidade de Emerald Ape",
        })
        .click();

    // 10. Agora sim, confirma os 2 itens
    await expect(
        page.getByRole("link", {
            name: "Abrir carrinho com 2 itens",
        })
    ).toBeVisible();

    // 11. Remove o NFT
    await page
        .getByRole("button", {
            name: "Remover Emerald Ape",
        })
        .click();

    // 12. Confirma que o carrinho ficou vazio
    await expect(
        page.getByRole("heading", {
            name: "Seu carrinho está vazio",
        })
    ).toBeVisible();

    // 13. Confirma que o contador voltou para zero
    await expect(
        page.getByRole("link", {
            name: "Abrir carrinho com 0 itens",
        })
    ).toBeVisible();
});

test(
    "não deve recomendar o próprio NFT ao navegar entre produtos",
    async ({ page }) => {
        await page.goto("/nft/1");

        await expect(
            page.getByRole("heading", {
                name: "Mais desta coleção",
            })
        ).toBeVisible();

        const recommendations = page.getByRole(
            "region",
            {
                name: "Mais desta coleção",
            }
        );

        await expect(
            recommendations.getByText("Emerald Ape")
        ).toHaveCount(0);

        await page.goto("/nft/2");

        await expect(
            recommendations.getByText("Sage Nomad")
        ).toHaveCount(0);

        await expect(
            recommendations.getByText("Emerald Ape")
        ).toBeVisible();
    }
);