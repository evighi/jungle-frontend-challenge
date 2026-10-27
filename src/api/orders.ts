import { api } from "./nfts";

import type {
    BlockchainNetwork,
    QuoteItem,
} from "./quote";

export type OrderStatus =
    | "PENDING"
    | "CONFIRMED"
    | "FAILED";

export interface CreateOrderRequest {
    quoteId: string;
    idempotencyKey: string;
    walletAddress: string;
}

export interface Order {
    id: string;
    userId: string;

    quoteId: string;
    idempotencyKey: string;

    status: OrderStatus;

    walletAddress: string;
    network: BlockchainNetwork;

    items: QuoteItem[];

    subtotalEth: string;
    discountEth: string;
    networkFeeEth: string;
    totalEth: string;

    couponCode: string | null;

    createdAt: string;
    updatedAt: string;
}

export async function createOrder(
    input: CreateOrderRequest
): Promise<Order> {
    const { data } = await api.post<Order>(
        "/orders",
        input
    );

    return data;
}

export async function getOrder(
    orderId: string
): Promise<Order> {
    const { data } = await api.get<Order>(
        `/orders/${encodeURIComponent(orderId)}`
    );

    return data;
}