import { useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { ArrowLeft, Wallet as WalletIcon } from "lucide-react";

import {
    getWallets,
    createWallet,
    updateWallet,
    updateWalletConnection,
} from "../api/wallets";

import type {
    CreateWalletRequest,
    Wallet,
} from "../api/wallets";

import type { BlockchainNetwork } from "../api/quote";

import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

function getErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        return (
            error.response?.data?.message ??
            "Não foi possível realizar a operação."
        );
    }

    return "Ocorreu um erro inesperado.";
}

export function Wallets() {
    const queryClient = useQueryClient();

    const [label, setLabel] = useState("");
    const [address, setAddress] = useState("");

    const [network, setNetwork] =
        useState<BlockchainNetwork>("ethereum");

    const [actionError, setActionError] =
        useState<string | null>(null);

    const {
        data: wallets = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["wallets"],
        queryFn: getWallets,
        retry: false,
    });

    async function refreshWallets() {
        await queryClient.invalidateQueries({
            queryKey: ["wallets"],
        });
    }

    const createMutation = useMutation({
        mutationFn: (input: CreateWalletRequest) =>
            createWallet(input),

        onSuccess: async () => {
            setLabel("");
            setAddress("");
            setActionError(null);

            await refreshWallets();
        },

        onError: (error) => {
            setActionError(getErrorMessage(error));
        },
    });

    const primaryMutation = useMutation({
        mutationFn: (walletId: string) =>
            updateWallet(walletId, {
                isPrimary: true,
            }),

        onSuccess: refreshWallets,

        onError: (error) => {
            setActionError(getErrorMessage(error));
        },
    });

    const connectionMutation = useMutation({
        mutationFn: ({
            walletId,
            action,
        }: {
            walletId: string;
            action: "CONNECT" | "DISCONNECT";
        }) =>
            updateWalletConnection(walletId, {
                action,
            }),

        onSuccess: refreshWallets,

        onError: (error) => {
            setActionError(getErrorMessage(error));
        },
    });

    const isUpdating =
        createMutation.isPending ||
        primaryMutation.isPending ||
        connectionMutation.isPending;

    function handleCreateWallet(
        event: React.SubmitEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setActionError(null);

        createMutation.mutate({
            label: label.trim(),
            address: address.trim(),
            network,
        });
    }

    return (
        <main className="min-h-screen bg-[#140e0b] px-6 py-12 text-[#f5e7d8]">
            <div className="mx-auto max-w-5xl">
                <Link
                    to="/"
                    search={{
                        search: "",
                        category: "",
                        sort: "",
                        page: 1,
                    }}
                    className="mb-8 inline-flex items-center gap-2 text-sm text-[#b09270] hover:text-[#d8904c]"
                >
                    <ArrowLeft size={16} />
                    Voltar ao início
                </Link>

                <h1 className="mb-3 text-3xl font-bold">
                    Minhas carteiras
                </h1>

                <p className="mb-10 text-[#b09270]">
                    Gerencie suas carteiras para realizar compras
                    no marketplace.
                </p>

                <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                    <section>
                        <h2 className="mb-5 text-xl font-bold">
                            Carteiras cadastradas
                        </h2>

                        {isLoading && (
                            <div className="space-y-4">
                                <Skeleton className="h-40 bg-[#38241b]" />
                                <Skeleton className="h-40 bg-[#38241b]" />
                            </div>
                        )}

                        {isError && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-500/40 bg-[#261711] p-6"
                            >
                                <p className="text-red-300">
                                    {getErrorMessage(error)}
                                </p>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => void refetch()}
                                >
                                    Tentar novamente
                                </Button>
                            </div>
                        )}

                        {!isLoading &&
                            !isError &&
                            wallets.length === 0 && (
                                <div className="rounded-xl border border-[#4a3328] bg-[#261711] p-8 text-center">
                                    <WalletIcon
                                        size={32}
                                        className="mx-auto text-[#d8904c]"
                                    />

                                    <h3 className="mt-4 font-bold">
                                        Nenhuma carteira cadastrada
                                    </h3>

                                    <p className="mt-2 text-sm text-[#b09270]">
                                        Cadastre sua primeira carteira
                                        para continuar.
                                    </p>
                                </div>
                            )}

                        <div className="space-y-4">
                            {wallets.map((wallet: Wallet) => (
                                <article
                                    key={wallet.id}
                                    className="rounded-xl border border-[#4a3328] bg-[#261711] p-6"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h3 className="font-bold">
                                            {wallet.label}
                                        </h3>

                                        {wallet.isPrimary && (
                                            <span className="rounded-full bg-[#d8904c]/15 px-3 py-1 text-xs text-[#d8904c]">
                                                Principal
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-4 break-all text-sm text-[#b09270]">
                                        {wallet.address}
                                    </p>

                                    <p className="mt-3 text-sm">
                                        Rede:{" "}
                                        {wallet.network === "ethereum"
                                            ? "Ethereum"
                                            : "Polygon"}
                                    </p>

                                    <p className="mt-2 text-sm">
                                        Status:{" "}
                                        <span
                                            className={
                                                wallet.connectionStatus ===
                                                    "CONNECTED"
                                                    ? "text-green-400"
                                                    : "text-[#b09270]"
                                            }
                                        >
                                            {wallet.connectionStatus ===
                                                "CONNECTED"
                                                ? "Conectada"
                                                : "Desconectada"}
                                        </span>
                                    </p>

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() => {
                                                setActionError(null);

                                                connectionMutation.mutate({
                                                    walletId: wallet.id,
                                                    action:
                                                        wallet.connectionStatus ===
                                                            "CONNECTED"
                                                            ? "DISCONNECT"
                                                            : "CONNECT",
                                                });
                                            }}
                                        >
                                            {wallet.connectionStatus ===
                                                "CONNECTED"
                                                ? "Desconectar"
                                                : "Conectar"}
                                        </Button>

                                        {!wallet.isPrimary && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={isUpdating}
                                                onClick={() => {
                                                    setActionError(null);

                                                    primaryMutation.mutate(
                                                        wallet.id
                                                    );
                                                }}
                                            >
                                                Tornar principal
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <aside className="h-fit rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                        <h2 className="mb-6 text-xl font-bold">
                            Adicionar carteira
                        </h2>

                        <form
                            onSubmit={handleCreateWallet}
                            className="space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="wallet-label"
                                    className="mb-2 block text-sm text-[#b09270]"
                                >
                                    Nome da carteira
                                </label>

                                <input
                                    id="wallet-label"
                                    required
                                    minLength={2}
                                    value={label}
                                    onChange={(event) =>
                                        setLabel(event.target.value)
                                    }
                                    placeholder="Minha carteira"
                                    className="w-full rounded-lg border border-[#4a3328] bg-[#140e0b] px-4 py-3 text-sm"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="wallet-address"
                                    className="mb-2 block text-sm text-[#b09270]"
                                >
                                    Endereço
                                </label>

                                <input
                                    id="wallet-address"
                                    required
                                    value={address}
                                    onChange={(event) =>
                                        setAddress(event.target.value)
                                    }
                                    placeholder="0x..."
                                    className="w-full rounded-lg border border-[#4a3328] bg-[#140e0b] px-4 py-3 text-sm"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="wallet-network"
                                    className="mb-2 block text-sm text-[#b09270]"
                                >
                                    Rede blockchain
                                </label>

                                <select
                                    id="wallet-network"
                                    value={network}
                                    onChange={(event) =>
                                        setNetwork(
                                            event.target.value as BlockchainNetwork
                                        )
                                    }
                                    className="w-full rounded-lg border border-[#4a3328] bg-[#140e0b] px-4 py-3 text-sm"
                                >
                                    <option value="ethereum">
                                        Ethereum
                                    </option>

                                    <option value="polygon">
                                        Polygon
                                    </option>
                                </select>
                            </div>

                            <Button
                                type="submit"
                                disabled={isUpdating}
                                className="w-full bg-[#d8904c] text-[#140e0b]"
                            >
                                {createMutation.isPending
                                    ? "Salvando..."
                                    : "Cadastrar carteira"}
                            </Button>
                        </form>

                        {actionError && (
                            <p
                                role="alert"
                                className="mt-5 rounded-lg border border-red-500/40 p-4 text-sm text-red-300"
                            >
                                {actionError}
                            </p>
                        )}
                    </aside>
                </div>
            </div>
        </main>
    );
}