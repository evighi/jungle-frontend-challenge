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
    editionId?: string;
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

function getItemKey(
    nftId: string,
    editionId?: string
): string {
    return JSON.stringify([
        nftId,
        editionId ?? null,
    ]);
}

function isStoredCartItem(
    item: unknown
): item is StoredCartItem {
    if (
        typeof item !== "object" ||
        item === null
    ) {
        return false;
    }

    const candidate = item as Record<string, unknown>;

    return (
        typeof candidate.nftId === "string" &&
        typeof candidate.quantity === "number" &&
        Number.isInteger(candidate.quantity) &&
        candidate.quantity > 0 &&
        (
            candidate.editionId === undefined ||
            (
                typeof candidate.editionId === "string" &&
                candidate.editionId.length > 0
            )
        )
    );
}

function readCart(storageKey: string): StoredCartItem[] {
    try {
        const stored = localStorage.getItem(storageKey);

        if (!stored) return [];

        const parsed: unknown = JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isStoredCartItem);
    } catch {
        return [];
    }
}

function saveCart(
    storageKey: string,
    items: StoredCartItem[]
): void {
    localStorage.setItem(
        storageKey,
        JSON.stringify(items)
    );
}

function findNft(nftId: string) {
    return nftDatabase.find(
        (item) => item.id === nftId
    );
}

function findEdition(
    nftId: string,
    editionId?: string
) {
    if (!editionId) return undefined;

    const nft = findNft(nftId);

    return nft?.editions?.find(
        (edition) => edition.id === editionId
    );
}

function isValidEdition(
    nftId: string,
    editionId?: string
): boolean {
    if (!editionId) {
        return true;
    }

    return Boolean(findEdition(nftId, editionId));
}

function cartResponse(items: StoredCartItem[]) {
    const populatedItems = items.flatMap((item) => {
        const nft = findNft(item.nftId);

        if (!nft) return [];

        const nftWithStock = getNftWithStock(nft);

        const edition = item.editionId
            ? nftWithStock.editions?.find(
                (candidate) =>
                    candidate.id === item.editionId
            )
            : undefined;

        if (item.editionId && !edition) {
            return [];
        }

        return [
            {
                nft: nftWithStock,
                quantity: item.quantity,

                ...(item.editionId
                    ? { editionId: item.editionId }
                    : {}),

                ...(edition ? { edition } : {}),
            },
        ];
    });

    return {
        items: populatedItems,

        totalItems: populatedItems.reduce(
            (total, item) =>
                total + item.quantity,
            0
        ),
    };
}

function getRequestedEditionId(
    value: unknown
): string | undefined | null {
    if (value === undefined) {
        return undefined;
    }

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        return null;
    }

    return value;
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

    // ADICIONAR ITEM
    http.post("/api/cart/items", async ({ request }) => {
        const storageKey = getCartStorageKey(request);

        if (!storageKey) {
            return unauthorizedResponse();
        }

        let body: {
            nftId?: unknown;
            quantity?: unknown;
            editionId?: unknown;
        };

        try {
            body = (await request.json()) as typeof body;
        } catch {
            return HttpResponse.json(
                { message: "Dados inválidos." },
                { status: 400 }
            );
        }

        const editionId = getRequestedEditionId(
            body.editionId
        );

        if (
            typeof body.nftId !== "string" ||
            typeof body.quantity !== "number" ||
            !Number.isInteger(body.quantity) ||
            body.quantity <= 0 ||
            editionId === null
        ) {
            return HttpResponse.json(
                { message: "Dados inválidos." },
                { status: 400 }
            );
        }

        const nft = findNft(body.nftId);

        if (!nft) {
            return HttpResponse.json(
                { message: "NFT não encontrado." },
                { status: 404 }
            );
        }

        if (!isValidEdition(nft.id, editionId)) {
            return HttpResponse.json(
                { message: "Edição não encontrada." },
                { status: 404 }
            );
        }

        const cart = readCart(storageKey);

        const existing = cart.find(
            (item) =>
                getItemKey(item.nftId, item.editionId) ===
                getItemKey(nft.id, editionId)
        );

        const newQuantity =
            (existing?.quantity ?? 0) + body.quantity;

        const available = getAvailableStock(
            nft.id,
            editionId
        );

        if (newQuantity > available) {
            return HttpResponse.json(
                {
                    message: "Quantidade indisponível.",
                    availableQuantity: available,
                },
                { status: 409 }
            );
        }

        if (existing) {
            existing.quantity = newQuantity;
        } else {
            cart.push({
                nftId: nft.id,
                quantity: body.quantity,

                ...(editionId
                    ? { editionId }
                    : {}),
            });
        }

        saveCart(storageKey, cart);

        return HttpResponse.json(
            cartResponse(cart)
        );
    }),

    // ATUALIZAR QUANTIDADE
    http.patch(
        "/api/cart/items/:nftId",
        async ({ params, request }) => {
            const storageKey = getCartStorageKey(request);

            if (!storageKey) {
                return unauthorizedResponse();
            }

            let body: {
                quantity?: unknown;
                editionId?: unknown;
            };

            try {
                body = (await request.json()) as typeof body;
            } catch {
                return HttpResponse.json(
                    { message: "Dados inválidos." },
                    { status: 400 }
                );
            }

            const editionId = getRequestedEditionId(
                body.editionId
            );

            if (
                typeof body.quantity !== "number" ||
                !Number.isInteger(body.quantity) ||
                body.quantity <= 0 ||
                editionId === null
            ) {
                return HttpResponse.json(
                    { message: "Quantidade inválida." },
                    { status: 400 }
                );
            }

            const nftId = String(params.nftId);
            const nft = findNft(nftId);

            const cart = readCart(storageKey);

            const existing = cart.find(
                (item) =>
                    getItemKey(item.nftId, item.editionId) ===
                    getItemKey(nftId, editionId)
            );

            if (!nft || !existing) {
                return HttpResponse.json(
                    { message: "Item não encontrado." },
                    { status: 404 }
                );
            }

            if (!isValidEdition(nftId, editionId)) {
                return HttpResponse.json(
                    { message: "Edição não encontrada." },
                    { status: 404 }
                );
            }

            const available = getAvailableStock(
                nftId,
                editionId
            );

            if (body.quantity > available) {
                return HttpResponse.json(
                    {
                        message: "Estoque insuficiente.",
                        availableQuantity: available,
                    },
                    { status: 409 }
                );
            }

            existing.quantity = body.quantity;

            saveCart(storageKey, cart);

            return HttpResponse.json(
                cartResponse(cart)
            );
        }
    ),

    // REMOVER ITEM
    http.delete(
        "/api/cart/items/:nftId",
        ({ params, request }) => {
            const storageKey = getCartStorageKey(request);

            if (!storageKey) {
                return unauthorizedResponse();
            }

            const url = new URL(request.url);

            const editionId = getRequestedEditionId(
                url.searchParams.get("editionId") ?? undefined
            );

            if (editionId === null) {
                return HttpResponse.json(
                    { message: "Edição inválida." },
                    { status: 400 }
                );
            }

            const nftId = String(params.nftId);

            const cart = readCart(storageKey);

            const existing = cart.find(
                (item) =>
                    getItemKey(item.nftId, item.editionId) ===
                    getItemKey(nftId, editionId)
            );

            if (!existing) {
                return HttpResponse.json(
                    { message: "Item não encontrado." },
                    { status: 404 }
                );
            }

            const updated = cart.filter(
                (item) =>
                    getItemKey(item.nftId, item.editionId) !==
                    getItemKey(nftId, editionId)
            );

            saveCart(storageKey, updated);

            return HttpResponse.json(
                cartResponse(updated)
            );
        }
    ),

    // TRANSFERIR CARRINHO VISITANTE
    http.post("/api/cart/merge", ({ request }) => {
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message:
                        "Faça login para transferir o carrinho.",
                },
                { status: 401 }
            );
        }

        const userStorageKey =
            `kurio:user-cart:${identity.userId}`;

        const guestCart = readCart(GUEST_CART_KEY);

        if (guestCart.length === 0) {
            return HttpResponse.json(
                cartResponse(readCart(userStorageKey))
            );
        }

        const userCart = readCart(userStorageKey);

        const mergedQuantities =
            new Map<string, StoredCartItem>();

        for (const item of [...userCart, ...guestCart]) {
            const key = getItemKey(
                item.nftId,
                item.editionId
            );

            const previous = mergedQuantities.get(key);

            mergedQuantities.set(key, {
                nftId: item.nftId,
                quantity:
                    (previous?.quantity ?? 0) +
                    item.quantity,

                ...(item.editionId
                    ? { editionId: item.editionId }
                    : {}),
            });
        }

        const mergedCart: StoredCartItem[] = [];

        // Valida todos os itens antes de salvar.
        for (const item of mergedQuantities.values()) {
            const nft = findNft(item.nftId);

            if (!nft) {
                return HttpResponse.json(
                    {
                        message:
                            "Um dos NFTs do carrinho não está mais disponível.",
                        nftId: item.nftId,
                    },
                    { status: 409 }
                );
            }

            if (!isValidEdition(item.nftId, item.editionId)) {
                return HttpResponse.json(
                    {
                        message:
                            "Uma edição do carrinho não está disponível.",
                        nftId: item.nftId,
                        editionId: item.editionId,
                    },
                    { status: 409 }
                );
            }

            const available = getAvailableStock(
                item.nftId,
                item.editionId
            );

            if (item.quantity > available) {
                return HttpResponse.json(
                    {
                        message:
                            `Estoque insuficiente para ${nft.name}.`,
                        nftId: item.nftId,
                        editionId: item.editionId,
                        requestedQuantity: item.quantity,
                        availableQuantity: available,
                    },
                    { status: 409 }
                );
            }

            mergedCart.push(item);
        }

        saveCart(userStorageKey, mergedCart);

        localStorage.removeItem(GUEST_CART_KEY);

        return HttpResponse.json(
            cartResponse(mergedCart)
        );
    }),
];