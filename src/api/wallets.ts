import { api } from "./nfts";

import type { BlockchainNetwork } from "./quote";

export type WalletConnectionStatus =
    | "DISCONNECTED"
    | "CONNECTED";

export interface Wallet {
    id: string;
    userId: string;

    label: string;
    address: string;

    network: BlockchainNetwork;

    isPrimary: boolean;

    connectionStatus: WalletConnectionStatus;

    createdAt: string;
    updatedAt: string;
}

export interface CreateWalletRequest {
    label: string;
    address: string;
    network: BlockchainNetwork;
    isPrimary?: boolean;
}

export interface UpdateWalletRequest {
    label?: string;
    network?: BlockchainNetwork;
    isPrimary?: boolean;
}

export interface WalletConnectionRequest {
    action: "CONNECT" | "DISCONNECT";
}

export async function getWallets(): Promise<Wallet[]> {
    const { data } = await api.get<Wallet[]>(
        "/wallets"
    );

    return data;
}

export async function createWallet(
    input: CreateWalletRequest
): Promise<Wallet> {
    const { data } = await api.post<Wallet>(
        "/wallets",
        input
    );

    return data;
}

export async function updateWallet(
    walletId: string,
    input: UpdateWalletRequest
): Promise<Wallet> {
    const { data } = await api.patch<Wallet>(
        `/wallets/${encodeURIComponent(walletId)}`,
        input
    );

    return data;
}

export async function updateWalletConnection(
    walletId: string,
    input: WalletConnectionRequest
): Promise<Wallet> {
    const { data } = await api.post<Wallet>(
        `/wallets/${encodeURIComponent(walletId)}/connection`,
        input
    );

    return data;
}