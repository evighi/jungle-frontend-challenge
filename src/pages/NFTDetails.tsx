import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { getNFT } from "../api/nfts";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { addCartItem } from "../api/cart";

import { useNftRealtimeUpdates } from "../realtime/useNftRealtimeUpdates";

export function NFTDetails() {
    useNftRealtimeUpdates();
    const { nftId } = useParams({
        from: "/nft/$nftId",
    });

    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const addMutation = useMutation({
        mutationFn: () => addCartItem(nftId, 1),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["cart"],
            });

            await navigate({
                to: "/carrinho",
            });
        },
    });

    const { data: nft, isLoading, isError, refetch } = useQuery({
        queryKey: ["nft", nftId],
        queryFn: () => getNFT(nftId),
        retry: false,
    });

    return (
        <main className="min-h-screen bg-[#140e0b] px-6 py-12 text-[#f5e7d8]">
            <div className="mx-auto max-w-7xl">
                <Link
                    to="/"
                    search={{
                        search: "",
                        category: "",
                        sort: "",
                        page: 1,
                    }}
                    className="mb-10 inline-flex items-center gap-2 text-sm text-[#d8904c] hover:underline"
                >
                    <ArrowLeft size={18} />
                    Voltar ao catálogo
                </Link>

                {isLoading && (
                    <div className="grid gap-10 md:grid-cols-2">
                        <Skeleton className="aspect-square w-full bg-[#38241b]" />

                        <div className="space-y-5">
                            <Skeleton className="h-10 w-3/4 bg-[#38241b]" />
                            <Skeleton className="h-6 w-1/2 bg-[#38241b]" />
                            <Skeleton className="h-28 w-full bg-[#38241b]" />
                        </div>
                    </div>
                )}

                {isError && (
                    <div role="alert" className="rounded-xl bg-[#261711] p-10 text-center">
                        <h1 className="text-2xl font-bold">
                            NFT não encontrado
                        </h1>

                        <p className="mt-3 text-[#b09270]">
                            O NFT solicitado não existe ou está indisponível.
                        </p>

                        <Button
                            onClick={() => void refetch()}
                            className="mt-6 bg-[#d8904c] text-[#140e0b]"
                        >
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {nft && (
                    <div className="grid gap-12 md:grid-cols-2">
                        <div className="rounded-xl bg-[#261711] p-4">
                            <img
                                src={nft.image}
                                alt={`Arte digital ${nft.name}`}
                                className="aspect-square w-full rounded-lg object-cover"
                            />
                        </div>

                        <div>
                            <p className="text-sm text-[#d8904c]">
                                {nft.collection}
                            </p>

                            <h1 className="mt-5 text-4xl font-bold">
                                {nft.name}
                            </h1>

                            <p className="mt-5 text-[#b09270]">
                                Criado por {nft.creator}
                            </p>

                            <div className="mt-10 rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                                <p className="text-sm text-[#b09270]">
                                    Preço atual
                                </p>

                                <p className="mt-3 text-3xl font-bold text-[#d8904c]">
                                    {nft.priceEth} ETH
                                </p>

                                <p className="mt-4 text-sm text-[#b09270]">
                                    {nft.available} unidades disponíveis
                                </p>
                            </div>

                            <Button
                                disabled={addMutation.isPending || !nft.available}
                                onClick={() => addMutation.mutate()}
                                className="mt-8 w-full bg-[#d8904c] py-6 text-[#140e0b]"
                            >
                                {addMutation.isPending
                                    ? "Adicionando..."
                                    : "Adicionar ao carrinho"}
                            </Button>

                            {addMutation.isError && (
                                <p role="alert" className="mt-4 text-sm text-red-300">
                                    Não foi possível adicionar o NFT.
                                    Verifique a disponibilidade e tente novamente.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}