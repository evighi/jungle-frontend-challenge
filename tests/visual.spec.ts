import {
    test,
    expect,
    type Page,
} from "@playwright/test";

async function prepareVisualTest(page: Page) {
    await page.addInitScript(() => {
        if (
            sessionStorage.getItem(
                "kurio:visual-initialized"
            )
        ) {
            return;
        }

        localStorage.removeItem(
            "kurio:mock-scenario:v1"
        );

        localStorage.removeItem(
            "kurio:nft-stock:v1"
        );

        localStorage.removeItem(
            "kurio:guest-cart:v1"
        );

        localStorage.removeItem(
            "kurio:auth-token"
        );

        sessionStorage.setItem(
            "kurio:visual-initialized",
            "true"
        );
    });
}

async function waitForVisualStability(
    page: Page
) {
    await page.evaluate(async () => {
        await document.fonts.ready;
    });

    await expect(
        page.locator('[data-slot="skeleton"]')
    ).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
    await prepareVisualTest(page);
});

test(
    "regressão visual da página inicial",
    async ({ page }) => {
        await page.goto("/");

        await expect(
            page.getByRole("heading", {
                name: "Todos os NFTs",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            }).first()
        ).toBeVisible();

        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot(
            "home.png",
            {
                fullPage: true,
                animations: "disabled",
                caret: "hide",
                maxDiffPixelRatio: 0.01,
            }
        );
    }
);

test(
    "regressão visual dos detalhes do NFT",
    async ({ page }) => {
        await page.goto("/nft/1");

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible();

        await expect(
            page.getByTestId(
                "nft-selected-price"
            )
        ).toHaveText("0.85 ETH");

        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot(
            "nft-details.png",
            {
                fullPage: true,
                animations: "disabled",
                caret: "hide",
                maxDiffPixelRatio: 0.01,
            }
        );
    }
);

test(
    "regressão visual do carrinho de NFTs",
    async ({ page }) => {
        await page.goto("/");

        await expect(
            page.getByRole("heading", {
                name: "Todos os NFTs",
            })
        ).toBeVisible();

        // Prepara um carrinho de visitante conhecido.
        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:guest-cart:v1",
                JSON.stringify([
                    {
                        nftId: "1",
                        quantity: 2,
                    },
                    {
                        nftId: "2",
                        quantity: 1,
                    },
                ])
            );
        });

        await page.goto("/carrinho");

        await expect(
            page.getByRole("heading", {
                name: "Carrinho de NFTs",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Sage Nomad",
            })
        ).toBeVisible();

        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot(
            "cart.png",
            {
                fullPage: true,
                animations: "disabled",
                caret: "hide",
                maxDiffPixelRatio: 0.01,
            }
        );
    }
);