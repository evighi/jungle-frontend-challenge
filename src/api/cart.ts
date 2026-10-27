import { api, type NFT } from "./nfts";

export interface CartItem {
  nft: NFT;
  quantity: number;
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
  quantity = 1
): Promise<CartResponse> {
  const { data } = await api.post<CartResponse>("/cart/items", {
    nftId,
    quantity,
  });

  return data;
}

export async function updateCartItem(
  nftId: string,
  quantity: number
): Promise<CartResponse> {
  const { data } = await api.patch<CartResponse>(
    `/cart/items/${nftId}`,
    { quantity }
  );

  return data;
}

export async function removeCartItem(
  nftId: string
): Promise<CartResponse> {
  const { data } = await api.delete<CartResponse>(
    `/cart/items/${nftId}`
  );

  return data;
}

export async function mergeGuestCart(): Promise<CartResponse> {
  const { data } = await api.post<CartResponse>("/cart/merge");

  return data;
}