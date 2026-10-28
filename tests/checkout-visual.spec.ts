import {
    test,
    expect,
    type Page,
} from "@playwright/test";

async function prepareCheckout(page: Page) {
    await page.addInitScript(() => {
        if (
            sessionStorage.getItem(
                "kurio:checkout-visual-ready"
            )
        ) {
            return;
        }

        const keys = [
            "kurio:auth-token",
            "kurio:sessions:v1",
            "kurio:guest-cart:v1",
            "kurio:user-cart:user-1",
            "kurio:quotes:v1",
            "kurio:orders:v1",
            "kurio:wallets:v1",
            "kurio:mock-scenario:v1",
            "kurio:nft-stock:v1",
        ];

        for (const key of keys) {
            localStorage.removeItem(key);
        }

        sessionStorage.setItem(
            "kurio:checkout-visual-ready",
            "true"
        );
    });

    await page.goto("/login");

    await page
        .getByLabel("E-mail")
        .fill("ana@kurio.test");

    await page
        .getByLabel("Senha")
        .fill("Demo1234!");

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

    const quoteId = await page.evaluate(async () => {
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
                    label: "Carteira principal",
                    address:
                        "0x1234567890123456789012345678901234567890",
                    network: "ethereum",
                }),
            }
        );

        if (walletResponse.status !== 201) {
            throw new Error(
                "Falha ao criar a carteira de teste."
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
                "Falha ao conectar a carteira."
            );
        }

        const quoteResponse = await fetch(
            "/api/quote",
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    network: "ethereum",
                }),
            }
        );

        if (!quoteResponse.ok) {
            throw new Error(
                "Falha ao criar a cotação."
            );
        }

        const quote = await quoteResponse.json();

        return quote.quoteId as string;
    });

    await page.goto(
        `/checkout?quoteId=${encodeURIComponent(quoteId)}`
    );

    await expect(
        page.getByRole("heading", {
            name: "Finalizar compra",
        })
    ).toBeVisible();

    await expect(
        page.getByRole("heading", {
            name: "Resumo da compra",
        })
    ).toBeVisible();

    await expect(
        page.getByText("Carteira principal")
    ).toBeVisible();

    await expect(
        page.getByRole("button", {
            name: "Confirmar pedido",
        })
    ).toBeEnabled();

    await expect(
        page.locator('[data-slot="skeleton"]')
    ).toHaveCount(0);

    await page.evaluate(async () => {
        await document.fonts.ready;
    });
}

test(
    "regressão visual do checkout",
    async ({ page }) => {
        await prepareCheckout(page);

        await expect(page).toHaveScreenshot(
            "checkout.png",
            {
                fullPage: true,
                animations: "disabled",
                caret: "hide",
                maxDiffPixelRatio: 0.01,
                mask: [
                    page.getByText(
                        /Cotação válida até/
                    ),
                ],
                maskColor: "#261711",
            }
        );
    }
);