import { test, expect, type Page } from "@playwright/test";

const ANA = {
    email: "ana@kurio.test",
    password: "Demo1234!",
};

const PEDRO = {
    email: "pedro@kurio.test",
    password: "Demo1234!",
};

async function login(
    page: Page,
    email: string,
    password: string
) {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill(email);

    await page.getByLabel("Senha", {
        exact: true,
    }).fill(password);

    await page.getByRole("button", {
        name: "Entrar",
        exact: true,
    }).click();

    await expect(
        page.getByRole("button", {
            name: "Sair da conta",
        })
    ).toBeVisible();
}

test("deve proteger o perfil contra acesso não autenticado", async ({
    page,
}) => {
    await page.goto("/perfil");

    await expect(page).toHaveURL(/\/login/);
});

test("deve atualizar e persistir os dados do perfil", async ({
    page,
}) => {
    await login(page, ANA.email, ANA.password);

    await page.goto("/perfil");

    await expect(
        page.getByRole("heading", {
            name: "Meu perfil",
        })
    ).toBeVisible();

    await page.getByLabel("Nome completo").fill(
        "Ana Silva Atualizada"
    );

    await page.getByLabel("URL do avatar").fill(
        "https://example.com/avatar.png"
    );

    await page.getByRole("button", {
        name: "Salvar alterações",
    }).click();

    await expect(
        page.getByRole("status")
    ).toContainText("Perfil atualizado com sucesso.");

    await page.reload();

    await expect(
        page.getByLabel("Nome completo")
    ).toHaveValue("Ana Silva Atualizada");

    await expect(
        page.getByLabel("URL do avatar")
    ).toHaveValue("https://example.com/avatar.png");

    await expect(
        page.getByRole("link", {
            name: "Acessar meu perfil",
        })
    ).toContainText("Ana Silva Atualizada");
});

test("deve rejeitar e-mail pertencente a outro usuário", async ({
    page,
}) => {
    await login(page, ANA.email, ANA.password);

    await page.goto("/perfil");

    await page.getByLabel("E-mail").fill(
        PEDRO.email
    );

    await page.getByRole("button", {
        name: "Salvar alterações",
    }).click();

    await expect(
        page.getByRole("alert")
    ).toContainText("Este e-mail já está cadastrado.");

    await page.reload();

    await expect(
        page.getByLabel("E-mail")
    ).toHaveValue(ANA.email);
});

test("deve validar a senha atual e persistir a nova senha", async ({
    page,
}) => {
    await login(page, ANA.email, ANA.password);

    await page.goto("/perfil");

    await page.getByLabel("Senha atual").fill(
        "SenhaIncorreta123!"
    );

    await page.getByLabel("Nova senha", {
        exact: true,
    }).fill("NovaSenha123!");

    await page.getByLabel(
        "Confirmar nova senha"
    ).fill("NovaSenha123!");

    await page.getByRole("button", {
        name: "Alterar senha",
    }).click();

    await expect(
        page.getByRole("alert")
    ).toContainText("A senha atual está incorreta.");

    await page.getByLabel("Senha atual").fill(
        ANA.password
    );

    await page.getByRole("button", {
        name: "Alterar senha",
    }).click();

    await expect(
        page.getByRole("status")
    ).toContainText("Senha alterada com sucesso.");

    await page.getByRole("button", {
        name: "Sair da conta",
    }).click();

    await expect(page).toHaveURL(
        (url) => url.pathname === "/"
    );

    await page.goto("/login");

    await page.getByLabel("E-mail").fill(
        ANA.email
    );

    await page.getByLabel("Senha", {
        exact: true,
    }).fill(ANA.password);

    await page.getByRole("button", {
        name: "Entrar",
        exact: true,
    }).click();

    await expect(
        page.getByRole("alert")
    ).toContainText("Credenciais inválidas.");

    await page.getByLabel("Senha", {
        exact: true,
    }).fill("NovaSenha123!");

    await page.getByRole("button", {
        name: "Entrar",
        exact: true,
    }).click();

    await expect(
        page.getByRole("button", {
            name: "Sair da conta",
        })
    ).toBeVisible();
});

test("deve manter os perfis isolados entre usuários", async ({
    page,
}) => {
    await login(page, ANA.email, ANA.password);

    await page.goto("/perfil");

    await page.getByLabel("Nome completo").fill(
        "Ana Perfil Privado"
    );

    await page.getByRole("button", {
        name: "Salvar alterações",
    }).click();

    await expect(
        page.getByRole("status")
    ).toContainText("Perfil atualizado com sucesso.");

    await page.getByRole("button", {
        name: "Sair da conta",
    }).click();

    await login(page, PEDRO.email, PEDRO.password);

    await page.goto("/perfil");

    await expect(
        page.getByLabel("Nome completo")
    ).toHaveValue("Pedro Costa");

    await expect(
        page.getByLabel("E-mail")
    ).toHaveValue(PEDRO.email);

    await expect(
        page.getByText("Ana Perfil Privado")
    ).toHaveCount(0);
});