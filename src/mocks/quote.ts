import { http, HttpResponse } from "msw";
import { nftDatabase } from "./data/nfts";
import { resolveRequestIdentity } from "./auth";
import type {
    BlockchainNetwork,
    QuoteItem,
    QuoteResponse,
} from "../api/quote";
import { getAvailableStock } from "./stock";

interface StoredCartItem {
    nftId: string;
    quantity: number;
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

function readCart(userId: string): StoredCartItem[] {
    try {
        const stored = localStorage.getItem(
            `kurio:user-cart:${userId}`
        );

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

function saveQuote(
    userId: string,
    quote: QuoteResponse
) {
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

    // Mantém apenas cotações que ainda não expiraram.
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
    http.post("/api/quote", async ({ request }) => {
        // 1. Exige autenticação.
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message: "Faça login para solicitar uma cotação.",
                },
                { status: 401 }
            );
        }

        // 2. Valida os parâmetros.
        let body: QuoteRequestBody;

        try {
            body = (await request.json()) as QuoteRequestBody;
        } catch {
            return HttpResponse.json(
                { message: "Corpo da requisição inválido." },
                { status: 400 }
            );
        }

        if (
            body.network !== "ethereum" &&
            body.network !== "polygon"
        ) {
            return HttpResponse.json(
                { message: "Rede blockchain inválida." },
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

        // 3. Valida o cupom.
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

        // 4. Busca o carrinho autenticado.
        const cart = readCart(identity.userId);

        if (cart.length === 0) {
            return HttpResponse.json(
                { message: "O carrinho está vazio." },
                { status: 400 }
            );
        }

        // 5. Revalida produtos e disponibilidade.
        const items: QuoteItem[] = [];

        let subtotalWei = 0n;

        for (const cartItem of cart) {
            const nft = nftDatabase.find(
                (item) => item.id === cartItem.nftId
            );

            if (!nft) {
                return HttpResponse.json(
                    {
                        message: "Um NFT do carrinho não foi encontrado.",
                        nftId: cartItem.nftId,
                    },
                    { status: 404 }
                );
            }

            if (
                cartItem.quantity >
                getAvailableStock(nft.id)
            ) {
                return HttpResponse.json(
                    {
                        message: `Estoque insuficiente para ${nft.name}.`,
                        nftId: nft.id,
                        availableQuantity: getAvailableStock(nft.id),
                    },
                    { status: 409 }
                );
            }

            const unitPriceWei = ethToWei(nft.priceEth);

            const totalPriceWei =
                unitPriceWei * BigInt(cartItem.quantity);

            subtotalWei += totalPriceWei;

            items.push({
                nftId: nft.id,
                name: nft.name,
                quantity: cartItem.quantity,
                unitPriceEth: nft.priceEth,
                totalPriceEth: weiToEth(totalPriceWei),
            });
        }

        // 6. Aplica desconto de 10%, se houver cupom.
        const discountWei =
            couponCode === "KURIO10"
                ? subtotalWei / 10n
                : 0n;

        // 7. Calcula taxa e total.
        const networkFeeWei = NETWORK_FEES[network];

        const totalWei =
            subtotalWei - discountWei + networkFeeWei;

        // 8. Gera uma cotação com validade de 5 minutos.
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

        // 9. Persiste o snapshot para o futuro checkout.
        saveQuote(identity.userId, quote);

        return HttpResponse.json(quote);
    }),

    http.get("/api/quote/:quoteId", ({ request, params }) => {
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message: "Faça login para consultar a cotação.",
                },
                { status: 401 }
            );
        }

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
        const expiresAt = new Date(quote.expiresAt).getTime();

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
    }),
];