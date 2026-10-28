import {
    test,
    expect,
    type Page,
} from "@playwright/test";

const PASSWORD = "Demo1234!";

async function loginAsAna(page: Page) {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill("ana@kurio.test");
    await page.getByLabel("Senha").fill(PASSWORD);

    await page
        .getByRole("button", {
            name: "Entrar",
            exact: true,
        })
        .click();

    await expect(
        page.getByRole("button", {
            name: "Sair da conta",
        })
    ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        if (
            sessionStorage.getItem(
                "kurio:editions-e2e-initialized"
            )
        ) {
            return;
        }

        localStorage.removeItem("kurio:auth-token");
        localStorage.removeItem("kurio:sessions:v1");
        localStorage.removeItem("kurio:guest-cart:v1");
        localStorage.removeItem("kurio:user-cart:user-1");
        localStorage.removeItem("kurio:nft-stock:v1");

        sessionStorage.setItem(
            "kurio:editions-e2e-initialized",
            "true"
        );
    });
});

test(
    "deve atualizar preço e estoque ao selecionar edições",
    async ({ page }) => {
        await page.goto("/nft/1");

        const price = page.getByTestId(
            "nft-selected-price"
        );

        const stock = page.getByTestId(
            "nft-selected-stock"
        );

        await expect(price).toHaveText("0.85 ETH");
        await expect(stock).toHaveText(
            "8 unidades disponíveis"
        );

        await page
            .getByRole("button", {
                name: "1/1",
                exact: true,
            })
            .click();

        await expect(price).toHaveText("1.50 ETH");
        await expect(stock).toHaveText(
            "1 unidades disponíveis"
        );

        await expect(
            page.getByRole("button", {
                name: "Aumentar quantidade",
            })
        ).toBeDisabled();

        await page
            .getByRole("button", {
                name: "1/10",
                exact: true,
            })
            .click();

        await expect(price).toHaveText("1.10 ETH");
        await expect(stock).toHaveText(
            "4 unidades disponíveis"
        );

        await page
            .getByRole("button", {
                name: "Aberta",
            })
            .click();

        await expect(price).toHaveText("0.65 ETH");
        await expect(stock).toHaveText(
            "50 unidades disponíveis"
        );
    }
);

test(
    "deve manter diferentes edições separadas no carrinho",
    async ({ page }) => {
        await page.goto("/nft/1");

        await page
            .getByRole("button", {
                name: "1/10",
                exact: true,
            })
            .click();

        await page
            .getByRole("button", {
                name: "Adicionar ao carrinho",
            })
            .click();

        await expect(page).toHaveURL(/\/carrinho/);

        await page.goto("/nft/1");

        await page
            .getByRole("button", {
                name: "1/50",
                exact: true,
            })
            .click();

        await page
            .getByRole("button", {
                name: "Adicionar ao carrinho",
            })
            .click();

        await expect(page).toHaveURL(/\/carrinho/);

        const cart = await page.evaluate(() => {
            const raw = localStorage.getItem(
                "kurio:guest-cart:v1"
            );

            return JSON.parse(raw ?? "[]") as Array<{
                nftId: string;
                editionId?: string;
                quantity: number;
            }>;
        });

        expect(cart).toHaveLength(2);

        expect(cart).toEqual(
            expect.arrayContaining([
                {
                    nftId: "1",
                    editionId: "emerald-1-10",
                    quantity: 1,
                },
                {
                    nftId: "1",
                    quantity: 1,
                },
            ])
        );

        await page.reload();

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toHaveCount(2);
    }
);

test(
    "deve calcular a cotação com preços de edições diferentes",
    async ({ page }) => {
        await loginAsAna(page);

        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:user-cart:user-1",
                JSON.stringify([
                    {
                        nftId: "1",
                        editionId: "emerald-1-10",
                        quantity: 1,
                    },
                    {
                        nftId: "1",
                        editionId: "emerald-open",
                        quantity: 2,
                    },
                ])
            );
        });

        const result = await page.evaluate(async () => {
            const token = localStorage.getItem(
                "kurio:auth-token"
            );

            const response = await fetch("/api/quote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    network: "ethereum",
                }),
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        });

        expect(result.status).toBe(200);
        expect(result.data.items).toHaveLength(2);

        expect(result.data.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    editionId: "emerald-1-10",
                    editionType: "1/10",
                    quantity: 1,
                    unitPriceEth: "1.10",
                    totalPriceEth: "1.1",
                }),
                expect.objectContaining({
                    editionId: "emerald-open",
                    editionType: "OPEN",
                    quantity: 2,
                    unitPriceEth: "0.65",
                    totalPriceEth: "1.3",
                }),
            ])
        );

        // 1.10 + (2 × 0.65) = 2.40 ETH
        expect(result.data.subtotalEth).toBe("2.4");
    }
);

test(
    "deve compartilhar o estoque legado com a edição 1/50",
    async ({ page }) => {
        await page.goto("/nft/1");

        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:nft-stock:v1",
                JSON.stringify({
                    "1": 2,
                })
            );
        });

        await page.reload();

        await expect(
            page.getByTestId("nft-selected-stock")
        ).toHaveText("2 unidades disponíveis");

        await page
            .getByRole("button", {
                name: "1/50",
                exact: true,
            })
            .click();

        await expect(
            page.getByTestId("nft-selected-stock")
        ).toHaveText("2 unidades disponíveis");

        await page
            .getByRole("button", {
                name: "Aumentar quantidade",
            })
            .click();

        await expect(
            page.getByRole("button", {
                name: "Aumentar quantidade",
            })
        ).toBeDisabled();

        await page
            .getByRole("button", {
                name: "1/10",
                exact: true,
            })
            .click();

        await expect(
            page.getByTestId("nft-selected-stock")
        ).toHaveText("4 unidades disponíveis");
    }
);

test(
    "deve confirmar compra de edições diferentes e persistir o estoque",
    async ({ page }) => {
        await loginAsAna(page);

        // Garante um estado conhecido para o teste.
        await page.evaluate(() => {
            localStorage.removeItem("kurio:nft-stock:v1");
            localStorage.removeItem("kurio:quotes:v1");
            localStorage.removeItem("kurio:orders:v1");
            localStorage.removeItem("kurio:wallets:v1");

            localStorage.setItem(
                "kurio:user-cart:user-1",
                JSON.stringify([
                    {
                        nftId: "1",
                        editionId: "emerald-1-10",
                        quantity: 1,
                    },
                    {
                        nftId: "1",
                        editionId: "emerald-open",
                        quantity: 2,
                    },
                ])
            );
        });

        // Cadastra e conecta uma carteira para o pagamento.
        const wallet = await page.evaluate(async () => {
            const token = localStorage.getItem(
                "kurio:auth-token"
            );

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const response = await fetch("/api/wallets", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    label: "Carteira de edições",
                    address:
                        "0x1234567890123456789012345678901234567890",
                    network: "ethereum",
                }),
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        });

        expect(wallet.status).toBe(201);

        const connection = await page.evaluate(
            async (walletId: string) => {
                const token = localStorage.getItem(
                    "kurio:auth-token"
                );

                const response = await fetch(
                    `/api/wallets/${walletId}/connection`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            action: "CONNECT",
                        }),
                    }
                );

                return response.status;
            },
            wallet.data.id
        );

        expect(connection).toBe(200);

        // Gera a cotação das duas edições.
        const quote = await page.evaluate(async () => {
            const token = localStorage.getItem(
                "kurio:auth-token"
            );

            const response = await fetch("/api/quote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    network: "ethereum",
                }),
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        });

        expect(quote.status).toBe(200);
        expect(quote.data.items).toHaveLength(2);

        // 1.10 + (2 × 0.65) = 2.40 ETH.
        expect(quote.data.subtotalEth).toBe("2.4");

        // Cria o pedido.
        const order = await page.evaluate(
            async (quoteId: string) => {
                const token = localStorage.getItem(
                    "kurio:auth-token"
                );

                const response = await fetch("/api/orders", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        quoteId,
                        idempotencyKey: crypto.randomUUID(),
                        walletAddress:
                            "0x1234567890123456789012345678901234567890",
                    }),
                });

                return {
                    status: response.status,
                    data: await response.json(),
                };
            },
            quote.data.quoteId
        );

        expect(order.status).toBe(201);
        expect(order.data.status).toBe("PENDING");

        // Aguarda a confirmação do pagamento simulado.
        await expect
            .poll(
                async () => {
                    return page.evaluate(
                        async (orderId: string) => {
                            const token =
                                localStorage.getItem(
                                    "kurio:auth-token"
                                );

                            const response = await fetch(
                                `/api/orders/${orderId}`,
                                {
                                    headers: {
                                        Authorization:
                                            `Bearer ${token}`,
                                    },
                                }
                            );

                            if (!response.ok) {
                                throw new Error(
                                    "Falha ao consultar o pedido."
                                );
                            }

                            const data = await response.json();

                            return data.status;
                        },
                        order.data.id
                    );
                },
                {
                    timeout: 15000,
                    intervals: [500, 1000],
                }
            )
            .toBe("CONFIRMED");

        // Consulta o estoque atualizado das edições.
        const afterPayment = await page.evaluate(async () => {
            const nftResponse = await fetch("/api/nfts/1");

            if (!nftResponse.ok) {
                throw new Error(
                    "Falha ao consultar estoque."
                );
            }

            const nft = await nftResponse.json();

            const cart = JSON.parse(
                localStorage.getItem(
                    "kurio:user-cart:user-1"
                ) ?? "[]"
            );

            return {
                nft,
                cart,
            };
        });

        const edition10 = afterPayment.nft.editions.find(
            (edition: { id: string }) =>
                edition.id === "emerald-1-10"
        );

        const editionOpen = afterPayment.nft.editions.find(
            (edition: { id: string }) =>
                edition.id === "emerald-open"
        );

        const edition50 = afterPayment.nft.editions.find(
            (edition: { id: string }) =>
                edition.id === "emerald-1-50"
        );

        // Estoque inicial da edição 1/10: 4.
        // Compramos 1, portanto restam 3.
        expect(edition10.available).toBe(3);

        // Estoque inicial da edição aberta: 50.
        // Compramos 2, portanto restam 48.
        expect(editionOpen.available).toBe(48);

        // A edição 1/50 não participou da compra.
        expect(edition50.available).toBe(8);

        // O carrinho deve ficar vazio após a confirmação.
        expect(afterPayment.cart).toHaveLength(0);

        // Atualiza a página para verificar persistência.
        await page.reload();

        await expect(
            page.getByRole("heading", {
                name: "Todos os NFTs",
            })
        ).toBeVisible();

        await expect
            .poll(
                async () => {
                    return page.evaluate(async () => {
                        const response = await fetch("/api/nfts/1");

                        return (
                            response.ok &&
                            response.headers
                                .get("content-type")
                                ?.includes("application/json")
                        );
                    });
                },
                {
                    timeout: 10000,
                    intervals: [200, 500, 1000],
                }
            )
            .toBe(true);

        const persistedStock = await page.evaluate(
            async () => {
                const response = await fetch("/api/nfts/1");

                if (!response.ok) {
                    throw new Error(
                        "Falha ao consultar estoque persistido."
                    );
                }

                const nft = await response.json();

                return nft.editions.map(
                    (edition: {
                        id: string;
                        available: number;
                    }) => ({
                        id: edition.id,
                        available: edition.available,
                    })
                );
            }
        );

        expect(persistedStock).toEqual(
            expect.arrayContaining([
                {
                    id: "emerald-1-10",
                    available: 3,
                },
                {
                    id: "emerald-open",
                    available: 48,
                },
                {
                    id: "emerald-1-50",
                    available: 8,
                },
            ])
        );
    }
);