import { api, type NFT, type NFTEdition } from "./nfts";

export interface CartItem {
    nft: NFT;
    quantity: number;

    // Ausente nos itens antigos.
    editionId?: string;

    // Informações da edição selecionada.
    edition?: NFTEdition;
}

export interface CartResponse {
    items: CartItem[];
    totalItems: number;
}

export async function getCart(): Promise<CartResponse> {
    const { data } = await api.get<CartResponse>("/cart");

    return data;
}

export async function addCartItem(
    nftId: string,
    quantity = 1,
    editionId?: string
): Promise<CartResponse> {
    const { data } = await api.post<CartResponse>(
        "/cart/items",
        {
            nftId,
            quantity,
            ...(editionId ? { editionId } : {}),
        }
    );

    return data;
}

export async function updateCartItem(
    nftId: string,
    quantity: number,
    editionId?: string
): Promise<CartResponse> {
    const { data } = await api.patch<CartResponse>(
        `/cart/items/${encodeURIComponent(nftId)}`,
        {
            quantity,
            ...(editionId ? { editionId } : {}),
        }
    );

    return data;
}

export async function removeCartItem(
    nftId: string,
    editionId?: string
): Promise<CartResponse> {
    const { data } = await api.delete<CartResponse>(
        `/cart/items/${encodeURIComponent(nftId)}`,
        {
            params: editionId
                ? { editionId }
                : undefined,
        }
    );

    return data;
}

export async function mergeGuestCart(): Promise<CartResponse> {
    const { data } = await api.post<CartResponse>(
        "/cart/merge"
    );

    return data;
}