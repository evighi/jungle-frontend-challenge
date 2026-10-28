import {
    test,
    expect,
    type Page,
} from "@playwright/test";

const TABLET_WIDTH = 768;
const TABLET_HEIGHT = 1024;

async function expectNoHorizontalOverflow(page: Page) {
    await expect
        .poll(async () => {
            return page.evaluate(() => {
                const documentWidth =
                    document.documentElement.scrollWidth;

                const viewportWidth =
                    document.documentElement.clientWidth;

                return documentWidth <= viewportWidth + 1;
            });
        })
        .toBe(true);
}

test.beforeEach(async ({ page }, testInfo) => {
    // Executamos o perfil tablet apenas uma vez.
    // Isso evita duplicar os testes entre os projetos
    // desktop e mobile do Playwright.
    test.skip(
        testInfo.project.name !== "desktop",
        "Tablet já é validado pelo projeto desktop."
    );

    await page.setViewportSize({
        width: TABLET_WIDTH,
        height: TABLET_HEIGHT,
    });
});

test(
    "tablet: catálogo não deve apresentar overflow horizontal",
    async ({ page }) => {
        await page.goto("/");

        await expect(
            page.getByRole("heading", {
                name: "Todos os NFTs",
            })
        ).toBeVisible();

        await expectNoHorizontalOverflow(page);
    }
);

test(
    "tablet: detalhes do NFT devem permanecer utilizáveis",
    async ({ page }) => {
        await page.goto("/nft/1");

        await expect(
            page.getByRole("heading", {
                name: "Emerald Ape",
            })
        ).toBeVisible();

        await expect(
            page.getByRole("button", {
                name: "Adicionar ao carrinho",
            })
        ).toBeVisible();

        await expectNoHorizontalOverflow(page);
    }
);

test(
    "tablet: carrinho deve permanecer dentro da tela",
    async ({ page }) => {
        await page.goto("/");

        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:guest-cart:v1",
                JSON.stringify([
                    {
                        nftId: "1",
                        quantity: 2,
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
            page.getByText("Emerald Ape")
        ).toBeVisible();

        await expectNoHorizontalOverflow(page);
    }
);