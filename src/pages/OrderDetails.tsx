import {
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { useEffect, useRef } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    XCircle,
} from "lucide-react";

import { getOrder } from "../api/orders";
import { getAuthToken } from "../api/auth";

import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

import { useRealtimeConnection } from "../realtime/useRealtimeConnection";

import { getRealtimeSocket } from "../realtime/socket";

function getErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        return (
            error.response?.data?.message ??
            "Não foi possível consultar o pedido."
        );
    }

    return "Ocorreu um erro inesperado.";
}

export function OrderDetails() {

    const queryClient = useQueryClient();

    const lastSynchronizedOrderId = useRef<string | null>(
        null
    );

    const { orderId } = useParams({
        from: "/pedido/$orderId",
    });

    const {
        status: realtimeStatus,
        isConnected: isRealtimeConnected,
    } = useRealtimeConnection();

    const authToken = getAuthToken();

    const {
        data: order,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["order", authToken, orderId],

        queryFn: () => getOrder(orderId),

        enabled: Boolean(authToken && orderId),

        retry: false,

        // Enquanto estiver pendente, consulta novamente.
        refetchInterval: (query) =>
            query.state.data?.status === "PENDING"
                ? 3000
                : false,

        refetchOnMount: "always",
    });

    const isPending = order?.status === "PENDING";
    const isConfirmed = order?.status === "CONFIRMED";
    const isFailed = order?.status === "FAILED";

    useEffect(() => {
        if (!order || order.status !== "CONFIRMED") {
            return;
        }

        // Evita repetir a sincronização para
        // o mesmo pedido nesta montagem.
        if (
            lastSynchronizedOrderId.current === order.id
        ) {
            return;
        }

        lastSynchronizedOrderId.current = order.id;

        async function synchronizeAfterPurchase() {
            await Promise.all([
                // Atualiza o contador do Header e o carrinho.
                queryClient.invalidateQueries({
                    queryKey: ["cart"],
                }),

                // Atualiza o catálogo com o novo estoque.
                queryClient.invalidateQueries({
                    queryKey: ["nfts"],
                }),
            ]);
        }

        void synchronizeAfterPurchase();
    }, [order, queryClient]);

    useEffect(() => {
        if (!authToken || !orderId) {
            return;
        }

        const socket = getRealtimeSocket();

        let lastEventVersion = 0;

        function refreshOrder() {
            void queryClient.invalidateQueries({
                queryKey: [
                    "order",
                    authToken,
                    orderId,
                ],
            });
        }

        function subscribeToOrder() {
            socket.emit(
                "order.watch",
                orderId
            );

            // Recupera alterações ocorridas
            // durante uma desconexão.
            refreshOrder();
        }

        function handleOrderUpdated(event: {
            orderId: string;
            version: number;
        }) {
            if (event.orderId !== orderId) {
                return;
            }

            if (
                !Number.isFinite(event.version) ||
                event.version <= lastEventVersion
            ) {
                return;
            }

            lastEventVersion = event.version;

            refreshOrder();
        }

        socket.on(
            "order.updated",
            handleOrderUpdated
        );

        socket.on(
            "connect",
            subscribeToOrder
        );

        if (socket.connected) {
            subscribeToOrder();
        }

        return () => {
            socket.emit(
                "order.unwatch",
                orderId
            );

            socket.off(
                "order.updated",
                handleOrderUpdated
            );

            socket.off(
                "connect",
                subscribeToOrder
            );
        };
    }, [
        authToken,
        orderId,
        queryClient,
    ]);

    return (
        <main className="min-h-screen bg-[#140e0b] px-6 py-12 text-[#f5e7d8]">
            <div className="mx-auto max-w-4xl">
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
                    Acompanhar pedido
                </h1>

                <div className="mb-4 flex items-center gap-2">
                    <span
                        className={`h-2.5 w-2.5 rounded-full ${isRealtimeConnected
                            ? "bg-green-400"
                            : realtimeStatus === "connecting"
                                ? "bg-yellow-400"
                                : "bg-red-400"
                            }`}
                    />

                    <span
                        role="status"
                        className="text-xs text-[#b09270]"
                    >
                        {isRealtimeConnected
                            ? "Tempo real conectado"
                            : realtimeStatus === "connecting"
                                ? "Conectando ao tempo real..."
                                : "Tempo real desconectado"}
                    </span>
                </div>

                <p className="mb-10 text-[#b09270]">
                    Consulte o andamento da sua compra.
                </p>

                {!authToken && (
                    <div
                        role="alert"
                        className="rounded-xl border border-yellow-500/40 bg-[#261711] p-6"
                    >
                        <p>
                            Faça login para consultar este pedido.
                        </p>

                        <Link
                            to="/login"
                            className="mt-4 inline-block text-[#d8904c] hover:underline"
                        >
                            Entrar na minha conta
                        </Link>
                    </div>
                )}

                {authToken && isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-36 bg-[#38241b]" />
                        <Skeleton className="h-56 bg-[#38241b]" />
                    </div>
                )}

                {authToken && isError && (
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

                {authToken && order && (
                    <div className="space-y-6">
                        <section className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                            <div
                                role="status"
                                className="flex items-start gap-4"
                            >
                                {isPending && (
                                    <Clock3
                                        size={32}
                                        className="shrink-0 text-yellow-400"
                                    />
                                )}

                                {isConfirmed && (
                                    <CheckCircle2
                                        size={32}
                                        className="shrink-0 text-green-400"
                                    />
                                )}

                                {isFailed && (
                                    <XCircle
                                        size={32}
                                        className="shrink-0 text-red-400"
                                    />
                                )}

                                <div>
                                    <h2 className="text-xl font-bold">
                                        {isPending
                                            ? "Pagamento pendente"
                                            : isConfirmed
                                                ? "Pagamento confirmado"
                                                : "Pagamento recusado"}
                                    </h2>

                                    <p className="mt-2 text-sm text-[#b09270]">
                                        {isPending
                                            ? "Estamos aguardando o resultado da simulação de pagamento."
                                            : isConfirmed
                                                ? "Seu pedido foi confirmado com sucesso."
                                                : "Não foi possível confirmar o pagamento."}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 border-t border-[#4a3328] pt-5">
                                <p className="text-sm text-[#b09270]">
                                    Identificador do pedido
                                </p>

                                <p className="mt-2 break-all text-sm">
                                    {order.id}
                                </p>

                                <p className="mt-4 text-sm text-[#b09270]">
                                    Criado em{" "}
                                    {new Date(
                                        order.createdAt
                                    ).toLocaleString("pt-BR")}
                                </p>
                            </div>
                        </section>

                        <section className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                            <h2 className="mb-6 text-xl font-bold">
                                Itens do pedido
                            </h2>

                            <div className="space-y-4">
                                {order.items.map((item) => (
                                    <div
                                        key={`${item.nftId}:${item.editionId ?? "default"}`}
                                        className="flex justify-between gap-4 border-b border-[#4a3328] pb-4 last:border-b-0"
                                    >
                                        <div>
                                            <h3 className="font-bold">
                                                {item.name}
                                            </h3>

                                            <p className="mt-2 text-sm text-[#b09270]">
                                                Quantidade: {item.quantity}
                                            </p>
                                        </div>

                                        <span className="text-[#d8904c]">
                                            {item.totalPriceEth} ETH
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                            <h2 className="mb-6 text-xl font-bold">
                                Resumo financeiro
                            </h2>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between gap-4">
                                    <span className="text-[#b09270]">
                                        Rede
                                    </span>

                                    <span>
                                        {order.network === "ethereum"
                                            ? "Ethereum"
                                            : "Polygon"}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-4">
                                    <span className="text-[#b09270]">
                                        Subtotal
                                    </span>

                                    <span>
                                        {order.subtotalEth} ETH
                                    </span>
                                </div>

                                {order.couponCode && (
                                    <div className="flex justify-between gap-4 text-green-400">
                                        <span>
                                            Desconto ({order.couponCode})
                                        </span>

                                        <span>
                                            -{order.discountEth} ETH
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between gap-4">
                                    <span className="text-[#b09270]">
                                        Taxa de rede
                                    </span>

                                    <span>
                                        {order.networkFeeEth} ETH
                                    </span>
                                </div>

                                <div className="flex justify-between gap-4 border-t border-[#4a3328] pt-5 text-lg font-bold">
                                    <span>Total</span>

                                    <span className="text-[#d8904c]">
                                        {order.totalEth} ETH
                                    </span>
                                </div>
                            </div>
                        </section>

                        {isPending && (
                            <p
                                role="status"
                                className="text-center text-sm text-[#b09270]"
                            >
                                O status será atualizado automaticamente.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}