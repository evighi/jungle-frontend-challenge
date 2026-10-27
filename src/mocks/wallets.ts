import { http, HttpResponse } from "msw";

import { resolveRequestIdentity } from "./auth";

import type {
    Wallet,
    CreateWalletRequest,
    UpdateWalletRequest,
    WalletConnectionRequest,
} from "../api/wallets";

const WALLETS_KEY = "kurio:wallets:v1";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function readWallets(): Wallet[] {
    try {
        const stored = localStorage.getItem(WALLETS_KEY);

        if (!stored) return [];

        const parsed: unknown = JSON.parse(stored);

        return Array.isArray(parsed)
            ? (parsed as Wallet[])
            : [];
    } catch {
        return [];
    }
}

function saveWallets(wallets: Wallet[]): void {
    localStorage.setItem(
        WALLETS_KEY,
        JSON.stringify(wallets)
    );
}

function isValidNetwork(
    network: unknown
): network is Wallet["network"] {
    return (
        network === "ethereum" ||
        network === "polygon"
    );
}

function isValidAddress(
    address: unknown
): address is string {
    return (
        typeof address === "string" &&
        ADDRESS_REGEX.test(address)
    );
}

function getUserWallets(
    userId: string
): Wallet[] {
    return readWallets().filter(
        (wallet) => wallet.userId === userId
    );
}

export const walletHandlers = [
    // Consultar carteiras.
    http.get("/api/wallets", ({ request }) => {
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message:
                        "Faça login para consultar suas carteiras.",
                },
                { status: 401 }
            );
        }

        return HttpResponse.json(
            getUserWallets(identity.userId)
        );
    }),

    // Cadastrar carteira.
    http.post("/api/wallets", async ({ request }) => {
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message:
                        "Faça login para cadastrar uma carteira.",
                },
                { status: 401 }
            );
        }

        let body: Partial<CreateWalletRequest>;

        try {
            body = (await request.json()) as Partial<CreateWalletRequest>;
        } catch {
            return HttpResponse.json(
                {
                    message: "Dados inválidos.",
                },
                { status: 400 }
            );
        }

        if (
            typeof body.label !== "string" ||
            body.label.trim().length < 2 ||
            !isValidAddress(body.address) ||
            !isValidNetwork(body.network) ||
            (
                body.isPrimary !== undefined &&
                typeof body.isPrimary !== "boolean"
            )
        ) {
            return HttpResponse.json(
                {
                    message:
                        "Informe um nome, endereço e rede válidos.",
                },
                { status: 400 }
            );
        }

        const wallets = readWallets();

        const userWallets = wallets.filter(
            (wallet) =>
                wallet.userId === identity.userId
        );

        const duplicate = userWallets.some(
            (wallet) =>
                wallet.address.toLowerCase() ===
                body.address!.toLowerCase()
        );

        if (duplicate) {
            return HttpResponse.json(
                {
                    message:
                        "Esta carteira já está cadastrada.",
                },
                { status: 409 }
            );
        }

        const shouldBePrimary =
            userWallets.length === 0 ||
            body.isPrimary === true;

        if (shouldBePrimary) {
            for (const wallet of wallets) {
                if (wallet.userId === identity.userId) {
                    wallet.isPrimary = false;
                }
            }
        }

        const now = new Date().toISOString();

        const wallet: Wallet = {
            id: crypto.randomUUID(),
            userId: identity.userId,

            label: body.label.trim(),
            address: body.address,

            network: body.network,

            isPrimary: shouldBePrimary,

            connectionStatus: "DISCONNECTED",

            createdAt: now,
            updatedAt: now,
        };

        wallets.push(wallet);

        saveWallets(wallets);

        return HttpResponse.json(
            wallet,
            { status: 201 }
        );
    }),

    // Editar carteira.
    http.patch(
        "/api/wallets/:walletId",
        async ({ request, params }) => {
            const identity =
                resolveRequestIdentity(request);

            if (identity.type !== "authenticated") {
                return HttpResponse.json(
                    {
                        message: "Sessão inválida.",
                    },
                    { status: 401 }
                );
            }

            const wallets = readWallets();

            const wallet = wallets.find(
                (item) =>
                    item.id === params.walletId &&
                    item.userId === identity.userId
            );

            if (!wallet) {
                return HttpResponse.json(
                    {
                        message:
                            "Carteira não encontrada.",
                    },
                    { status: 404 }
                );
            }

            let body: UpdateWalletRequest;

            try {
                const parsed: unknown = await request.json();

                if (
                    typeof parsed !== "object" ||
                    parsed === null ||
                    Array.isArray(parsed)
                ) {
                    throw new Error("Invalid body");
                }

                body = parsed as UpdateWalletRequest;
            } catch {
                return HttpResponse.json(
                    {
                        message: "Dados inválidos.",
                    },
                    { status: 400 }
                );
            }

            if (
                (
                    body.label !== undefined &&
                    (
                        typeof body.label !== "string" ||
                        body.label.trim().length < 2
                    )
                ) ||
                (
                    body.network !== undefined &&
                    !isValidNetwork(body.network)
                ) ||
                (
                    body.isPrimary !== undefined &&
                    typeof body.isPrimary !== "boolean"
                )
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "Dados da carteira inválidos.",
                    },
                    { status: 400 }
                );
            }

            // Evita deixar o usuário sem carteira principal.
            if (
                body.isPrimary === false &&
                wallet.isPrimary
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "Defina outra carteira como principal antes.",
                    },
                    { status: 409 }
                );
            }

            if (body.label !== undefined) {
                wallet.label = body.label.trim();
            }

            if (body.network !== undefined) {
                wallet.network = body.network;

                // Alterar a rede exige nova conexão.
                wallet.connectionStatus = "DISCONNECTED";
            }

            if (body.isPrimary === true) {
                for (const item of wallets) {
                    if (item.userId === identity.userId) {
                        item.isPrimary =
                            item.id === wallet.id;
                    }
                }
            }

            wallet.updatedAt =
                new Date().toISOString();

            saveWallets(wallets);

            return HttpResponse.json(wallet);
        }
    ),

    // Simular conexão e desconexão.
    http.post(
        "/api/wallets/:walletId/connection",
        async ({ request, params }) => {
            const identity =
                resolveRequestIdentity(request);

            if (identity.type !== "authenticated") {
                return HttpResponse.json(
                    {
                        message: "Sessão inválida.",
                    },
                    { status: 401 }
                );
            }

            const wallets = readWallets();

            const wallet = wallets.find(
                (item) =>
                    item.id === params.walletId &&
                    item.userId === identity.userId
            );

            if (!wallet) {
                return HttpResponse.json(
                    {
                        message:
                            "Carteira não encontrada.",
                    },
                    { status: 404 }
                );
            }

            let body: WalletConnectionRequest;

            try {
                body =
                    (await request.json()) as WalletConnectionRequest;
            } catch {
                return HttpResponse.json(
                    {
                        message: "Dados inválidos.",
                    },
                    { status: 400 }
                );
            }

            if (
                body.action !== "CONNECT" &&
                body.action !== "DISCONNECT"
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "Ação de conexão inválida.",
                    },
                    { status: 400 }
                );
            }

            // Cenário determinístico de recusa.
            // Pode ser acionado pelos testes automatizados.
            if (
                body.action === "CONNECT" &&
                request.headers.get("x-mock-scenario") ===
                    "wallet-refused"
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "A conexão foi recusada pelo usuário.",
                    },
                    { status: 409 }
                );
            }

            wallet.connectionStatus =
                body.action === "CONNECT"
                    ? "CONNECTED"
                    : "DISCONNECTED";

            wallet.updatedAt =
                new Date().toISOString();

            saveWallets(wallets);

            return HttpResponse.json(wallet);
        }
    ),
];