import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { Minus, Plus, Trash2 } from "lucide-react";

import {
    getCart,
    removeCartItem,
    updateCartItem,
} from "../api/cart";

import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

import { useEffect, useState } from "react";

import {
    getQuote,
    type BlockchainNetwork,
} from "../api/quote";

import { getAuthToken } from "../api/auth";

import { useNftRealtimeUpdates } from "../realtime/useNftRealtimeUpdates";

function getErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        return error.response?.data?.message ?? "Erro na operação.";
    }

    return "Ocorreu um erro inesperado.";
}

// Converte ETH decimal para unidades inteiras,
// evitando erros de precisão com números decimais.
function ethToWei(value: string): bigint {
    if (!/^\d+(\.\d{1,18})?$/.test(value)) {
        throw new Error("Valor de ETH inválido.");
    }

    const [integer, decimal = ""] = value.split(".");

    return (
        BigInt(integer) * 10n ** 18n +
        BigInt(decimal.padEnd(18, "0"))
    );
}

function formatWei(value: bigint): string {
    const integer = value / 10n ** 18n;
    const decimal = (value % 10n ** 18n)
        .toString()
        .padStart(18, "0")
        .replace(/0+$/, "");

    return decimal
        ? `${integer}.${decimal}`
        : integer.toString();
}

export function Cart() {
    useNftRealtimeUpdates();

    const queryClient = useQueryClient();

    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    const [network, setNetwork] =
        useState<BlockchainNetwork>("ethereum");

    const [couponInput, setCouponInput] = useState("");

    const [appliedCoupon, setAppliedCoupon] = useState("");

    const {
        data: cart,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["cart"],
        queryFn: getCart,
    });

    const cartFingerprint =
        cart?.items
            .map(({ nft, editionId, quantity }) =>
                JSON.stringify([
                    nft.id,
                    editionId ?? null,
                    quantity,
                ])
            )
            .sort()
            .join("|") ?? "";

    const {
        data: quote,
        isFetching: isQuoteLoading,
        isError: isQuoteError,
        error: quoteError,
        refetch: refetchQuote,
    } = useQuery({
        queryKey: [
            "quote",
            network,
            cartFingerprint,
            appliedCoupon,
        ],

        queryFn: () =>
            getQuote({
                network,
                couponCode: appliedCoupon || undefined,
            }),

        enabled:
            Boolean(getAuthToken()) &&
            Boolean(cart?.items.length),

        retry: false,
        staleTime: 0,
    });

    const isQuoteExpired =
        quote !== undefined &&
        currentTime > 0 &&
        currentTime >= new Date(quote.expiresAt).getTime();

    const updateMutation = useMutation({
        mutationFn: ({
            nftId,
            quantity,
            editionId,
        }: {
            nftId: string;
            quantity: number;
            editionId?: string;
        }) => updateCartItem(nftId, quantity, editionId),

        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["cart"],
            });
        },
    });

    const removeMutation = useMutation({
        mutationFn: ({
            nftId,
            editionId,
        }: {
            nftId: string;
            editionId?: string;
        }) => removeCartItem(nftId, editionId),

        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["cart"],
            });
        },
    });

    const isUpdating =
        updateMutation.isPending || removeMutation.isPending;

    const mutationError =
        updateMutation.error ?? removeMutation.error;

    const subtotal = cart?.items.reduce(
        (total, item) => {
            const priceEth =
                item.edition?.priceEth ??
                item.nft.priceEth;

            return (
                total +
                ethToWei(priceEth) *
                BigInt(item.quantity)
            );
        },
        0n
    ) ?? 0n;

    return (
        <main className="min-h-screen bg-[#140e0b] px-6 py-12 text-[#f5e7d8]">
            <div className="mx-auto max-w-7xl">
                <h1 className="mb-10 text-3xl font-bold">
                    Carrinho de NFTs
                </h1>

                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-40 w-full bg-[#38241b]" />
                        <Skeleton className="h-40 w-full bg-[#38241b]" />
                    </div>
                )}

                {isError && (
                    <div role="alert" className="rounded-xl bg-[#261711] p-8">
                        <p>Não foi possível carregar seu carrinho.</p>

                        <Button
                            className="mt-4"
                            onClick={() => void refetch()}
                        >
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {!isLoading && !isError && cart?.items.length === 0 && (
                    <div className="rounded-xl border border-[#4a3328] bg-[#261711] p-12 text-center">
                        <h2 className="text-xl font-bold">
                            Seu carrinho está vazio
                        </h2>

                        <p className="mt-3 text-[#b09270]">
                            Explore o catálogo e escolha seus NFTs favoritos.
                        </p>

                        <Link
                            to="/"
                            search={{
                                search: "",
                                category: "",
                                sort: "",
                                page: 1,
                            }}
                            className="mt-6 inline-block rounded bg-[#d8904c] px-6 py-3 text-[#140e0b]"
                        >
                            Explorar NFTs
                        </Link>
                    </div>
                )}

                {cart && cart.items.length > 0 && (
                    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <section className="min-w-0">
                            <div className="mb-3 hidden grid-cols-[minmax(0,1fr)_105px_125px_110px_40px] gap-3 border-b border-[#4a3328] pb-3 text-sm font-semibold lg:grid">
                                <span>NFTs</span>
                                <span>Preço</span>
                                <span>Edições</span>
                                <span>Total</span>
                                <span className="sr-only">Ações</span>
                            </div>

                            <div className="space-y-3">
                                {cart.items.map(({ nft, quantity, editionId, edition }) => (
                                    <article
                                        key={JSON.stringify([
                                            nft.id,
                                            editionId ?? null,
                                        ])}
                                        className="grid gap-4 rounded-lg bg-[#261711] p-4 lg:grid-cols-[minmax(0,1fr)_105px_125px_110px_40px] lg:items-center lg:gap-3"
                                    >
                                        {/* NFT */}
                                        <div className="flex min-w-0 items-center gap-4">
                                            <img
                                                src={nft.image}
                                                alt={nft.name}
                                                className="h-20 w-20 shrink-0 rounded-lg object-cover"
                                            />

                                            <div className="min-w-0">
                                                <h2 className="truncate font-bold text-[#f5e7d8]">
                                                    {nft.name}
                                                </h2>

                                                <p className="mt-1 truncate text-xs text-[#b09270]">
                                                    {nft.collection}
                                                </p>

                                                {edition && (
                                                    <p className="mt-1 text-xs text-[#d8904c]">
                                                        Edição:{" "}
                                                        {edition.type === "OPEN"
                                                            ? "Aberta"
                                                            : edition.type}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* PREÇO UNITÁRIO */}
                                        <div className="flex items-center justify-between gap-3 lg:block">
                                            <span className="text-xs text-[#b09270] lg:hidden">
                                                Preço
                                            </span>

                                            <span className="text-sm font-semibold text-[#d8904c]">
                                                {edition?.priceEth ?? nft.priceEth} ETH
                                            </span>
                                        </div>

                                        {/* QUANTIDADE */}
                                        <div className="flex items-center justify-between gap-3 lg:block">
                                            <span className="text-xs text-[#b09270] lg:hidden">
                                                Edições
                                            </span>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={`Diminuir quantidade de ${nft.name}`}
                                                    disabled={isUpdating || quantity <= 1}
                                                    onClick={() =>
                                                        updateMutation.mutate({
                                                            nftId: nft.id,
                                                            editionId,
                                                            quantity: quantity - 1,
                                                        })
                                                    }
                                                    className="h-8 w-8 border-[#d8904c] text-[#d8904c]"
                                                >
                                                    <Minus size={14} />
                                                </Button>

                                                <output className="min-w-5 text-center text-sm">
                                                    {quantity}
                                                </output>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={`Aumentar quantidade de ${nft.name}`}
                                                    disabled={
                                                        isUpdating ||
                                                        quantity >=
                                                        (edition?.available ?? nft.available)
                                                    }
                                                    onClick={() =>
                                                        updateMutation.mutate({
                                                            nftId: nft.id,
                                                            editionId,
                                                            quantity: quantity + 1,
                                                        })
                                                    }
                                                    className="h-8 w-8 border-[#d8904c] text-[#d8904c]"
                                                >
                                                    <Plus size={14} />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* TOTAL DO ITEM */}
                                        <div className="flex items-center justify-between gap-3 lg:block">
                                            <span className="text-xs text-[#b09270] lg:hidden">
                                                Total
                                            </span>

                                            <strong className="text-sm text-[#d8904c]">
                                                {formatWei(
                                                    ethToWei(
                                                        edition?.priceEth ?? nft.priceEth
                                                    ) * BigInt(quantity)
                                                )}{" "}
                                                ETH
                                            </strong>
                                        </div>

                                        {/* REMOVER */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={isUpdating}
                                            aria-label={`Remover ${nft.name}`}
                                            onClick={() =>
                                                removeMutation.mutate({
                                                    nftId: nft.id,
                                                    editionId,
                                                })
                                            }
                                            className="h-9 w-9 text-[#b09270] hover:bg-[#4a3328] hover:text-red-300"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <aside className="h-fit rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                            <h2 className="text-xl font-bold">
                                Resumo do pedido
                            </h2>
                            <div className="mt-6">
                                <label
                                    htmlFor="checkout-network"
                                    className="mb-2 block text-sm text-[#b09270]"
                                >
                                    Rede blockchain
                                </label>

                                <select
                                    id="checkout-network"
                                    value={network}
                                    onChange={(event) =>
                                        setNetwork(event.target.value as BlockchainNetwork)
                                    }
                                    className="w-full rounded-lg border border-[#4a3328] bg-[#140e0b] px-4 py-3 text-sm text-[#f5e7d8]"
                                >
                                    <option value="ethereum">Ethereum</option>
                                    <option value="polygon">Polygon</option>
                                </select>
                            </div>

                            <div className="mt-6">
                                <label
                                    htmlFor="cart-coupon"
                                    className="mb-2 block text-sm text-[#b09270]"
                                >
                                    Cupom de desconto
                                </label>

                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();

                                        setAppliedCoupon(
                                            couponInput.trim().toUpperCase()
                                        );
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        id="cart-coupon"
                                        value={couponInput}
                                        onChange={(event) =>
                                            setCouponInput(event.target.value)
                                        }
                                        placeholder="Digite seu cupom"
                                        className="min-w-0 flex-1 rounded-lg border border-[#4a3328] bg-[#140e0b] px-3 py-2 text-sm text-[#f5e7d8] placeholder:text-[#806858]"
                                    />

                                    <Button
                                        type="submit"
                                        disabled={
                                            !couponInput.trim() ||
                                            isQuoteLoading ||
                                            !getAuthToken()
                                        }
                                        className="bg-[#d8904c] text-[#140e0b] hover:bg-[#e6a96f]"
                                    >
                                        Aplicar
                                    </Button>
                                </form>

                                {appliedCoupon && (
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#b09270]">
                                            Cupom informado: {appliedCoupon}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCouponInput("");
                                                setAppliedCoupon("");
                                            }}
                                            className="text-xs font-medium text-[#d8904c] hover:underline"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-between text-sm text-[#b09270]">
                                <span>Itens</span>
                                <span>{cart.totalItems}</span>
                            </div>

                            <div className="mt-5 flex justify-between gap-4 border-t border-[#4a3328] pt-5">
                                <span>
                                    {quote && !isQuoteError && !isQuoteLoading
                                        ? "Subtotal"
                                        : "Subtotal estimado"}
                                </span>

                                <strong className="text-[#d8904c]">
                                    {quote && !isQuoteError && !isQuoteLoading
                                        ? quote.subtotalEth
                                        : formatWei(subtotal)}{" "}
                                    ETH
                                </strong>
                            </div>

                            {!getAuthToken() && (
                                <p className="mt-5 text-sm text-[#b09270]">
                                    Entre na sua conta para consultar o total com
                                    taxas de rede e descontos.
                                </p>
                            )}

                            {getAuthToken() && isQuoteLoading && (
                                <p
                                    role="status"
                                    className="mt-5 text-sm text-[#b09270]"
                                >
                                    Calculando cotação...
                                </p>
                            )}

                            {getAuthToken() && isQuoteError && (
                                <div
                                    role="alert"
                                    className="mt-5 rounded-lg border border-red-500/40 p-4"
                                >
                                    <p className="text-sm text-red-300">
                                        {getErrorMessage(quoteError)}
                                    </p>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-3"
                                        onClick={() => void refetchQuote()}
                                    >
                                        Tentar novamente
                                    </Button>
                                </div>
                            )}

                            {getAuthToken() &&
                                !isQuoteLoading &&
                                !isQuoteError &&
                                quote &&
                                !isQuoteExpired && (
                                    <div className="mt-6 space-y-4 border-t border-[#4a3328] pt-5">
                                        {quote.couponCode && (
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="text-green-400">
                                                    Desconto ({quote.couponCode})
                                                </span>

                                                <span className="text-green-400">
                                                    -{quote.discountEth} ETH
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#b09270]">
                                                Taxa de rede
                                            </span>

                                            <span>{quote.networkFeeEth} ETH</span>
                                        </div>

                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Total cotado</span>

                                            <span className="text-[#d8904c]">
                                                {quote.totalEth} ETH
                                            </span>
                                        </div>

                                        <p className="text-xs text-[#b09270]">
                                            Cotação válida até{" "}
                                            {new Date(quote.expiresAt).toLocaleTimeString(
                                                "pt-BR"
                                            )}
                                            .
                                        </p>
                                    </div>
                                )}

                            {getAuthToken() &&
                                quote &&
                                isQuoteExpired &&
                                !isQuoteLoading && (
                                    <div
                                        role="alert"
                                        className="mt-5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4"
                                    >
                                        <p className="text-sm text-yellow-200">
                                            Sua cotação expirou. Atualize os valores
                                            antes de continuar para o pagamento.
                                        </p>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mt-3"
                                            onClick={() => void refetchQuote()}
                                        >
                                            Atualizar cotação
                                        </Button>
                                    </div>
                                )}

                            {getAuthToken() &&
                                quote &&
                                !isQuoteExpired &&
                                !isQuoteLoading &&
                                !isQuoteError &&
                                !isUpdating ? (
                                <Link
                                    to="/checkout"
                                    search={{
                                        quoteId: quote.quoteId,
                                    }}
                                    className="mt-8 flex w-full items-center justify-center rounded-lg bg-[#d8904c] px-4 py-3 text-sm font-medium text-[#140e0b] transition-colors hover:bg-[#e6a96f]"
                                >
                                    Continuar para pagamento
                                </Link>
                            ) : (
                                <Button
                                    disabled
                                    className="mt-8 w-full bg-[#d8904c] text-[#140e0b]"
                                >
                                    Continuar para pagamento
                                </Button>
                            )}
                        </aside>
                    </div>
                )}

                {mutationError && (
                    <p
                        role="alert"
                        className="mt-6 rounded-lg border border-red-500/40 p-4 text-red-300"
                    >
                        {getErrorMessage(mutationError)}
                    </p>
                )}
            </div>
        </main>
    );
}