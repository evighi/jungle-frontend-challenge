import {
    test,
    expect,
    type Page,
} from "@playwright/test";

const ANA = {
    email: "ana@kurio.test",
    password: "Demo1234!",
};

const PEDRO = {
    email: "pedro@kurio.test",
    password: "Demo1234!",
};

const NFT_NAME = "Emerald Ape";

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

async function openCatalog(page: Page) {
    await page.goto("/");

    await expect(
        page.getByRole("heading", {
            name: NFT_NAME,
        })
    ).toBeVisible();
}

test(
    "deve exigir autenticação para favoritar",
    async ({ page }) => {
        await openCatalog(page);

        await page.getByRole("button", {
            name: `Adicionar ${NFT_NAME} aos favoritos`,
        }).click();

        await expect(page).toHaveURL(/\/login/);
    }
);

test(
    "deve adicionar e remover um favorito",
    async ({ page }) => {
        await login(page, ANA.email, ANA.password);

        await openCatalog(page);

        const addButton = page.getByRole("button", {
            name: `Adicionar ${NFT_NAME} aos favoritos`,
        });

        await expect(addButton).toBeVisible();

        await addButton.click();

        const removeButton = page.getByRole("button", {
            name: `Remover ${NFT_NAME} dos favoritos`,
        });

        await expect(removeButton).toBeVisible();

        await expect(removeButton).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        await removeButton.click();

        await expect(addButton).toBeVisible();

        await expect(addButton).toHaveAttribute(
            "aria-pressed",
            "false"
        );
    }
);

test(
    "deve preservar favoritos após refresh",
    async ({ page }) => {
        await login(page, ANA.email, ANA.password);

        await openCatalog(page);

        await page.getByRole("button", {
            name: `Adicionar ${NFT_NAME} aos favoritos`,
        }).click();

        await expect(
            page.getByRole("button", {
                name: `Remover ${NFT_NAME} dos favoritos`,
            })
        ).toBeVisible();

        // Aguarda a gravação no MSW antes do refresh.
        const favoriteSaved = await page.evaluate(
            async () => {
                const token = localStorage.getItem(
                    "kurio:auth-token"
                );

                const response = await fetch(
                    "/api/favorites",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) return false;

                const data = (await response.json()) as {
                    nftIds: string[];
                };

                return data.nftIds.includes("1");
            }
        );

        expect(favoriteSaved).toBe(true);

        await page.reload();

        await expect(
            page.getByRole("button", {
                name: `Remover ${NFT_NAME} dos favoritos`,
            })
        ).toBeVisible();
    }
);

test(
    "deve sincronizar favorito entre catálogo e detalhe",
    async ({ page }) => {
        await login(page, ANA.email, ANA.password);

        await openCatalog(page);

        await page.getByRole("button", {
            name: `Adicionar ${NFT_NAME} aos favoritos`,
        }).click();

        await expect(
            page.getByRole("button", {
                name: `Remover ${NFT_NAME} dos favoritos`,
            })
        ).toBeVisible();

        await page.getByRole("link", {
            name: "Ver detalhes",
        }).first().click();

        await expect(
            page.getByRole("heading", {
                name: NFT_NAME,
            })
        ).toBeVisible();

        await expect(
            page.getByRole("button", {
                name: `Remover ${NFT_NAME} dos favoritos`,
            })
        ).toBeVisible();

        await page.getByRole("button", {
            name: `Remover ${NFT_NAME} dos favoritos`,
        }).click();

        await expect(
            page.getByRole("button", {
                name: `Adicionar ${NFT_NAME} aos favoritos`,
            })
        ).toBeVisible();
    }
);

test(
    "deve isolar favoritos entre usuários",
    async ({ page }) => {
        await login(page, ANA.email, ANA.password);

        await openCatalog(page);

        await page.getByRole("button", {
            name: `Adicionar ${NFT_NAME} aos favoritos`,
        }).click();

        await expect(
            page.getByRole("button", {
                name: `Remover ${NFT_NAME} dos favoritos`,
            })
        ).toBeVisible();

        await page.getByRole("button", {
            name: "Sair da conta",
        }).click();

        await login(
            page,
            PEDRO.email,
            PEDRO.password
        );

        await openCatalog(page);

        await expect(
            page.getByRole("button", {
                name: `Adicionar ${NFT_NAME} aos favoritos`,
            })
        ).toBeVisible();

        await expect(
            page.getByRole("button", {
                name: `Remover ${NFT_NAME} dos favoritos`,
            })
        ).toHaveCount(0);
    }
);

test(
    "deve restaurar o favorito quando a API falhar",
    async ({ page }) => {
        // Intercepta XMLHttpRequest antes de carregar a aplicação.
        // O código abaixo existe somente no ambiente do teste.
        await page.addInitScript(() => {
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;

            const favoriteMutations = new WeakSet<XMLHttpRequest>();

            XMLHttpRequest.prototype.open = function (
                method,
                url,
                async = true,
                username?,
                password?
            ) {
                const isFavoriteMutation =
                    ["POST", "DELETE"].includes(method.toUpperCase()) &&
                    String(url).includes("/api/favorites/");

                if (isFavoriteMutation) {
                    favoriteMutations.add(this);
                }

                return Reflect.apply(originalOpen, this, [
                    method,
                    url,
                    async,
                    username,
                    password,
                ]);
            };

            XMLHttpRequest.prototype.send = function (body) {
                if (
                    favoriteMutations.has(this) &&
                    localStorage.getItem(
                        "kurio:test:favorites-fail"
                    ) === "1"
                ) {
                    this.setRequestHeader(
                        "x-mock-scenario",
                        "favorites-fail"
                    );
                }

                return originalSend.call(this, body);
            };
        });

        await login(page, ANA.email, ANA.password);

        await openCatalog(page);

        const addButton = page.getByRole("button", {
            name: `Adicionar ${NFT_NAME} aos favoritos`,
        });

        await expect(addButton).toBeVisible();

        // Ativa a falha exclusivamente para o próximo clique.
        await page.evaluate(() => {
            localStorage.setItem(
                "kurio:test:favorites-fail",
                "1"
            );
        });

        await addButton.click();

        // A requisição deve falhar e executar o rollback.
        await expect(
            page.getByRole("alert")
        ).toContainText(
            "Não foi possível atualizar os favoritos."
        );

        // O NFT não pode permanecer favoritado.
        await expect(addButton).toBeVisible();

        await expect(addButton).toHaveAttribute(
            "aria-pressed",
            "false"
        );

        // Confirma que o mock não persistiu a alteração.
        const persistedFavorites = await page.evaluate(
            async () => {
                const token = localStorage.getItem(
                    "kurio:auth-token"
                );

                const response = await fetch(
                    "/api/favorites",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "Não foi possível consultar os favoritos."
                    );
                }

                return (await response.json()) as {
                    nftIds: string[];
                };
            }
        );

        expect(
            persistedFavorites.nftIds
        ).not.toContain("1");

        // Desativa a simulação de falha.
        await page.evaluate(() => {
            localStorage.removeItem(
                "kurio:test:favorites-fail"
            );
        });

        // O usuário deve conseguir repetir a operação.
        await addButton.click();

        await expect(
            page.getByRole("button", {
                name: `Remover ${NFT_NAME} dos favoritos`,
            })
        ).toBeVisible();
    }
);