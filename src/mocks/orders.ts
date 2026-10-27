import { http, HttpResponse } from "msw";
import { resolveRequestIdentity } from "./auth";
import { nftDatabase } from "./data/nfts";
import {
    getAvailableStock,
    commitOrderStock,
} from "./stock";
import type { QuoteResponse } from "../api/quote";
import type {
    CreateOrderRequest,
    Order,
} from "../api/orders";

interface StoredQuote {
    userId: string;
    quote: QuoteResponse;
}

interface StoredWallet {
    id: string;
    userId: string;
    address: string;
    network: "ethereum" | "polygon";
    connectionStatus: "CONNECTED" | "DISCONNECTED";
}

const QUOTES_KEY = "kurio:quotes:v1";
const ORDERS_KEY = "kurio:orders:v1";
const WALLETS_KEY = "kurio:wallets:v1";

type PaymentOutcome = "CONFIRMED" | "FAILED";

interface StoredOrder extends Order {
    paymentProcessing?: {
        outcome: PaymentOutcome;
        readyAt: string;
    };
}

const PAYMENT_PROCESSING_DELAY_MS = 3000;

function readStorage<T>(key: string): T[] {
    try {
        const value = localStorage.getItem(key);

        if (!value) return [];

        const parsed: unknown = JSON.parse(value);

        return Array.isArray(parsed)
            ? (parsed as T[])
            : [];
    } catch {
        return [];
    }
}

function saveOrders(orders: Order[]): void {
    localStorage.setItem(
        ORDERS_KEY,
        JSON.stringify(orders)
    );
}

function processPendingOrder(
    order: StoredOrder
): StoredOrder {
    // Um pedido finalizado nunca é processado novamente.
    if (order.status !== "PENDING") {
        return order;
    }

    const processing = order.paymentProcessing;

    if (!processing) {
        return order;
    }

    const readyAt = new Date(
        processing.readyAt
    ).getTime();

    // Ainda não chegou o momento do processamento.
    if (
        !Number.isFinite(readyAt) ||
        Date.now() < readyAt
    ) {
        return order;
    }

    const now = new Date().toISOString();

    // Pagamento recusado não altera estoque ou carrinho.
    if (processing.outcome === "FAILED") {
        return {
            ...order,
            status: "FAILED",
            updatedAt: now,
        };
    }

    // O estoque só é descontado após a aprovação
    // simulada do pagamento.
    const stockResult = commitOrderStock(
        order.id,
        order.items.map((item) => ({
            nftId: item.nftId,
            quantity: item.quantity,
        }))
    );

    // Se o estoque ficou insuficiente,
    // o pedido não pode ser confirmado.
    if (stockResult === "INSUFFICIENT") {
        return {
            ...order,
            status: "FAILED",
            updatedAt: now,
        };
    }

    // Somente a primeira aplicação realiza
    // a reconciliação do carrinho.
    if (stockResult === "APPLIED") {
        reconcilePurchasedCart(order);
    }

    return {
        ...order,
        status: "CONFIRMED",
        updatedAt: now,
    };
}

function readUserCart(
    userId: string
): Array<{ nftId: string; quantity: number }> {
    return readStorage<{
        nftId: string;
        quantity: number;
    }>(`kurio:user-cart:${userId}`);
}

/**
 * Remove do carrinho somente as quantidades
 * efetivamente compradas.
 */
function reconcilePurchasedCart(
    order: Order
): void {
    const storageKey =
        `kurio:user-cart:${order.userId}`;

    const currentCart = readUserCart(order.userId);

    const purchasedQuantities = new Map<
        string,
        number
    >();

    for (const item of order.items) {
        purchasedQuantities.set(
            item.nftId,
            (purchasedQuantities.get(item.nftId) ?? 0) +
            item.quantity
        );
    }

    const updatedCart = currentCart.flatMap(
        (item) => {
            const purchasedQuantity =
                purchasedQuantities.get(item.nftId) ??
                0;

            const remainingQuantity =
                item.quantity - purchasedQuantity;

            if (remainingQuantity <= 0) {
                return [];
            }

            return [
                {
                    nftId: item.nftId,
                    quantity: remainingQuantity,
                },
            ];
        }
    );

    localStorage.setItem(
        storageKey,
        JSON.stringify(updatedCart)
    );
}

function isValidWalletAddress(
    value: unknown
): value is string {
    return (
        typeof value === "string" &&
        /^0x[a-fA-F0-9]{40}$/.test(value)
    );
}

function cartMatchesQuote(
    userId: string,
    quote: QuoteResponse
): boolean {
    const cart = readUserCart(userId);

    if (cart.length !== quote.items.length) {
        return false;
    }

    return quote.items.every((item) => {
        const cartItem = cart.find(
            (candidate) =>
                candidate.nftId === item.nftId
        );

        return (
            cartItem !== undefined &&
            cartItem.quantity === item.quantity
        );
    });
}

export const orderHandlers = [
    http.post("/api/orders", async ({ request }) => {
        const identity =
            resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return HttpResponse.json(
                {
                    message:
                        "Faça login para criar um pedido.",
                },
                { status: 401 }
            );
        }

        let body: Partial<CreateOrderRequest>;

        try {
            const parsed: unknown = await request.json();

            if (
                typeof parsed !== "object" ||
                parsed === null ||
                Array.isArray(parsed)
            ) {
                throw new Error("Invalid body");
            }

            body = parsed as Partial<CreateOrderRequest>;
        } catch {
            return HttpResponse.json(
                {
                    message:
                        "Dados do pedido inválidos.",
                },
                { status: 400 }
            );
        }

        if (
            typeof body.quoteId !== "string" ||
            !body.quoteId.trim() ||
            typeof body.idempotencyKey !== "string" ||
            !body.idempotencyKey.trim() ||
            !isValidWalletAddress(body.walletAddress)
        ) {
            return HttpResponse.json(
                {
                    message:
                        "Cotação, carteira ou chave de idempotência inválida.",
                },
                { status: 400 }
            );
        }

        const {
            quoteId,
            idempotencyKey,
            walletAddress,
        } = body as CreateOrderRequest;

        const orders = readStorage<Order>(ORDERS_KEY);

        // A mesma chave deve retornar o mesmo pedido.
        const existingOrder = orders.find(
            (order) =>
                order.userId === identity.userId &&
                order.idempotencyKey === idempotencyKey
        );

        if (existingOrder) {
            if (
                existingOrder.quoteId !== quoteId ||
                existingOrder.walletAddress !== walletAddress
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "Esta chave de idempotência já foi utilizada em outra solicitação.",
                    },
                    { status: 409 }
                );
            }

            return HttpResponse.json(existingOrder);
        }

        const orderForQuote = orders.find(
            (order) =>
                order.userId === identity.userId &&
                order.quoteId === quoteId
        );

        if (orderForQuote) {
            return HttpResponse.json(
                {
                    message:
                        "Esta cotação já foi utilizada em outro pedido.",
                },
                { status: 409 }
            );
        }

        const storedQuotes =
            readStorage<StoredQuote>(QUOTES_KEY);

        const storedQuote = storedQuotes.find(
            (item) =>
                item.userId === identity.userId &&
                item.quote?.quoteId === quoteId
        );

        if (!storedQuote) {
            return HttpResponse.json(
                {
                    message:
                        "Cotação não encontrada.",
                },
                { status: 404 }
            );
        }

        const quote = storedQuote.quote;

        // A validade é verificada na API,
        // independentemente do estado da interface.
        if (
            !Number.isFinite(
                new Date(quote.expiresAt).getTime()
            ) ||
            new Date(quote.expiresAt).getTime() <=
            Date.now()
        ) {
            return HttpResponse.json(
                {
                    message:
                        "A cotação expirou. Solicite uma nova cotação.",
                },
                { status: 410 }
            );
        }

        // Valida a carteira utilizada no pedido.
        const wallets = readStorage<StoredWallet>(
            WALLETS_KEY
        );

        const wallet = wallets.find(
            (item) =>
                item.address.toLowerCase() ===
                walletAddress.toLowerCase()
        );

        if (!wallet) {
            return HttpResponse.json(
                {
                    message:
                        "Esta carteira não está cadastrada.",
                },
                { status: 404 }
            );
        }

        if (wallet.userId !== identity.userId) {
            return HttpResponse.json(
                {
                    message:
                        "Você não possui permissão para utilizar esta carteira.",
                },
                { status: 403 }
            );
        }

        if (wallet.connectionStatus !== "CONNECTED") {
            return HttpResponse.json(
                {
                    message:
                        "Conecte sua carteira antes de continuar.",
                },
                { status: 409 }
            );
        }

        if (wallet.network !== quote.network) {
            return HttpResponse.json(
                {
                    message:
                        "A rede da carteira é diferente da rede da cotação.",
                },
                { status: 409 }
            );
        }

        if (
            quote.items.length === 0 ||
            !cartMatchesQuote(identity.userId, quote)
        ) {
            return HttpResponse.json(
                {
                    message:
                        "O carrinho foi alterado. Gere uma nova cotação.",
                },
                { status: 409 }
            );
        }

        // Revalida disponibilidade e preço.
        for (const item of quote.items) {
            const nft = nftDatabase.find(
                (candidate) =>
                    candidate.id === item.nftId
            );

            if (
                !nft ||
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0 ||
                item.quantity > getAvailableStock(nft.id) ||
                item.unitPriceEth !== nft.priceEth
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "Um dos NFTs mudou de preço ou disponibilidade. Gere uma nova cotação.",
                    },
                    { status: 409 }
                );
            }
        }

        const now = new Date().toISOString();

        // O pedido nasce pendente e recebe
        // um resultado de pagamento simulado.

        const shouldFailPayment =
            request.headers.get("x-mock-scenario") ===
            "payment-failed";

        const processingReadyAt = new Date(
            Date.now() + PAYMENT_PROCESSING_DELAY_MS
        ).toISOString();

        const order: StoredOrder = {
            id: crypto.randomUUID(),
            userId: identity.userId,

            quoteId,
            idempotencyKey,

            status: "PENDING",

            paymentProcessing: {
                outcome: shouldFailPayment
                    ? "FAILED"
                    : "CONFIRMED",

                readyAt: processingReadyAt,
            },

            walletAddress,
            network: quote.network,

            items: quote.items.map((item) => ({
                ...item,
            })),

            subtotalEth: quote.subtotalEth,
            discountEth: quote.discountEth,
            networkFeeEth: quote.networkFeeEth,
            totalEth: quote.totalEth,

            couponCode: quote.couponCode,

            createdAt: now,
            updatedAt: now,
        };

        orders.push(order);

        saveOrders(orders);

        return HttpResponse.json(order, {
            status: 201,
        });
    }),

    http.get(
        "/api/orders/:orderId",
        ({ request, params }) => {
            const identity =
                resolveRequestIdentity(request);

            if (
                identity.type !== "authenticated"
            ) {
                return HttpResponse.json(
                    {
                        message:
                            "Faça login para consultar o pedido.",
                    },
                    { status: 401 }
                );
            }

            const orders =
                readStorage<StoredOrder>(ORDERS_KEY);

            const orderIndex = orders.findIndex(
                (item) =>
                    item.id === params.orderId &&
                    item.userId === identity.userId
            );

            if (orderIndex === -1) {
                return HttpResponse.json(
                    {
                        message: "Pedido não encontrado.",
                    },
                    { status: 404 }
                );
            }

            const originalOrder = orders[orderIndex];

            const processedOrder =
                processPendingOrder(originalOrder);

            if (
                processedOrder.status !==
                originalOrder.status
            ) {
                orders[orderIndex] = processedOrder;

                saveOrders(orders);

                if (processedOrder.status === "CONFIRMED") {
                    const version = new Date(
                        processedOrder.updatedAt
                    ).getTime();

                    const nftIds = new Set(
                        processedOrder.items.map(
                            (item) => item.nftId
                        )
                    );

                    for (const nftId of nftIds) {
                        void fetch("/__mock/realtime/nft", {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json",
                            },

                            body: JSON.stringify({
                                nftId,
                                version,
                            }),
                        }).catch(() => {
                            // Falhas na entrega do evento não
                            // desfazem um pagamento confirmado.
                        });
                    }
                }


                void fetch("/__mock/realtime/order", {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        orderId: processedOrder.id,

                        version: new Date(
                            processedOrder.updatedAt
                        ).getTime(),
                    }),
                }).catch(() => {
                });
            }

            return HttpResponse.json(processedOrder);
        }
    ),
];