import { nftDatabase } from "./data/nfts";
import type { NFT } from "../api/nfts";

const STOCK_KEY = "kurio:nft-stock:v1";

interface StockState {
    [key: string]: unknown;
}

export interface StockItem {
    nftId: string;
    quantity: number;
    editionId?: string;
}

export type StockCommitResult =
    | "APPLIED"
    | "ALREADY_APPLIED"
    | "INSUFFICIENT";

function readStoredStock(): StockState {
    try {
        const raw = localStorage.getItem(STOCK_KEY);

        if (!raw) return {};

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

function getStockKey(
    nftId: string,
    editionId?: string
): string {
    if (!editionId) {
        return nftId;
    }

    const nft = nftDatabase.find(
        (item) => item.id === nftId
    );

    // A edição que representa o produto original
    // compartilha seu estoque com o carrinho legado.
    const legacyEdition = nft?.editions?.find(
        (edition) =>
            edition.priceEth === nft.priceEth &&
            edition.available === nft.available
    );

    if (editionId === legacyEdition?.id) {
        return nftId;
    }

    return `edition:${nftId}:${editionId}`;
}

function getInitialStock(
    nftId: string,
    editionId?: string
): number {
    const nft = nftDatabase.find(
        (item) => item.id === nftId
    );

    if (!nft) return 0;

    if (!editionId) {
        return nft.available;
    }

    const edition = nft.editions?.find(
        (item) => item.id === editionId
    );

    return edition?.available ?? 0;
}

function isValidStockItem(item: StockItem): boolean {
    if (
        typeof item.nftId !== "string" ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
    ) {
        return false;
    }

    const nft = nftDatabase.find(
        (candidate) => candidate.id === item.nftId
    );

    if (!nft) return false;

    if (item.editionId !== undefined) {
        if (
            typeof item.editionId !== "string" ||
            !nft.editions?.some(
                (edition) => edition.id === item.editionId
            )
        ) {
            return false;
        }
    }

    return true;
}

export function getAvailableStock(
    nftId: string,
    editionId?: string
): number {
    const initialStock = getInitialStock(
        nftId,
        editionId
    );

    const nft = nftDatabase.find(
        (item) => item.id === nftId
    );

    if (!nft) return 0;

    if (
        editionId &&
        !nft.editions?.some(
            (edition) => edition.id === editionId
        )
    ) {
        return 0;
    }

    const stock = readStoredStock();
    const key = getStockKey(nftId, editionId);
    const stored = stock[key];

    if (
        typeof stored === "number" &&
        Number.isInteger(stored) &&
        stored >= 0 &&
        stored <= initialStock
    ) {
        return stored;
    }

    return initialStock;
}

export function getNftWithStock(nft: NFT): NFT {
    return {
        ...nft,

        available: getAvailableStock(nft.id),

        editions: nft.editions?.map((edition) => ({
            ...edition,

            available: getAvailableStock(
                nft.id,
                edition.id
            ),
        })),
    };
}

function aggregateRequested(
    items: StockItem[]
): Map<string, StockItem> | null {
    const requested = new Map<string, StockItem>();

    for (const item of items) {
        if (!isValidStockItem(item)) {
            return null;
        }

        const key = getStockKey(
            item.nftId,
            item.editionId
        );

        const previous = requested.get(key);

        requested.set(key, {
            nftId: item.nftId,
            editionId: item.editionId,
            quantity:
                (previous?.quantity ?? 0) +
                item.quantity,
        });
    }

    return requested;
}

function hasEnoughStock(
    requested: Map<string, StockItem>
): boolean {
    for (const item of requested.values()) {
        if (
            item.quantity >
            getAvailableStock(
                item.nftId,
                item.editionId
            )
        ) {
            return false;
        }
    }

    return true;
}

export function decreaseStock(
    items: StockItem[]
): boolean {
    const requested = aggregateRequested(items);

    if (!requested || requested.size === 0) {
        return false;
    }

    if (!hasEnoughStock(requested)) {
        return false;
    }

    const stock = readStoredStock();

    for (const [key, item] of requested) {
        stock[key] =
            getAvailableStock(
                item.nftId,
                item.editionId
            ) - item.quantity;
    }

    saveStock(stock);

    return true;
}

export function commitOrderStock(
    orderId: string,
    items: StockItem[]
): StockCommitResult {
    if (!orderId.trim() || items.length === 0) {
        return "INSUFFICIENT";
    }

    const stock = readStoredStock();

    const storedProcessedIds =
        stock.__processedOrderIds;

    const processedOrderIds: string[] =
        Array.isArray(storedProcessedIds)
            ? storedProcessedIds.filter(
                (id): id is string =>
                    typeof id === "string"
            )
            : [];

    if (processedOrderIds.includes(orderId)) {
        return "ALREADY_APPLIED";
    }

    const requested = aggregateRequested(items);

    if (!requested || requested.size === 0) {
        return "INSUFFICIENT";
    }

    if (!hasEnoughStock(requested)) {
        return "INSUFFICIENT";
    }

    const updatedStock: StockState = {
        ...stock,
    };

    for (const [key, item] of requested) {
        updatedStock[key] =
            getAvailableStock(
                item.nftId,
                item.editionId
            ) - item.quantity;
    }

    updatedStock.__processedOrderIds = [
        ...processedOrderIds,
        orderId,
    ];

    saveStock(updatedStock);

    return "APPLIED";
}