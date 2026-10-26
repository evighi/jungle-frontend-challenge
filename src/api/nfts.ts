import axios from "axios";

export interface NFT {
    id: string;
    name: string;
    collection: string;
    creator: string;
    image: string;
    priceEth: string;
    available: number;
    category: string;
}

export interface NFTListResponse {
    items: NFT[];
    total: number;
    page: number;
    totalPages: number;
}

export interface NFTFilters {
    search?: string;
    category?: string;
    sort?: string;
    page?: number;
}

export const api = axios.create({
    baseURL: "/api",
    timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kurio:auth-token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function getNFTs(
    filters: NFTFilters = {},
    signal?: AbortSignal
): Promise<NFTListResponse> {
    const response = await api.get<NFTListResponse>("/nfts", {
        params: filters,
        signal,
    });

    return response.data;
}

export async function getNFT(id: string): Promise<NFT> {
    const response = await api.get<NFT>(`/nfts/${id}`);

    return response.data;
}