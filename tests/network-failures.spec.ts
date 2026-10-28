import {
    test,
    expect,
    type Page,
} from "@playwright/test";

type FailureMode =
    | "none"
    | "http500"
    | "network";

interface Scenario {
    delayMs: number;
    failure: FailureMode;
}

async function configureScenario(
    page: Page,
    scenario: Scenario
) {
    await page.addInitScript((config) => {
        localStorage.setItem(
            "kurio:mock-scenario:v1",
            JSON.stringify(config)
        );
    }, scenario);
}

test(
    "deve mostrar skeletons durante carregamento lento",
    async ({ page }) => {
        await configureScenario(page, {
            delayMs: 2000,
            failure: "none",
        });

        await page.goto("/");

        const catalog = page.locator("#catalogo");

        await expect(
            catalog.locator('[data-slot="skeleton"]').first()
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible({
            timeout: 10000,
        });

        await expect(
            catalog.locator('[data-slot="skeleton"]')
        ).toHaveCount(0);
    }
);

test(
    "deve recuperar o catálogo após erro HTTP 500",
    async ({ page }) => {
        await configureScenario(page, {
            delayMs: 0,
            failure: "http500",
        });

        await page.goto("/");

        await expect(
            page.getByText(
                "Não foi possível carregar os NFTs."
            )
        ).toBeVisible();

        await page.evaluate(() => {
            localStorage.removeItem(
                "kurio:mock-scenario:v1"
            );
        });

        await page
            .getByRole("button", {
                name: "Tentar novamente",
            })
            .click();

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible();
    }
);

test(
    "deve recuperar o catálogo após falha de conexão",
    async ({ page }) => {
        await configureScenario(page, {
            delayMs: 0,
            failure: "network",
        });

        await page.goto("/");

        await expect(
            page.getByText(
                "Não foi possível carregar os NFTs."
            )
        ).toBeVisible();

        await page.evaluate(() => {
            localStorage.removeItem(
                "kurio:mock-scenario:v1"
            );
        });

        await page
            .getByRole("button", {
                name: "Tentar novamente",
            })
            .click();

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible();
    }
);