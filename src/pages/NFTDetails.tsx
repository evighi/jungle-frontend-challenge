import { useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Link,
    useNavigate,
    useParams,
} from "@tanstack/react-router";
import {
    ArrowLeft,
    Minus,
    Plus,
} from "lucide-react";

import { addCartItem } from "../api/cart";
import {
    getNFT,
    type NFT,
} from "../api/nfts";

import { FavoriteButton } from "../components/FavoriteButton";
import { NFTGallery } from "../components/NFTGallery";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useNftRealtimeUpdates } from "../realtime/useNftRealtimeUpdates";
import { NFTInformation } from "../components/NFTInformation";
import { RelatedNFTs } from "../components/RelatedNFTs";

interface NFTContentProps {
    nft: NFT;
}

interface AddCartVariables {
    quantity: number;
    editionId?: string;
}

function NFTContent({ nft }: NFTContentProps) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const defaultEdition =
        nft.editions?.find(
            (edition) =>
                edition.priceEth === nft.priceEth &&
                edition.available === nft.available
        ) ??
        nft.editions?.[0];

    const [selectedEditionId, setSelectedEditionId] =
        useState<string | undefined>(
            defaultEdition?.id
        );

    const [requestedQuantity, setRequestedQuantity] =
        useState(1);

    const selectedEdition = nft.editions?.find(
        (edition) => edition.id === selectedEditionId
    );

    const available = Math.max(
        0,
        selectedEdition?.available ?? nft.available
    );

    const priceEth =
        selectedEdition?.priceEth ?? nft.priceEth;

    const quantity = Math.max(
        1,
        Math.min(
            requestedQuantity,
            Math.max(1, available)
        )
    );

    const isSoldOut = available === 0;

    const addMutation = useMutation({
        mutationFn: ({
            quantity: selectedQuantity,
            editionId,
        }: AddCartVariables) =>
            addCartItem(
                nft.id,
                selectedQuantity,
                editionId
            ),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["cart"],
            });

            await navigate({
                to: "/carrinho",
            });
        },
    });

    const isAdding = addMutation.isPending;

    function selectEdition(editionId: string) {
        if (isAdding) return;

        setSelectedEditionId(editionId);
        setRequestedQuantity(1);
        addMutation.reset();
    }

    function decreaseQuantity() {
        setRequestedQuantity(
            Math.max(1, quantity - 1)
        );
    }

    function increaseQuantity() {
        setRequestedQuantity(
            Math.min(available, quantity + 1)
        );
    }

    function handleAddToCart() {
        if (isSoldOut || isAdding) return;

        const isLegacyEdition =
            selectedEdition?.id === defaultEdition?.id;

        addMutation.mutate({
            quantity,
            editionId: isLegacyEdition
                ? undefined
                : selectedEdition?.id,
        });
    }

    return (
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <NFTGallery nft={nft} />

            <section>
                <p className="text-sm text-[#d8904c]">
                    {nft.collection}
                </p>

                <div className="mt-4 flex items-start justify-between gap-4">
                    <h1 className="text-3xl font-bold md:text-4xl">
                        {nft.name}
                    </h1>

                    <FavoriteButton
                        nftId={nft.id}
                        nftName={nft.name}
                    />
                </div>

                <p className="mt-5 text-sm text-[#b09270]">
                    Criado por {nft.creator}
                </p>

                {nft.editions && nft.editions.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-3 text-sm font-semibold">
                            Edição:
                        </h2>

                        <div
                            role="group"
                            aria-label="Selecionar edição do NFT"
                            className="flex flex-wrap gap-3"
                        >
                            {nft.editions.map((edition) => {
                                const selected =
                                    selectedEditionId ===
                                    edition.id;

                                const soldOut =
                                    edition.available === 0;

                                const label =
                                    edition.type === "OPEN"
                                        ? "Aberta"
                                        : edition.type;

                                return (
                                    <button
                                        key={edition.id}
                                        type="button"
                                        aria-pressed={selected}
                                        disabled={
                                            isAdding || soldOut
                                        }
                                        onClick={() =>
                                            selectEdition(
                                                edition.id
                                            )
                                        }
                                        className={[
                                            "rounded-lg border px-4 py-2",
                                            "text-sm font-medium",
                                            "transition-colors",
                                            "focus-visible:outline",
                                            "focus-visible:outline-2",
                                            "focus-visible:outline-offset-2",
                                            "focus-visible:outline-[#d8904c]",
                                            selected
                                                ? "border-[#d8904c] bg-[#d8904c] text-[#140e0b]"
                                                : "border-[#4a3328] bg-[#261711] text-[#d8904c] hover:border-[#d8904c]",
                                            soldOut
                                                ? "cursor-not-allowed opacity-40"
                                                : "",
                                        ].join(" ")}
                                        title={
                                            soldOut
                                                ? "Edição esgotada"
                                                : `${edition.priceEth} ETH`
                                        }
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-3 text-xs text-[#b09270]">
                            Escolha a edição desejada para
                            consultar seu preço e disponibilidade.
                        </p>
                    </div>
                )}

                <div className="mt-8 rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                    <p className="text-sm text-[#b09270]">
                        Preço atual
                    </p>

                    <p
                        data-testid="nft-selected-price"
                        className="mt-3 text-3xl font-bold text-[#d8904c]"
                    >
                        {priceEth} ETH
                    </p>

                    <p
                        data-testid="nft-selected-stock"
                        className="mt-4 text-sm text-[#b09270]"
                    >
                        {isSoldOut
                            ? "NFT esgotado"
                            : `${available} unidades disponíveis`}
                    </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-5">
                    <span className="text-sm font-medium">
                        Quantidade
                    </span>

                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Diminuir quantidade"
                            disabled={
                                quantity <= 1 || isAdding
                            }
                            onClick={decreaseQuantity}
                            className="border-[#d8904c] text-[#d8904c]"
                        >
                            <Minus size={16} />
                        </Button>

                        <output
                            aria-label="Quantidade selecionada"
                            className="min-w-8 text-center text-lg font-bold"
                        >
                            {quantity}
                        </output>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Aumentar quantidade"
                            disabled={
                                isSoldOut ||
                                quantity >= available ||
                                isAdding
                            }
                            onClick={increaseQuantity}
                            className="border-[#d8904c] text-[#d8904c]"
                        >
                            <Plus size={16} />
                        </Button>
                    </div>
                </div>

                <Button
                    type="button"
                    disabled={isAdding || isSoldOut}
                    onClick={handleAddToCart}
                    className="mt-8 w-full bg-[#d8904c] py-6 font-bold text-[#140e0b] hover:bg-[#e6a96f]"
                >
                    {isAdding
                        ? "Adicionando..."
                        : isSoldOut
                            ? "NFT esgotado"
                            : "Adicionar ao carrinho"}
                </Button>

                {addMutation.isError && (
                    <p
                        role="alert"
                        className="mt-4 text-sm text-red-300"
                    >
                        Não foi possível adicionar o NFT.
                        Verifique a disponibilidade e
                        tente novamente.
                    </p>
                )}

                <div className="mt-8 space-y-3 border-t border-[#4a3328] pt-6 text-sm">
                    <p>
                        <span className="text-[#b09270]">
                            ID do token:
                        </span>{" "}
                        #{nft.id}
                    </p>

                    <p>
                        <span className="text-[#b09270]">
                            Coleção:
                        </span>{" "}
                        {nft.collection}
                    </p>

                    <p>
                        <span className="text-[#b09270]">
                            Categoria:
                        </span>{" "}
                        {nft.category}
                    </p>

                    {selectedEdition && (
                        <p>
                            <span className="text-[#b09270]">
                                Edição selecionada:
                            </span>{" "}
                            {selectedEdition.type === "OPEN"
                                ? "Aberta"
                                : selectedEdition.type}
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}

export function NFTDetails() {
    useNftRealtimeUpdates();

    const { nftId } = useParams({
        from: "/nft/$nftId",
    });

    const {
        data: nft,
        isLoading,
        isError,
        refetch,
    } = useQuery({
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
                    <div
                        role="alert"
                        className="rounded-xl bg-[#261711] p-10 text-center"
                    >
                        <h1 className="text-2xl font-bold">
                            NFT não encontrado
                        </h1>

                        <p className="mt-3 text-[#b09270]">
                            O NFT solicitado não existe
                            ou está indisponível.
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
                    <>
                        <NFTContent
                            key={nft.id}
                            nft={nft}
                        />

                        <NFTInformation nft={nft} />

                        <RelatedNFTs nft={nft} />
                    </>
                )}
            </div>
        </main>
    );
}