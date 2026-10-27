import { test, expect, type Page } from "@playwright/test";

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

async function prepareCart(page: Page) {
  await loginAsAna(page);

  // Prepara um carrinho conhecido para os testes.
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
}

async function requestQuote(
  page: Page,
  network: "ethereum" | "polygon",
  couponCode?: string
) {
  return page.evaluate(
    async ({ network, couponCode }) => {
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
          network,
          ...(couponCode ? { couponCode } : {}),
        }),
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    },
    { network, couponCode }
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const initialized = sessionStorage.getItem(
      "kurio:e2e-initialized"
    );

    if (initialized) return;

    localStorage.removeItem("kurio:auth-token");
    localStorage.removeItem("kurio:sessions:v1");
    localStorage.removeItem("kurio:guest-cart:v1");
    localStorage.removeItem("kurio:user-cart:user-1");

    sessionStorage.setItem(
      "kurio:e2e-initialized",
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
  "deve calcular cotação em Ethereum sem cupom",
  async ({ page }) => {
    await prepareCart(page);

    const result = await requestQuote(
      page,
      "ethereum"
    );

    expect(result.status).toBe(200);

    expect(result.data.items).toHaveLength(1);

    expect(result.data.items[0].name).toBe(
      "Emerald Ape"
    );

    expect(result.data.subtotalEth).toBe("0.85");
    expect(result.data.discountEth).toBe("0");
    expect(result.data.networkFeeEth).toBe("0.003");

    // 0.85 + 0.003 = 0.853 ETH
    expect(result.data.totalEth).toBe("0.853");

    expect(result.data.network).toBe("ethereum");
    expect(result.data.couponCode).toBeNull();

    expect(result.data.quoteId).toBeTruthy();
    expect(
      new Date(result.data.expiresAt).getTime()
    ).toBeGreaterThan(Date.now());
  }
);

test(
  "deve aplicar cupom KURIO10 na cotação",
  async ({ page }) => {
    await prepareCart(page);

    const result = await requestQuote(
      page,
      "polygon",
      "KURIO10"
    );

    expect(result.status).toBe(200);

    expect(result.data.subtotalEth).toBe("0.85");

    // 10% de 0.85 ETH = 0.085 ETH
    expect(result.data.discountEth).toBe("0.085");

    expect(result.data.networkFeeEth).toBe(
      "0.0005"
    );

    // 0.85 - 0.085 + 0.0005 = 0.7655 ETH
    expect(result.data.totalEth).toBe("0.7655");

    expect(result.data.couponCode).toBe(
      "KURIO10"
    );

    expect(result.data.network).toBe("polygon");
  }
);

test(
  "deve rejeitar cupom inválido e expirado",
  async ({ page }) => {
    await prepareCart(page);

    // Cupom inexistente.
    const invalidCoupon = await requestQuote(
      page,
      "ethereum",
      "INVALIDO"
    );

    expect(invalidCoupon.status).toBe(422);

    expect(invalidCoupon.data.message).toContain(
      "Cupom não encontrado"
    );

    // Cupom expirado.
    const expiredCoupon = await requestQuote(
      page,
      "ethereum",
      "OLD10"
    );

    expect(expiredCoupon.status).toBe(410);

    expect(expiredCoupon.data.message).toContain(
      "Este cupom expirou"
    );
  }
);

test(
  "deve rejeitar cotação com carrinho vazio",
  async ({ page }) => {
    await prepareCart(page);

    // Remove todos os itens do carrinho.
    await page.evaluate(() => {
      localStorage.setItem(
        "kurio:user-cart:user-1",
        JSON.stringify([])
      );
    });

    const result = await requestQuote(
      page,
      "ethereum"
    );

    expect(result.status).toBe(400);

    expect(result.data.message).toContain(
      "O carrinho está vazio"
    );
  }
);

test(
  "deve rejeitar cotação quando o estoque é insuficiente",
  async ({ page }) => {
    await prepareCart(page);

    // Simula uma quantidade superior ao estoque.
    await page.evaluate(() => {
      localStorage.setItem(
        "kurio:user-cart:user-1",
        JSON.stringify([
          {
            nftId: "1",
            quantity: 999,
          },
        ])
      );
    });

    const result = await requestQuote(
      page,
      "ethereum"
    );

    expect(result.status).toBe(409);

    expect(result.data.message).toContain(
      "Estoque insuficiente"
    );

    expect(result.data.nftId).toBe("1");
  }
);

test(
  "deve exigir autenticação para gerar cotação",
  async ({ page }) => {
    // Não realiza login.
    const result = await page.evaluate(async () => {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

    expect(result.status).toBe(401);

    expect(result.data.message).toContain(
      "Faça login"
    );
  }
);

test(
  "deve rejeitar rede blockchain inválida",
  async ({ page }) => {
    await prepareCart(page);

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
          network: "solana",
        }),
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    });

    expect(result.status).toBe(400);

    expect(result.data.message).toContain(
      "Rede blockchain inválida"
    );
  }
);