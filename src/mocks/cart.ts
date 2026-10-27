import { http, HttpResponse } from "msw";
import { nftDatabase } from "./data/nfts";
import { resolveRequestIdentity } from "./auth";
import {
    getAvailableStock,
    getNftWithStock,
} from "./stock";

interface StoredCartItem {
    nftId: string;
    quantity: number;
}

const GUEST_CART_KEY = "kurio:guest-cart:v1";

function getCartStorageKey(request: Request): string | null {
    const identity = resolveRequestIdentity(request);

    if (identity.type === "invalid") {
        return null;
    }

    if (identity.type === "guest") {
        return GUEST_CART_KEY;
    }

    return `kurio:user-cart:${identity.userId}`;
}

function unauthorizedResponse() {
    return HttpResponse.json(
        {
            message: "Sessão inválida ou expirada. Faça login novamente.",
        },
        { status: 401 }
    );
}

function readCart(storageKey: string): StoredCartItem[] {
    try {
        const stored = localStorage.getItem(storageKey);

        if (!stored) return [];

        const parsed: unknown = JSON.parse(stored);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(
            (item): item is StoredCartItem =>
                typeof item === "object" &&
                item !== null &&
                typeof item.nftId === "string" &&
                typeof item.quantity === "number" &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0
        );
    } catch {
        return [];
    }
}

function saveCart(
    storageKey: string,
    items: StoredCartItem[]
) {
    localStorage.setItem(storageKey, JSON.stringify(items));
}

function cartResponse(items: StoredCartItem[]) {
    const populatedItems = items.flatMap((item) => {
        const nft = nftDatabase.find(
            (candidate) => candidate.id === item.nftId
        );

        if (!nft) return [];

        return [
            {
                nft: getNftWithStock(nft),
                quantity: item.quantity,
            },
        ];
    });

    return {
        items: populatedItems,
        totalItems: populatedItems.reduce(
            (total, item) => total + item.quantity,
            0
        ),
    };
}

export const cartHandlers = [
    // CONSULTAR CARRINHO
    http.get("/api/cart", ({ request }) => {
        const storageKey = getCartStorageKey(request);

        if (!storageKey) {
            return unauthorizedResponse();
        }

        return HttpResponse.json(
            cartResponse(readCart(storageKey))
        );
    }),

    // ADICIONAR NFT AO CARRINHO
    http.post("/api/cart/items", async ({ request }) => {
        const storageKey = getCartStorageKey(request);

        if (!storageKey) {
            return unauthorizedResponse();
        }

        const body = (await request.json()) as {
            nftId?: unknown;
            quantity?: unknown;
        };

        if (
            typeof body.nftId !== "string" ||
            typeof body.quantity !== "number" ||
            !Number.isInteger(body.quantity) ||
            body.quantity <= 0
        ) {
            return HttpResponse.json(
                { message: "Dados inválidos." },
                { status: 400 }
            );
        }

        const nft = nftDatabase.find(
            (item) => item.id === body.nftId
        );

        if (!nft) {
            return HttpResponse.json(
                { message: "NFT não encontrado." },
                { status: 404 }
            );
        }

        const cart = readCart(storageKey);

        const existing = cart.find(
            (item) => item.nftId === body.nftId
        );

        const newQuantity =
            (existing?.quantity ?? 0) + body.quantity;

        if (newQuantity > getAvailableStock(nft.id)) {
            return HttpResponse.json(
                { message: "Quantidade indisponível." },
                { status: 409 }
            );
        }

        if (existing) {
            existing.quantity = newQuantity;
        } else {
            cart.push({
                nftId: nft.id,
                quantity: body.quantity,
            });
        }

        saveCart(storageKey, cart);

        return HttpResponse.json(cartResponse(cart));
    }),

    // ATUALIZAR QUANTIDADE
    http.patch(
        "/api/cart/items/:nftId",
        async ({ params, request }) => {
            const storageKey = getCartStorageKey(request);

            if (!storageKey) {
                return unauthorizedResponse();
            }

            const body = (await request.json()) as {
                quantity?: unknown;
            };

            if (
                typeof body.quantity !== "number" ||
                !Number.isInteger(body.quantity) ||
                body.quantity <= 0
            ) {
                return HttpResponse.json(
                    { message: "Quantidade inválida." },
                    { status: 400 }
                );
            }

            const nft = nftDatabase.find(
                (item) => item.id === params.nftId
            );

            const cart = readCart(storageKey);

            const existing = cart.find(
                (item) => item.nftId === params.nftId
            );

            if (!nft || !existing) {
                return HttpResponse.json(
                    { message: "Item não encontrado." },
                    { status: 404 }
                );
            }

            if (body.quantity > getAvailableStock(nft.id)) {
                return HttpResponse.json(
                    { message: "Estoque insuficiente." },
                    { status: 409 }
                );
            }

            existing.quantity = body.quantity;

            saveCart(storageKey, cart);

            return HttpResponse.json(cartResponse(cart));
        }
    ),

    // REMOVER NFT DO CARRINHO
    http.delete(
        "/api/cart/items/:nftId",
        ({ params, request }) => {
            const storageKey = getCartStorageKey(request);

            if (!storageKey) {
                return unauthorizedResponse();
            }

            const cart = readCart(storageKey);

            const existing = cart.find(
                (item) => item.nftId === params.nftId
            );

            if (!existing) {
                return HttpResponse.json(
                    { message: "Item não encontrado." },
                    { status: 404 }
                );
            }

            const updated = cart.filter(
                (item) => item.nftId !== params.nftId
            );

            saveCart(storageKey, updated);

            return HttpResponse.json(cartResponse(updated));
        }
    ),
    // TRANSFERIR CARRINHO DE VISITANTE PARA USUÁRIO
    http.post("/api/cart/merge", ({ request }) => {
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message: "Faça login para transferir o carrinho.",
                },
                { status: 401 }
            );
        }

        const userStorageKey =
            `kurio:user-cart:${identity.userId}`;

        const guestCart = readCart(GUEST_CART_KEY);

        // Nenhum item para transferir.
        if (guestCart.length === 0) {
            return HttpResponse.json(
                cartResponse(readCart(userStorageKey))
            );
        }

        const userCart = readCart(userStorageKey);

        // Combina quantidades dos dois carrinhos.
        const mergedQuantities = new Map<string, number>();

        for (const item of [...userCart, ...guestCart]) {
            const currentQuantity =
                mergedQuantities.get(item.nftId) ?? 0;

            mergedQuantities.set(
                item.nftId,
                currentQuantity + item.quantity
            );
        }

        const mergedCart: StoredCartItem[] = [];

        // Valida todos os itens antes de salvar qualquer alteração.
        for (const [nftId, quantity] of mergedQuantities) {
            const nft = nftDatabase.find(
                (item) => item.id === nftId
            );

            if (!nft) {
                return HttpResponse.json(
                    {
                        message:
                            "Um dos NFTs do carrinho não está mais disponível.",
                        nftId,
                    },
                    { status: 409 }
                );
            }

            if (quantity > getAvailableStock(nft.id)) {
                return HttpResponse.json(
                    {
                        message:
                            `Estoque insuficiente para ${nft.name}.`,
                        nftId,
                        requestedQuantity: quantity,
                        availableQuantity: getAvailableStock(nft.id),
                    },
                    { status: 409 }
                );
            }

            mergedCart.push({
                nftId,
                quantity,
            });
        }

        // Salva somente depois que todas as validações passarem.
        saveCart(userStorageKey, mergedCart);

        // Limpa o carrinho visitante após a transferência.
        localStorage.removeItem(GUEST_CART_KEY);

        return HttpResponse.json(cartResponse(mergedCart));
    }),
];