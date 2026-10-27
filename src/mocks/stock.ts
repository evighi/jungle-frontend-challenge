import { nftDatabase } from "./data/nfts";

import type { NFT } from "../api/nfts";

const STOCK_KEY = "kurio:nft-stock:v1";

type StockState = Record<string, number>;

function readStoredStock(): StockState {
    try {
        const raw = localStorage.getItem(STOCK_KEY);

        if (!raw) {
            return {};
        }

        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            return {};
        }

        return parsed as StockState;
    } catch {
        return {};
    }
}

function saveStock(stock: StockState): void {
    localStorage.setItem(
        STOCK_KEY,
        JSON.stringify(stock)
    );
}

export function getAvailableStock(
    nftId: string
): number {
    const nft = nftDatabase.find(
        (item) => item.id === nftId
    );

    if (!nft) {
        return 0;
    }

    const storedStock = readStoredStock();

    const quantity = storedStock[nftId];

    if (
        typeof quantity === "number" &&
        Number.isInteger(quantity) &&
        quantity >= 0 &&
        quantity <= nft.available
    ) {
        return quantity;
    }

    return nft.available;
}

export function getNftWithStock(
    nft: NFT
): NFT {
    return {
        ...nft,
        available: getAvailableStock(nft.id),
    };
}

export function decreaseStock(
    items: Array<{
        nftId: string;
        quantity: number;
    }>
): boolean {
    const requested = new Map<string, number>();

    for (const item of items) {
        if (
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        ) {
            return false;
        }

        requested.set(
            item.nftId,
            (requested.get(item.nftId) ?? 0) +
            item.quantity
        );
    }

    if (requested.size === 0) {
        return false;
    }

    // Verifica TODOS os produtos antes de alterar qualquer um.
    for (const [nftId, quantity] of requested) {
        const nft = nftDatabase.find(
            (candidate) => candidate.id === nftId
        );

        if (
            !nft ||
            quantity > getAvailableStock(nftId)
        ) {
            return false;
        }
    }

    const stock = readStoredStock();

    for (const [nftId, quantity] of requested) {
        stock[nftId] =
            getAvailableStock(nftId) - quantity;
    }

    saveStock(stock);

    return true;
}

export type StockCommitResult =
    | "APPLIED"
    | "ALREADY_APPLIED"
    | "INSUFFICIENT";

/**
 * Desconta o estoque uma única vez por pedido.
 *
 * O registro dos pedidos processados é persistido
 * junto com as quantidades, na mesma operação de escrita.
 */
export function commitOrderStock(
    orderId: string,
    items: Array<{
        nftId: string;
        quantity: number;
    }>
): StockCommitResult {
    if (!orderId.trim() || items.length === 0) {
        return "INSUFFICIENT";
    }

    const stock = readStoredStock();

    const metadata = stock as unknown as {
        __processedOrderIds?: unknown;
    };

    const processedOrderIds: string[] =
        Array.isArray(metadata.__processedOrderIds)
            ? metadata.__processedOrderIds.filter(
                (id): id is string =>
                    typeof id === "string"
            )
            : [];

    // Um pedido já processado nunca desconta novamente.
    if (processedOrderIds.includes(orderId)) {
        return "ALREADY_APPLIED";
    }

    const requested = new Map<string, number>();

    for (const item of items) {
        if (
            typeof item.nftId !== "string" ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        ) {
            return "INSUFFICIENT";
        }

        requested.set(
            item.nftId,
            (requested.get(item.nftId) ?? 0) +
            item.quantity
        );
    }

    // Valida todos os itens antes de descontar.
    for (const [nftId, quantity] of requested) {
        const nft = nftDatabase.find(
            (candidate) => candidate.id === nftId
        );

        if (
            !nft ||
            quantity > getAvailableStock(nftId)
        ) {
            return "INSUFFICIENT";
        }
    }

    const updatedStock: Record<string, unknown> = {
        ...stock,
    };

    for (const [nftId, quantity] of requested) {
        updatedStock[nftId] =
            getAvailableStock(nftId) - quantity;
    }

    updatedStock.__processedOrderIds = [
        ...processedOrderIds,
        orderId,
    ];

    localStorage.setItem(
        STOCK_KEY,
        JSON.stringify(updatedStock)
    );

    return "APPLIED";
}