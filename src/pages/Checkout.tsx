import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";
import {
    Link,
    useNavigate,
    useSearch,
} from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { useEffect, useState } from "react";
import { getWallets } from "../api/wallets";

import { getQuoteById } from "../api/quote";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";

import { createOrder } from "../api/orders";

function getErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        return (
            error.response?.data?.message ??
            "Não foi possível consultar a cotação."
        );
    }

    return "Ocorreu um erro inesperado.";
}

export function Checkout() {
    const { quoteId } = useSearch({
        from: "/checkout",
    });

    const navigate = useNavigate();

    const {
        data: quote,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["checkout-quote", quoteId],

        queryFn: () => getQuoteById(quoteId),

        enabled: Boolean(quoteId),

        retry: false,
    });

    const [selectedWalletId, setSelectedWalletId] =
        useState<string>("");

    const {
        data: wallets = [],
        isLoading: isWalletsLoading,
        isError: isWalletsError,
        error: walletsError,
        refetch: refetchWallets,
    } = useQuery({
        queryKey: ["wallets"],
        queryFn: getWallets,
        enabled: Boolean(quote),
        retry: false,
    });

    const compatibleWallets = wallets.filter(
        (wallet) =>
            wallet.network === quote?.network
    );

    const selectedWallet =
        compatibleWallets.find(
            (wallet) => wallet.id === selectedWalletId
        ) ??
        compatibleWallets.find(
            (wallet) => wallet.isPrimary
        ) ??
        compatibleWallets[0];

    const isWalletReady =
        selectedWallet?.connectionStatus === "CONNECTED";

    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    const isQuoteExpired =
        quote !== undefined &&
        currentTime > 0 &&
        currentTime >=
        new Date(quote.expiresAt).getTime();

    const orderMutation = useMutation({
        mutationFn: createOrder,

        onSuccess: (order) => {
            void navigate({
                to: "/pedido/$orderId",
                params: {
                    orderId: order.id,
                },
            });
        },
    });

    function handleConfirmOrder() {
        if (
            !quote ||
            !selectedWallet ||
            !isWalletReady ||
            isQuoteExpired ||
            orderMutation.isPending ||
            orderMutation.isSuccess
        ) {
            return;
        }

        const storageKey =
            `kurio:order-attempt:${quote.quoteId}`;

        let idempotencyKey =
            sessionStorage.getItem(storageKey);

        if (!idempotencyKey) {
            idempotencyKey = crypto.randomUUID();

            sessionStorage.setItem(
                storageKey,
                idempotencyKey
            );
        }

        orderMutation.mutate({
            quoteId: quote.quoteId,
            idempotencyKey,
            walletAddress: selectedWallet.address,
        });
    }

    return (
        <main className="min-h-screen bg-[#140e0b] px-6 py-12 text-[#f5e7d8]">
            <div className="mx-auto max-w-5xl">
                <Link
                    to="/carrinho"
                    className="mb-8 inline-flex items-center gap-2 text-sm text-[#b09270] hover:text-[#d8904c]"
                >
                    <ArrowLeft size={16} />
                    Voltar ao carrinho
                </Link>

                <h1 className="mb-3 text-3xl font-bold">
                    Finalizar compra
                </h1>

                <p className="mb-10 text-[#b09270]">
                    Confira os detalhes do pedido antes de continuar.
                </p>

                {!quoteId && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-500/40 bg-[#261711] p-6"
                    >
                        <p className="text-red-300">
                            Nenhuma cotação foi informada.
                        </p>
                    </div>
                )}

                {isLoading && quoteId && (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full bg-[#38241b]" />
                        <Skeleton className="h-48 w-full bg-[#38241b]" />
                    </div>
                )}

                {isError && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-500/40 bg-[#261711] p-6"
                    >
                        <h2 className="text-lg font-bold text-red-300">
                            Não foi possível carregar sua cotação
                        </h2>

                        <p className="mt-3 text-sm text-[#b09270]">
                            {getErrorMessage(error)}
                        </p>

                        <Button
                            type="button"
                            variant="outline"
                            className="mt-5"
                            onClick={() => void refetch()}
                        >
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {quote && (
                    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                        <section className="space-y-6">
                            <div className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                                <h2 className="mb-6 text-xl font-bold">
                                    NFTs do pedido
                                </h2>

                                <div className="space-y-5">
                                    {quote.items.map((item) => (
                                        <div
                                            key={`${item.nftId}:${item.editionId ?? "default"}`}
                                            className="flex items-center justify-between gap-4 border-b border-[#4a3328] pb-5 last:border-b-0 last:pb-0"
                                        >
                                            <div>
                                                <h3 className="font-bold">
                                                    {item.name}
                                                </h3>

                                                <p className="mt-2 text-sm text-[#b09270]">
                                                    Quantidade: {item.quantity}
                                                </p>

                                                <p className="mt-1 text-sm text-[#b09270]">
                                                    Valor unitário:{" "}
                                                    {item.unitPriceEth} ETH
                                                </p>
                                            </div>

                                            <strong className="text-[#d8904c]">
                                                {item.totalPriceEth} ETH
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck
                                        size={22}
                                        className="shrink-0 text-[#d8904c]"
                                    />

                                    <div>
                                        <h2 className="font-bold">
                                            Checkout seguro
                                        </h2>

                                        <p className="mt-2 text-sm leading-6 text-[#b09270]">
                                            Esta é uma simulação de compra.
                                            Nenhuma transação real será
                                            realizada na blockchain.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                                <h2 className="mb-3 text-xl font-bold">
                                    Carteira para pagamento
                                </h2>

                                <p className="mb-6 text-sm text-[#b09270]">
                                    Selecione uma carteira cadastrada e conectada
                                    para continuar.
                                </p>

                                {isWalletsLoading && (
                                    <Skeleton className="h-24 w-full bg-[#38241b]" />
                                )}

                                {isWalletsError && (
                                    <div
                                        role="alert"
                                        className="rounded-lg border border-red-500/40 p-4"
                                    >
                                        <p className="text-sm text-red-300">
                                            {getErrorMessage(walletsError)}
                                        </p>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mt-3"
                                            onClick={() => void refetchWallets()}
                                        >
                                            Tentar novamente
                                        </Button>
                                    </div>
                                )}

                                {!isWalletsLoading &&
                                    !isWalletsError &&
                                    compatibleWallets.length === 0 && (
                                        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
                                            <p className="text-sm text-yellow-200">
                                                Você não possui carteiras cadastradas
                                                para esta rede.
                                            </p>

                                            <Link
                                                to="/carteiras"
                                                className="mt-4 inline-block text-sm font-medium text-[#d8904c] hover:underline"
                                            >
                                                Gerenciar carteiras
                                            </Link>
                                        </div>
                                    )}

                                {!isWalletsLoading &&
                                    !isWalletsError &&
                                    compatibleWallets.length > 0 && (
                                        <div className="space-y-3">
                                            {compatibleWallets.map((wallet) => (
                                                <label
                                                    key={wallet.id}
                                                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#4a3328] bg-[#140e0b] p-4"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="checkout-wallet"
                                                        value={wallet.id}
                                                        checked={
                                                            selectedWallet?.id === wallet.id
                                                        }
                                                        onChange={() =>
                                                            setSelectedWalletId(wallet.id)
                                                        }
                                                        className="mt-1 accent-[#d8904c]"
                                                    />

                                                    <span className="min-w-0 flex-1">
                                                        <span className="block font-bold">
                                                            {wallet.label}
                                                            {wallet.isPrimary && (
                                                                <span className="ml-2 text-xs font-normal text-[#d8904c]">
                                                                    (Principal)
                                                                </span>
                                                            )}
                                                        </span>

                                                        <span className="mt-2 block break-all text-xs text-[#b09270]">
                                                            {wallet.address}
                                                        </span>

                                                        <span
                                                            className={`mt-2 block text-xs ${wallet.connectionStatus ===
                                                                "CONNECTED"
                                                                ? "text-green-400"
                                                                : "text-yellow-300"
                                                                }`}
                                                        >
                                                            {wallet.connectionStatus ===
                                                                "CONNECTED"
                                                                ? "Conectada"
                                                                : "Desconectada"}
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}

                                            {!isWalletReady && (
                                                <p
                                                    role="status"
                                                    className="text-sm text-yellow-200"
                                                >
                                                    Conecte a carteira selecionada antes
                                                    de confirmar a compra.
                                                </p>
                                            )}

                                            <Link
                                                to="/carteiras"
                                                className="inline-block pt-2 text-sm text-[#d8904c] hover:underline"
                                            >
                                                Gerenciar conexões
                                            </Link>
                                        </div>
                                    )}
                            </div>

                        </section>

                        <aside className="h-fit rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                            <h2 className="mb-6 text-xl font-bold">
                                Resumo da compra
                            </h2>

                            <div className="space-y-4">
                                <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-[#b09270]">
                                        Rede
                                    </span>

                                    <span>
                                        {quote.network === "ethereum"
                                            ? "Ethereum"
                                            : "Polygon"}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-[#b09270]">
                                        Subtotal
                                    </span>

                                    <span>{quote.subtotalEth} ETH</span>
                                </div>

                                {quote.couponCode && (
                                    <div className="flex justify-between gap-4 text-sm text-green-400">
                                        <span>
                                            Desconto ({quote.couponCode})
                                        </span>

                                        <span>
                                            -{quote.discountEth} ETH
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-[#b09270]">
                                        Taxa de rede
                                    </span>

                                    <span>
                                        {quote.networkFeeEth} ETH
                                    </span>
                                </div>

                                <div className="flex justify-between gap-4 border-t border-[#4a3328] pt-5 text-lg font-bold">
                                    <span>Total</span>

                                    <span className="text-[#d8904c]">
                                        {quote.totalEth} ETH
                                    </span>
                                </div>

                                <p className="text-xs text-[#b09270]">
                                    Cotação válida até{" "}
                                    {new Date(
                                        quote.expiresAt
                                    ).toLocaleTimeString("pt-BR")}
                                    .
                                </p>
                            </div>

                            <Button
                                type="button"
                                onClick={handleConfirmOrder}
                                disabled={
                                    !quote ||
                                    !isWalletReady ||
                                    isQuoteExpired ||
                                    isWalletsLoading ||
                                    isWalletsError ||
                                    orderMutation.isPending ||
                                    orderMutation.isSuccess
                                }
                                className="mt-8 w-full bg-[#d8904c] text-[#140e0b] hover:bg-[#e6a96f]"
                            >
                                {orderMutation.isPending
                                    ? "Criando pedido..."
                                    : "Confirmar pedido"}
                            </Button>

                            {isQuoteExpired && (
                                <div
                                    role="alert"
                                    className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4"
                                >
                                    <p className="text-sm text-yellow-200">
                                        Sua cotação expirou. Volte ao carrinho
                                        para solicitar uma nova cotação.
                                    </p>

                                    <Link
                                        to="/carrinho"
                                        className="mt-3 inline-block text-sm text-[#d8904c] hover:underline"
                                    >
                                        Voltar ao carrinho
                                    </Link>
                                </div>
                            )}

                            {orderMutation.isError && (
                                <div
                                    role="alert"
                                    className="mt-4 rounded-lg border border-red-500/40 p-4"
                                >
                                    <p className="text-sm text-red-300">
                                        {getErrorMessage(orderMutation.error)}
                                    </p>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-3"
                                        disabled={
                                            !isWalletReady ||
                                            isQuoteExpired ||
                                            orderMutation.isPending
                                        }
                                        onClick={handleConfirmOrder}
                                    >
                                        Tentar novamente
                                    </Button>
                                </div>
                            )}

                            {orderMutation.isSuccess && (
                                <div
                                    role="status"
                                    className="mt-4 rounded-lg border border-[#d8904c]/40 bg-[#d8904c]/10 p-4"
                                >
                                    <h3 className="font-bold text-[#d8904c]">
                                        Pedido recebido!
                                    </h3>

                                    <p className="mt-2 text-sm text-[#f5e7d8]">
                                        Seu pedido foi criado e está aguardando
                                        a simulação do pagamento.
                                    </p>

                                    <p className="mt-3 break-all text-xs text-[#b09270]">
                                        Pedido: {orderMutation.data.id}
                                    </p>

                                    <p className="mt-2 text-xs text-[#b09270]">
                                        Status: {orderMutation.data.status}
                                    </p>
                                </div>
                            )}
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}