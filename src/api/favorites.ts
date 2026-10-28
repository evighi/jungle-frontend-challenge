import { api } from "./nfts";

export interface FavoritesResponse {
  nftIds: string[];
}

export async function getFavorites(): Promise<FavoritesResponse> {
  const { data } = await api.get<FavoritesResponse>(
    "/favorites"
  );

  return data;
}

export async function addFavorite(
  nftId: string
): Promise<FavoritesResponse> {
  const { data } = await api.post<FavoritesResponse>(
    `/favorites/${encodeURIComponent(nftId)}`
  );

  return data;
}

export async function removeFavorite(
  nftId: string
): Promise<FavoritesResponse> {
  const { data } = await api.delete<FavoritesResponse>(
    `/favorites/${encodeURIComponent(nftId)}`
  );

  return data;
}