import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "Demo1234!";

const WALLET_1 =
    "0x1234567890123456789012345678901234567890";

const WALLET_2 =
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

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

async function walletRequest(
    page: Page,
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: object,
    scenario?: string
) {
    return page.evaluate(
        async ({ method, path, body, scenario }) => {
            const token = localStorage.getItem(
                "kurio:auth-token"
            );

            const response = await fetch(path, {
                method,

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    ...(scenario
                        ? { "x-mock-scenario": scenario }
                        : {}),
                },

                ...(body
                    ? { body: JSON.stringify(body) }
                    : {}),
            });

            return {
                status: response.status,
                data: await response.json(),
            };
        },
        { method, path, body, scenario }
    );
}

async function createWallet(
    page: Page,
    address: string,
    label: string
) {
    return walletRequest(
        page,
        "POST",
        "/api/wallets",
        {
            label,
            address,
            network: "ethereum",
        }
    );
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        if (
            sessionStorage.getItem(
                "kurio:e2e-wallets-initialized"
            )
        ) {
            return;
        }

        localStorage.removeItem("kurio:auth-token");
        localStorage.removeItem("kurio:sessions:v1");
        localStorage.removeItem("kurio:wallets:v1");

        sessionStorage.setItem(
            "kurio:e2e-wallets-initialized",
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
    "deve cadastrar e persistir uma carteira",
    async ({ page }) => {
        await loginAsAna(page);

        const created = await createWallet(
            page,
            WALLET_1,
            "Carteira principal"
        );

        expect(created.status).toBe(201);

        expect(created.data.address).toBe(WALLET_1);
        expect(created.data.userId).toBe("user-1");
        expect(created.data.isPrimary).toBe(true);

        expect(created.data.connectionStatus).toBe(
            "DISCONNECTED"
        );

        await page.reload({
            waitUntil: "domcontentloaded",
        });

        await expect(
            page.getByRole("button", {
                name: "Sair da conta",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Todos os NFTs",
            })
        ).toBeVisible();

        const result = await walletRequest(
            page,
            "GET",
            "/api/wallets"
        );

        expect(result.status).toBe(200);
        expect(result.data).toHaveLength(1);

        expect(result.data[0].address).toBe(
            WALLET_1
        );
    }
);

test(
    "não deve permitir cadastrar uma carteira duplicada",
    async ({ page }) => {
        await loginAsAna(page);

        const first = await createWallet(
            page,
            WALLET_1,
            "Minha carteira"
        );

        const second = await createWallet(
            page,
            WALLET_1,
            "Carteira repetida"
        );

        expect(first.status).toBe(201);
        expect(second.status).toBe(409);

        expect(second.data.message).toContain(
            "já está cadastrada"
        );
    }
);

test(
    "deve simular conexão, recusa e desconexão",
    async ({ page }) => {
        await loginAsAna(page);

        const created = await createWallet(
            page,
            WALLET_1,
            "Carteira de testes"
        );

        expect(created.status).toBe(201);

        const walletId = created.data.id;

        const refused = await walletRequest(
            page,
            "POST",
            `/api/wallets/${walletId}/connection`,
            {
                action: "CONNECT",
            },
            "wallet-refused"
        );

        expect(refused.status).toBe(409);

        expect(refused.data.message).toContain(
            "recusada"
        );

        const afterRefusal = await walletRequest(
            page,
            "GET",
            "/api/wallets"
        );

        expect(
            afterRefusal.data[0].connectionStatus
        ).toBe("DISCONNECTED");

        const connected = await walletRequest(
            page,
            "POST",
            `/api/wallets/${walletId}/connection`,
            {
                action: "CONNECT",
            }
        );

        expect(connected.status).toBe(200);

        expect(
            connected.data.connectionStatus
        ).toBe("CONNECTED");

        const disconnected = await walletRequest(
            page,
            "POST",
            `/api/wallets/${walletId}/connection`,
            {
                action: "DISCONNECT",
            }
        );

        expect(disconnected.status).toBe(200);

        expect(
            disconnected.data.connectionStatus
        ).toBe("DISCONNECTED");
    }
);

test(
    "deve permitir alterar a carteira principal",
    async ({ page }) => {
        await loginAsAna(page);

        const first = await createWallet(
            page,
            WALLET_1,
            "Carteira Ethereum"
        );

        const second = await createWallet(
            page,
            WALLET_2,
            "Carteira secundária"
        );

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);

        expect(first.data.isPrimary).toBe(true);
        expect(second.data.isPrimary).toBe(false);

        const updated = await walletRequest(
            page,
            "PATCH",
            `/api/wallets/${second.data.id}`,
            {
                isPrimary: true,
            }
        );

        expect(updated.status).toBe(200);
        expect(updated.data.isPrimary).toBe(true);

        const result = await walletRequest(
            page,
            "GET",
            "/api/wallets"
        );

        expect(result.status).toBe(200);
        expect(result.data).toHaveLength(2);

        const primaryWallets = result.data.filter(
            (wallet: { isPrimary: boolean }) =>
                wallet.isPrimary
        );

        expect(primaryWallets).toHaveLength(1);

        expect(primaryWallets[0].id).toBe(
            second.data.id
        );
    }
);