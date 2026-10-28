import {
    test,
    expect,
} from "@playwright/test";

test(
    "deve permitir login utilizando o teclado",
    async ({ page }) => {
        await page.goto("/login");

        const email = page.getByLabel("E-mail");
        const password = page.getByLabel("Senha");

        await expect(email).toBeVisible();
        await expect(password).toBeVisible();

        // Localiza o campo percorrendo a página com Tab.
        for (let attempt = 0; attempt < 30; attempt++) {
            if (await email.evaluate(
                (element) => document.activeElement === element
            )) {
                break;
            }

            await page.keyboard.press("Tab");
        }

        await expect(email).toBeFocused();

        await page.keyboard.type("ana@kurio.test");

        await page.keyboard.press("Tab");

        await expect(password).toBeFocused();

        await page.keyboard.type("Demo1234!");

        await page.keyboard.press("Tab");

        const submit = page.getByRole("button", {
            name: "Entrar",
            exact: true,
        });

        await expect(submit).toBeFocused();

        // Confirma o formulário sem clicar com o mouse.
        await page.keyboard.press("Enter");

        await expect(
            page.getByRole("heading", {
                name: "Todos os NFTs",
            })
        ).toBeVisible();
    }
);

test(
    "deve permitir alterar a quantidade do NFT com teclado",
    async ({ page }) => {
        await page.goto("/nft/1");

        const increase = page.getByRole("button", {
            name: "Aumentar quantidade",
        });

        const decrease = page.getByRole("button", {
            name: "Diminuir quantidade",
        });

        const quantity = page.getByLabel(
            "Quantidade selecionada"
        );

        await expect(quantity).toHaveText("1");

        await increase.focus();

        await expect(increase).toBeFocused();

        await page.keyboard.press("Enter");

        await expect(quantity).toHaveText("2");

        // Botões nativos também devem aceitar Space.
        await page.keyboard.press("Space");

        await expect(quantity).toHaveText("3");

        await decrease.focus();

        await page.keyboard.press("Enter");

        await expect(quantity).toHaveText("2");
    }
);

test(
    "deve apresentar mensagem acessível para login inválido",
    async ({ page }) => {
        await page.goto("/login");

        await page
            .getByLabel("E-mail")
            .fill("ana@kurio.test");

        await page
            .getByLabel("Senha")
            .fill("senha-incorreta");

        await page.getByLabel("Senha").press("Enter");

        await expect(
            page.getByRole("alert")
        ).toBeVisible();

        await expect(
            page.getByRole("heading", {
                name: "Entrar na Kurio",
            })
        ).toBeVisible();
    }
);