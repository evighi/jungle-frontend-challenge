import { http, HttpResponse } from "msw";

import { nftDatabase } from "./data/nfts";
import { resolveRequestIdentity } from "./auth";
import { getAvailableStock } from "./stock";

import type {
    BlockchainNetwork,
    QuoteItem,
    QuoteResponse,
} from "../api/quote";

interface StoredCartItem {
    nftId: string;
    quantity: number;
    editionId?: string;
}

interface QuoteRequestBody {
    network?: unknown;
    couponCode?: unknown;
}

interface StoredQuote {
    userId: string;
    quote: QuoteResponse;
}

const QUOTES_KEY = "kurio:quotes:v1";

const WEI = 10n ** 18n;

const NETWORK_FEES: Record<BlockchainNetwork, bigint> = {
    ethereum: 3_000_000_000_000_000n,
    polygon: 500_000_000_000_000n,
};

function ethToWei(value: string): bigint {
    if (!/^\d+(\.\d{1,18})?$/.test(value)) {
        throw new Error("Valor de ETH inválido.");
    }

    const [integer, decimal = ""] = value.split(".");

    return (
        BigInt(integer) * WEI +
        BigInt(decimal.padEnd(18, "0"))
    );
}

function weiToEth(value: bigint): string {
    const integer = value / WEI;

    const decimal = (value % WEI)
        .toString()
        .padStart(18, "0")
        .replace(/0+$/, "");

    return decimal
        ? `${integer}.${decimal}`
        : integer.toString();
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

    const value = item as Record<string, unknown>;

    return (
        typeof value.nftId === "string" &&
        typeof value.quantity === "number" &&
        Number.isInteger(value.quantity) &&
        value.quantity > 0 &&
        (
            value.editionId === undefined ||
            (
                typeof value.editionId === "string" &&
                value.editionId.length > 0
            )
        )
    );
}

function readCart(userId: string): StoredCartItem[] {
    try {
        const stored = localStorage.getItem(
            `kurio:user-cart:${userId}`
        );

        if (!stored) return [];

        const parsed: unknown = JSON.parse(stored);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(isStoredCartItem);
    } catch {
        return [];
    }
}

function saveQuote(
    userId: string,
    quote: QuoteResponse
): void {
    let storedQuotes: StoredQuote[] = [];

    try {
        const stored = localStorage.getItem(QUOTES_KEY);

        if (stored) {
            const parsed: unknown = JSON.parse(stored);

            if (Array.isArray(parsed)) {
                storedQuotes = parsed;
            }
        }
    } catch {
        storedQuotes = [];
    }

    const validQuotes = storedQuotes.filter(
        (item) =>
            item &&
            item.quote &&
            new Date(item.quote.expiresAt).getTime() > Date.now()
    );

    validQuotes.push({
        userId,
        quote,
    });

    localStorage.setItem(
        QUOTES_KEY,
        JSON.stringify(validQuotes)
    );
}

export const quoteHandlers = [
    // GERAR COTAÇÃO
    http.post("/api/quote", async ({ request }) => {
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message:
                        "Faça login para solicitar uma cotação.",
                },
                { status: 401 }
            );
        }

        let body: QuoteRequestBody;

        try {
            body = (await request.json()) as QuoteRequestBody;
        } catch {
            return HttpResponse.json(
                {
                    message: "Corpo da requisição inválido.",
                },
                { status: 400 }
            );
        }

        if (
            body.network !== "ethereum" &&
            body.network !== "polygon"
        ) {
            return HttpResponse.json(
                {
                    message: "Rede blockchain inválida.",
                },
                { status: 400 }
            );
        }

        if (
            body.couponCode !== undefined &&
            typeof body.couponCode !== "string"
        ) {
            return HttpResponse.json(
                { message: "Cupom inválido." },
                { status: 400 }
            );
        }

        const network = body.network;

        const couponCode =
            typeof body.couponCode === "string"
                ? body.couponCode.trim().toUpperCase()
                : "";

        // VALIDAÇÃO DO CUPOM
        if (couponCode && couponCode !== "KURIO10") {
            if (couponCode === "OLD10") {
                return HttpResponse.json(
                    { message: "Este cupom expirou." },
                    { status: 410 }
                );
            }

            return HttpResponse.json(
                { message: "Cupom não encontrado." },
                { status: 422 }
            );
        }

        // CONSULTA CARRINHO
        const cart = readCart(identity.userId);

        if (cart.length === 0) {
            return HttpResponse.json(
                { message: "O carrinho está vazio." },
                { status: 400 }
            );
        }

        const items: QuoteItem[] = [];

        let subtotalWei = 0n;

        // VALIDA CADA NFT E EDIÇÃO
        for (const cartItem of cart) {
            const nft = nftDatabase.find(
                (candidate) =>
                    candidate.id === cartItem.nftId
            );

            if (!nft) {
                return HttpResponse.json(
                    {
                        message:
                            "Um NFT do carrinho não foi encontrado.",
                        nftId: cartItem.nftId,
                    },
                    { status: 404 }
                );
            }

            const edition = cartItem.editionId
                ? nft.editions?.find(
                    (candidate) =>
                        candidate.id === cartItem.editionId
                )
                : undefined;

            if (cartItem.editionId && !edition) {
                return HttpResponse.json(
                    {
                        message:
                            "Uma edição do carrinho não foi encontrada.",
                        nftId: nft.id,
                        editionId: cartItem.editionId,
                    },
                    { status: 404 }
                );
            }

            const available = getAvailableStock(
                nft.id,
                cartItem.editionId
            );

            if (cartItem.quantity > available) {
                return HttpResponse.json(
                    {
                        message:
                            `Estoque insuficiente para ${nft.name}.`,
                        nftId: nft.id,
                        editionId: cartItem.editionId,
                        availableQuantity: available,
                    },
                    { status: 409 }
                );
            }

            // Preço da edição, quando selecionada.
            const unitPriceEth =
                edition?.priceEth ?? nft.priceEth;

            const unitPriceWei = ethToWei(unitPriceEth);

            const totalPriceWei =
                unitPriceWei * BigInt(cartItem.quantity);

            subtotalWei += totalPriceWei;

            items.push({
                nftId: nft.id,
                name: nft.name,
                quantity: cartItem.quantity,
                unitPriceEth,
                totalPriceEth: weiToEth(totalPriceWei),

                ...(edition
                    ? {
                        editionId: edition.id,
                        editionType: edition.type,
                    }
                    : {}),
            });
        }

        // DESCONTO
        const discountWei =
            couponCode === "KURIO10"
                ? subtotalWei / 10n
                : 0n;

        // TAXA DE REDE
        const networkFeeWei = NETWORK_FEES[network];

        const totalWei =
            subtotalWei - discountWei + networkFeeWei;

        // COTAÇÃO COM VALIDADE DE 5 MINUTOS
        const quote: QuoteResponse = {
            quoteId: crypto.randomUUID(),

            items,

            subtotalEth: weiToEth(subtotalWei),
            discountEth: weiToEth(discountWei),
            networkFeeEth: weiToEth(networkFeeWei),
            totalEth: weiToEth(totalWei),

            couponCode: couponCode || null,
            network,

            expiresAt: new Date(
                Date.now() + 5 * 60 * 1000
            ).toISOString(),
        };

        saveQuote(identity.userId, quote);

        return HttpResponse.json(quote);
    }),

    // CONSULTAR COTAÇÃO
    http.get(
        "/api/quote/:quoteId",
        ({ request, params }) => {
            const identity = resolveRequestIdentity(request);

            if (identity.type !== "authenticated") {
                return HttpResponse.json(
                    {
                        message:
                            "Faça login para consultar a cotação.",
                    },
                    { status: 401 }
                );
            }

            let storedQuotes: StoredQuote[] = [];

            try {
                const stored = localStorage.getItem(
                    QUOTES_KEY
                );

                if (stored) {
                    const parsed: unknown = JSON.parse(stored);

                    if (Array.isArray(parsed)) {
                        storedQuotes = parsed;
                    }
                }
            } catch {
                storedQuotes = [];
            }

            const storedQuote = storedQuotes.find(
                (item) =>
                    item.userId === identity.userId &&
                    item.quote?.quoteId === params.quoteId
            );

            if (!storedQuote) {
                return HttpResponse.json(
                    {
                        message: "Cotação não encontrada.",
                    },
                    { status: 404 }
                );
            }

            const quote = storedQuote.quote;

            const expiresAt = new Date(
                quote.expiresAt
            ).getTime();

            if (
                !Number.isFinite(expiresAt) ||
                expiresAt <= Date.now()
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "Esta cotação expirou. Solicite uma nova cotação.",
                    },
                    { status: 410 }
                );
            }

            return HttpResponse.json(quote);
        }
    ),
];