import { api } from "./nfts";
import type { NFTEditionType } from "./nfts";

export type BlockchainNetwork = "ethereum" | "polygon";

export interface QuoteRequest {
    network: BlockchainNetwork;
    couponCode?: string;
}

export interface QuoteItem {
    nftId: string;
    name: string;
    quantity: number;
    unitPriceEth: string;
    totalPriceEth: string;

    // Compatibilidade com pedidos antigos.
    editionId?: string;
    editionType?: NFTEditionType;
}

export interface QuoteResponse {
    quoteId: string;
    items: QuoteItem[];

    subtotalEth: string;
    discountEth: string;
    networkFeeEth: string;
    totalEth: string;

    couponCode: string | null;
    network: BlockchainNetwork;

    expiresAt: string;
}

export async function getQuote(
    input: QuoteRequest
): Promise<QuoteResponse> {
    const { data } = await api.post<QuoteResponse>(
        "/quote",
        input
    );

    return data;
}

export async function getQuoteById(
    quoteId: string
): Promise<QuoteResponse> {
    const { data } = await api.get<QuoteResponse>(
        `/quote/${encodeURIComponent(quoteId)}`
    );

    return data;
}