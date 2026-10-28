import { test, expect, type Page } from "@playwright/test";
import { io } from "socket.io-client";

const PASSWORD = "Demo1234!";

const WALLET =
    "0x1234567890123456789012345678901234567890";

async function prepareCart(page: Page) {
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

    await page.evaluate(() => {
        localStorage.setItem(
            "kurio:user-cart:user-1",
            JSON.stringify([
                {
                    nftId: "1",
                    quantity: 1,
                },
            ])
        );
    });

    await page.evaluate(async () => {
        const token = localStorage.getItem(
            "kurio:auth-token"
        );

        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        };

        const walletResponse = await fetch(
            "/api/wallets",
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    label: "Carteira dos testes",
                    address:
                        "0x1234567890123456789012345678901234567890",
                    network: "ethereum",
                }),
            }
        );

        if (walletResponse.status !== 201) {
            throw new Error(
                "Não foi possível preparar a carteira de teste."
            );
        }

        const wallet = await walletResponse.json();

        const connectionResponse = await fetch(
            `/api/wallets/${wallet.id}/connection`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    action: "CONNECT",
                }),
            }
        );

        if (connectionResponse.status !== 200) {
            throw new Error(
                "Não foi possível conectar a carteira de teste."
            );
        }
    });
}

async function createQuote(page: Page) {
    return page.evaluate(async () => {
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
}

async function createOrder(
    page: Page,
    quoteId: string,
    idempotencyKey: string
) {
    return page.evaluate(
        async ({ quoteId, idempotencyKey, wallet }) => {
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
                    idempotencyKey,
                    walletAddress: wallet,
                }),
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        },
        {
            quoteId,
            idempotencyKey,
            wallet: WALLET,
        }
    );
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        if (
            sessionStorage.getItem(
                "kurio:e2e-orders-initialized"
            )
        ) {
            return;
        }

        localStorage.removeItem("kurio:auth-token");
        localStorage.removeItem("kurio:sessions:v1");
        localStorage.removeItem("kurio:guest-cart:v1");
        localStorage.removeItem("kurio:user-cart:user-1");
        localStorage.removeItem("kurio:quotes:v1");
        localStorage.removeItem("kurio:orders:v1");
        localStorage.removeItem("kurio:wallets:v1");

        sessionStorage.setItem(
            "kurio:e2e-orders-initialized",
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
    "deve criar um pedido pendente com cotação válida",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const result = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(result.status).toBe(201);
        expect(result.data.id).toBeTruthy();

        expect(result.data.status).toBe("PENDING");
        expect(result.data.quoteId).toBe(
            quote.data.quoteId
        );

        expect(result.data.userId).toBe("user-1");
        expect(result.data.walletAddress).toBe(WALLET);
        expect(result.data.network).toBe("ethereum");

        expect(result.data.items).toHaveLength(1);
        expect(result.data.totalEth).toBe("0.853");
    }
);

test(
    "não deve duplicar um pedido com a mesma chave de idempotência",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const key = crypto.randomUUID();

        const first = await createOrder(
            page,
            quote.data.quoteId,
            key
        );

        const second = await createOrder(
            page,
            quote.data.quoteId,
            key
        );

        expect(first.status).toBe(201);
        expect(second.status).toBe(200);

        expect(second.data.id).toBe(first.data.id);

        const storedOrders = await page.evaluate(() => {
            const stored = localStorage.getItem(
                "kurio:orders:v1"
            );

            return stored ? JSON.parse(stored) : [];
        });

        expect(storedOrders).toHaveLength(1);
    }
);

test(
    "não deve criar dois pedidos para a mesma cotação",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const first = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        const second = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(first.status).toBe(201);
        expect(second.status).toBe(409);

        expect(second.data.message).toContain(
            "Esta cotação já foi utilizada"
        );
    }
);

test(
    "deve rejeitar pedido com cotação expirada",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        await page.evaluate((quoteId: string) => {
            const stored = JSON.parse(
                localStorage.getItem("kurio:quotes:v1") ??
                "[]"
            );

            const updated = stored.map(
                (item: {
                    userId: string;
                    quote: {
                        quoteId: string;
                        expiresAt: string;
                    };
                }) => {
                    if (item.quote.quoteId !== quoteId) {
                        return item;
                    }

                    return {
                        ...item,
                        quote: {
                            ...item.quote,
                            expiresAt: new Date(
                                Date.now() - 60_000
                            ).toISOString(),
                        },
                    };
                }
            );

            localStorage.setItem(
                "kurio:quotes:v1",
                JSON.stringify(updated)
            );
        }, quote.data.quoteId);

        const result = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(result.status).toBe(410);

        expect(result.data.message).toContain(
            "A cotação expirou"
        );
    }
);

test(
    "deve rejeitar pedido com carteira não cadastrada",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        // Remove as carteiras cadastradas.
        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:wallets:v1",
                JSON.stringify([])
            );
        });

        const result = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(result.status).toBe(404);

        expect(result.data.message).toContain(
            "não está cadastrada"
        );
    }
);

test(
    "deve rejeitar pedido com carteira desconectada",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        // Desconecta a carteira pela API simulada.
        await page.evaluate(async () => {
            const token = localStorage.getItem(
                "kurio:auth-token"
            );

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const walletsResponse = await fetch(
                "/api/wallets",
                { headers }
            );

            if (!walletsResponse.ok) {
                throw new Error(
                    "Falha ao consultar carteiras."
                );
            }

            const wallets = await walletsResponse.json();

            const wallet = wallets[0];

            if (!wallet) {
                throw new Error(
                    "Nenhuma carteira disponível para o teste."
                );
            }

            const response = await fetch(
                `/api/wallets/${wallet.id}/connection`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        action: "DISCONNECT",
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    "Falha ao desconectar a carteira."
                );
            }
        });

        const result = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(result.status).toBe(409);

        expect(result.data.message).toContain(
            "Conecte sua carteira"
        );
    }
);

test(
    "deve rejeitar pedido com rede blockchain incompatível",
    async ({ page }) => {
        await prepareCart(page);

        // Cotação em Ethereum.
        const quote = await createQuote(page);

        expect(quote.status).toBe(200);
        expect(quote.data.network).toBe("ethereum");

        // Altera a carteira para Polygon e conecta novamente.
        await page.evaluate(async () => {
            const token = localStorage.getItem(
                "kurio:auth-token"
            );

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const walletsResponse = await fetch(
                "/api/wallets",
                { headers }
            );

            if (!walletsResponse.ok) {
                throw new Error(
                    "Falha ao consultar carteiras."
                );
            }

            const wallets = await walletsResponse.json();

            const wallet = wallets[0];

            if (!wallet) {
                throw new Error(
                    "Nenhuma carteira disponível para o teste."
                );
            }

            const updateResponse = await fetch(
                `/api/wallets/${wallet.id}`,
                {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({
                        network: "polygon",
                    }),
                }
            );

            if (!updateResponse.ok) {
                throw new Error(
                    "Falha ao alterar a rede."
                );
            }

            const connectionResponse = await fetch(
                `/api/wallets/${wallet.id}/connection`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        action: "CONNECT",
                    }),
                }
            );

            if (!connectionResponse.ok) {
                throw new Error(
                    "Falha ao conectar a carteira."
                );
            }
        });

        const result = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(result.status).toBe(409);

        expect(result.data.message).toContain(
            "rede da carteira é diferente"
        );
    }
);

test(
    "deve confirmar um pagamento simulado e persistir o resultado",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const created = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(created.status).toBe(201);
        expect(created.data.status).toBe("PENDING");

        const orderId = created.data.id;

        await expect
            .poll(
                async () => {
                    return page.evaluate(
                        async (id: string) => {
                            const token =
                                localStorage.getItem(
                                    "kurio:auth-token"
                                );

                            const response = await fetch(
                                `/api/orders/${id}`,
                                {
                                    headers: {
                                        Authorization:
                                            `Bearer ${token}`,
                                    },
                                }
                            );

                            if (!response.ok) {
                                throw new Error(
                                    "Falha ao consultar pedido."
                                );
                            }

                            const order =
                                await response.json();

                            return order.status;
                        },
                        orderId
                    );
                },
                {
                    timeout: 10000,
                    intervals: [500, 1000],
                }
            )
            .toBe("CONFIRMED");

        const stateAfterConfirmation =
            await page.evaluate(async () => {
                const token = localStorage.getItem(
                    "kurio:auth-token"
                );

                const response = await fetch(
                    "/api/nfts/1",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "Não foi possível consultar o NFT."
                    );
                }

                const nft = await response.json();

                const cart = JSON.parse(
                    localStorage.getItem(
                        "kurio:user-cart:user-1"
                    ) ?? "[]"
                );

                return {
                    available: nft.available,
                    cart,
                };
            });

        expect(
            stateAfterConfirmation.available
        ).toBe(7);

        expect(
            stateAfterConfirmation.cart
        ).toHaveLength(0);

        const stockAfterRepeatedConsultation =
            await page.evaluate(
                async (id: string) => {
                    const token = localStorage.getItem(
                        "kurio:auth-token"
                    );

                    const headers = {
                        Authorization: `Bearer ${token}`,
                    };

                    // Consulta repetida do mesmo pedido.
                    for (let i = 0; i < 3; i++) {
                        const response = await fetch(
                            `/api/orders/${id}`,
                            { headers }
                        );

                        if (!response.ok) {
                            throw new Error(
                                "Falha ao consultar pedido."
                            );
                        }
                    }

                    const nftResponse = await fetch(
                        "/api/nfts/1",
                        { headers }
                    );

                    if (!nftResponse.ok) {
                        throw new Error(
                            "Falha ao consultar estoque."
                        );
                    }

                    const nft = await nftResponse.json();

                    return nft.available;
                },
                orderId
            );

        expect(
            stockAfterRepeatedConsultation
        ).toBe(7);

        await page.reload();

        await expect(
            page.getByRole("heading", {
                name: "Todos os NFTs",
            })
        ).toBeVisible();

        const storedStatus = await page.evaluate(
            (id: string) => {
                const orders = JSON.parse(
                    localStorage.getItem(
                        "kurio:orders:v1"
                    ) ?? "[]"
                );

                return orders.find(
                    (order: { id: string }) =>
                        order.id === id
                )?.status;
            },
            orderId
        );

        expect(storedStatus).toBe("CONFIRMED");
    }
);

test(
    "deve recusar um pagamento simulado e preservar o status final",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const created = await page.evaluate(
            async (quoteId: string) => {
                const token =
                    localStorage.getItem(
                        "kurio:auth-token"
                    );

                const response = await fetch(
                    "/api/orders",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization:
                                `Bearer ${token}`,
                            "x-mock-scenario":
                                "payment-failed",
                        },
                        body: JSON.stringify({
                            quoteId,
                            idempotencyKey:
                                crypto.randomUUID(),
                            walletAddress:
                                "0x1234567890123456789012345678901234567890",
                        }),
                    }
                );

                return {
                    status: response.status,
                    data: await response.json(),
                };
            },
            quote.data.quoteId
        );

        expect(created.status).toBe(201);
        expect(created.data.status).toBe("PENDING");

        const orderId = created.data.id;

        await expect
            .poll(
                async () => {
                    return page.evaluate(
                        async (id: string) => {
                            const token =
                                localStorage.getItem(
                                    "kurio:auth-token"
                                );

                            const response = await fetch(
                                `/api/orders/${id}`,
                                {
                                    headers: {
                                        Authorization:
                                            `Bearer ${token}`,
                                    },
                                }
                            );

                            if (!response.ok) {
                                throw new Error(
                                    "Falha ao consultar pedido."
                                );
                            }

                            const order =
                                await response.json();

                            return order.status;
                        },
                        orderId
                    );
                },
                {
                    timeout: 10000,
                    intervals: [500, 1000],
                }
            )
            .toBe("FAILED");

        const stateAfterFailure =
            await page.evaluate(async () => {
                const token = localStorage.getItem(
                    "kurio:auth-token"
                );

                const response = await fetch(
                    "/api/nfts/1",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "Não foi possível consultar o NFT."
                    );
                }

                const nft = await response.json();

                const cart = JSON.parse(
                    localStorage.getItem(
                        "kurio:user-cart:user-1"
                    ) ?? "[]"
                );

                return {
                    available: nft.available,
                    cart,
                };
            });

        expect(
            stateAfterFailure.available
        ).toBe(8);

        expect(
            stateAfterFailure.cart
        ).toEqual([
            {
                nftId: "1",
                quantity: 1,
            },
        ]);

        const orders = await page.evaluate(() =>
            JSON.parse(
                localStorage.getItem(
                    "kurio:orders:v1"
                ) ?? "[]"
            )
        );

        expect(
            orders.find(
                (order: { id: string }) =>
                    order.id === orderId
            )?.status
        ).toBe("FAILED");
    }
);

test(
    "deve atualizar o contador do carrinho após confirmar o pagamento",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const created = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(created.status).toBe(201);

        await page.goto(
            `/pedido/${created.data.id}`
        );

        await expect(
            page.getByRole("heading", {
                name: "Pagamento confirmado",
            })
        ).toBeVisible({
            timeout: 15000,
        });

        await expect(
            page.getByRole("link", {
                name: "Abrir carrinho com 0 itens",
            })
        ).toBeVisible({
            timeout: 10000,
        });
    }
);

test(
    "deve entregar order.updated por uma conexão Socket.IO real",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const created = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(created.status).toBe(201);
        expect(created.data.status).toBe("PENDING");

        const orderId: string = created.data.id;

        const socket = io(
            "http://127.0.0.1:4173",
            {
                path: "/socket.io",
                transports: ["websocket"],
                autoConnect: false,
                forceNew: true,
                reconnection: false,
                timeout: 5000,
            }
        );

        try {
            // 1. Estabelece a conexão real.
            await new Promise<void>(
                (resolve, reject) => {
                    const timeout = setTimeout(
                        () => {
                            reject(
                                new Error(
                                    "Timeout ao conectar Socket.IO."
                                )
                            );
                        },
                        5000
                    );

                    socket.once("connect", () => {
                        clearTimeout(timeout);
                        resolve();
                    });

                    socket.once(
                        "connect_error",
                        (error) => {
                            clearTimeout(timeout);
                            reject(error);
                        }
                    );

                    socket.connect();
                }
            );

            expect(socket.connected).toBe(true);

            // 2. Inscreve-se nos eventos do pedido.
            const subscription = await socket
                .timeout(5000)
                .emitWithAck(
                    "order.watch",
                    orderId
                );

            expect(subscription).toEqual({
                ok: true,
            });

            // 3. Prepara a captura do evento.
            let eventTimeout:
                | ReturnType<typeof setTimeout>
                | undefined;

            const receivedEvent = new Promise<{
                orderId: string;
                version: number;
            }>((resolve, reject) => {
                eventTimeout = setTimeout(() => {
                    reject(
                        new Error(
                            "O evento order.updated não foi recebido."
                        )
                    );
                }, 10000);

                socket.once(
                    "order.updated",
                    (event: {
                        orderId: string;
                        version: number;
                    }) => {
                        clearTimeout(eventTimeout);
                        resolve(event);
                    }
                );
            });

            // 4. Consulta o pedido até o processamento.
            // O GET é responsável por executar o
            // processamento simulado quando o prazo vence.
            await expect
                .poll(
                    async () => {
                        return page.evaluate(
                            async (id: string) => {
                                const token =
                                    localStorage.getItem(
                                        "kurio:auth-token"
                                    );

                                const response =
                                    await fetch(
                                        `/api/orders/${id}`,
                                        {
                                            headers: {
                                                Authorization:
                                                    `Bearer ${token}`,
                                            },
                                        }
                                    );

                                if (!response.ok) {
                                    throw new Error(
                                        "Falha ao consultar pedido."
                                    );
                                }

                                const order =
                                    await response.json();

                                return order.status;
                            },
                            orderId
                        );
                    },
                    {
                        timeout: 10000,
                        intervals: [500, 1000],
                    }
                )
                .toBe("CONFIRMED");

            // 5. Confirma que o evento chegou.
            const event = await receivedEvent;

            expect(event.orderId).toBe(orderId);

            expect(
                Number.isFinite(event.version)
            ).toBe(true);

            expect(event.version).toBeGreaterThan(
                0
            );
        } finally {
            socket.disconnect();
        }
    }
);

test(
    "regressão visual da confirmação do pagamento",
    async ({ page }) => {
        await prepareCart(page);

        const quote = await createQuote(page);

        expect(quote.status).toBe(200);

        const created = await createOrder(
            page,
            quote.data.quoteId,
            crypto.randomUUID()
        );

        expect(created.status).toBe(201);
        expect(created.data.status).toBe("PENDING");

        const orderId = created.data.id as string;

        await page.goto(
            `/pedido/${encodeURIComponent(orderId)}`
        );

        await expect(
            page.getByRole("heading", {
                name: "Acompanhar pedido",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Pagamento confirmado",
            })
        ).toBeVisible({
            timeout: 15000,
        });

        await expect(
            page.getByRole("heading", {
                name: "Itens do pedido",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Resumo financeiro",
            })
        ).toBeVisible();

        await expect(
            page.locator('[data-slot="skeleton"]')
        ).toHaveCount(0);

        await page.evaluate(async () => {
            await document.fonts.ready;
        });

        await expect(page).toHaveScreenshot(
            "order-confirmed.png",
            {
                fullPage: true,
                animations: "disabled",
                caret: "hide",
                maxDiffPixelRatio: 0.01,
                mask: [
                    page.getByText(orderId, {
                        exact: true,
                    }),
                    page.getByText(/^Criado em /),
                    page
                        .getByRole("status")
                        .filter({
                            hasText: /Tempo real/,
                        }),
                ],
                maskColor: "#261711",
            }
        );
    }
);