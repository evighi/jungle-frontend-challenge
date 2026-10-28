import {
    Link,
    useNavigate,
    useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";

import { getNFTs } from "../api/nfts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useNftRealtimeUpdates } from "../realtime/useNftRealtimeUpdates";
import { FavoriteButton } from "../components/FavoriteButton";


export function Home() {
    useNftRealtimeUpdates();
    const { search, category, sort, page } = useSearch({
        from: "/",
    });

    const navigate = useNavigate({
        from: "/",
    });

    const {
        data,
        isLoading,
        isError,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["nfts", search, category, sort, page],
        queryFn: ({ signal }) =>
            getNFTs(
                {
                    search,
                    category,
                    sort,
                    page,
                },
                signal
            ),
        placeholderData: (previousData) => previousData,
    });
    function updateSearch(value: string) {
        void navigate({
            to: "/",
            replace: true,
            search: {
                search: value,
                category,
                sort,
                page: 1,
            },
        });
    }

    function updateCategory(value: string) {
        void navigate({
            to: "/",
            search: {
                search,
                category: value,
                sort,
                page: 1,
            },
        });
    }

    function updateSort(value: string) {
        void navigate({
            to: "/",
            search: {
                search,
                category,
                sort: value,
                page: 1,
            },
        });
    }

    return (
        <main className="min-h-screen bg-[#140e0b] text-[#f5e7d8]">
            {/* HERO */}
            <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
                <div>
                    <p className="mb-8 text-sm text-[#d8904c]">
                        Bem-vindo à Kurio
                    </p>

                    <h1 className="max-w-xl text-3xl font-bold uppercase leading-relaxed tracking-wide md:text-5xl">
                        Seja dono do futuro da arte digital
                    </h1>

                    <p className="mt-8 max-w-lg text-sm leading-7 text-[#b09270]">
                        Descubra NFTs selecionados de criadores emergentes
                        e consagrados. Colecione arte digital rara, apoie
                        artistas e tenha uma parte da cultura da internet.
                    </p>

                    <a
                        href="#catalogo"
                        className="mt-8 inline-flex items-center gap-3 rounded bg-[#d8904c] px-6 py-4 text-sm font-semibold text-[#140e0b] transition hover:bg-[#e6a96f]"
                    >
                        EXPLORAR
                        <ArrowRight size={18} />
                    </a>
                </div>

                <div className="overflow-hidden rounded-xl bg-[#261711]">
                    <img
                        src="/images/nft-04.png"
                        alt="Arte digital em destaque da coleção Kurio"
                        className="aspect-square w-full object-cover"
                    />
                </div>
            </section>

            {/* CATÁLOGO */}
            <section
                id="catalogo"
                className="mx-auto max-w-7xl px-6 pb-24"
            >
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-[#d8904c]">
                        Todos os NFTs
                    </h2>

                    <p className="mt-2 text-sm text-[#b09270]">
                        Explore nossa coleção de arte digital.
                    </p>
                </div>

                {/* BUSCA E FILTROS */}
                <div className="mb-10 grid gap-4 md:grid-cols-3">
                    <div className="relative">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b09270]"
                        />

                        <Input
                            aria-label="Buscar NFTs"
                            placeholder="Buscar NFTs..."
                            value={search}
                            onChange={(event) =>
                                updateSearch(event.target.value)
                            }
                            className="border-[#4a3328] bg-[#261711] pl-10 text-[#f5e7d8]"
                        />
                    </div>

                    <select
                        aria-label="Filtrar por categoria"
                        value={category}
                        onChange={(event) =>
                            updateCategory(event.target.value)
                        }
                        className="min-h-10 rounded-md border border-[#4a3328] bg-[#261711] px-4 text-sm text-[#f5e7d8]"
                    >
                        <option value="">Todas as categorias</option>
                        <option value="Arte">Arte</option>
                        <option value="Digital">Digital</option>
                        <option value="Música">Música</option>
                    </select>

                    <select
                        aria-label="Ordenar NFTs"
                        value={sort}
                        onChange={(event) =>
                            updateSort(event.target.value)
                        }
                        className="min-h-10 rounded-md border border-[#4a3328] bg-[#261711] px-4 text-sm text-[#f5e7d8]"
                    >
                        <option value="">Ordenação padrão</option>
                        <option value="price_asc">
                            Menor preço
                        </option>
                        <option value="price_desc">
                            Maior preço
                        </option>
                    </select>
                </div>

                {/* CARREGAMENTO */}
                {isLoading && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="rounded-xl bg-[#261711] p-3"
                            >
                                <Skeleton className="aspect-square w-full bg-[#4a3328]" />
                                <Skeleton className="mt-4 h-6 w-2/3 bg-[#4a3328]" />
                                <Skeleton className="mt-3 h-4 w-1/3 bg-[#4a3328]" />
                            </div>
                        ))}
                    </div>
                )}

                {/* ERRO */}
                {isError && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-700/50 bg-[#261711] p-8 text-center"
                    >
                        <p>Não foi possível carregar os NFTs.</p>

                        <Button
                            className="mt-4 bg-[#d8904c] text-[#140e0b]"
                            onClick={() => void refetch()}
                        >
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {/* RESULTADOS */}
                {!isLoading && !isError && data && (
                    <>
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <p className="text-sm text-[#b09270]">
                                {data.total} NFT(s) encontrado(s)
                            </p>

                            {isFetching && (
                                <p
                                    role="status"
                                    className="text-xs text-[#d8904c]"
                                >
                                    Atualizando...
                                </p>
                            )}
                        </div>

                        {data.items.length === 0 ? (
                            <div className="rounded-xl border border-[#4a3328] p-12 text-center">
                                <p className="text-[#b09270]">
                                    Nenhum NFT encontrado.
                                </p>

                                <Button
                                    variant="outline"
                                    className="mt-5"
                                    onClick={() => {
                                        void navigate({
                                            to: "/",
                                            search: {
                                                search: "",
                                                category: "",
                                                sort: "",
                                                page: 1,
                                            },
                                        });
                                    }}
                                >
                                    Limpar filtros
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {data.items.map((nft) => (
                                    <article
                                        key={nft.id}
                                        className="relative overflow-visible rounded-xl border border-[#38241b] bg-[#261711] p-3 transition hover:border-[#d8904c]"
                                    >
                                        <div className="absolute right-5 top-5 z-10">
                                            <FavoriteButton
                                                nftId={nft.id}
                                                nftName={nft.name}
                                            />
                                        </div>
                                        <img
                                            src={nft.image}
                                            alt={`NFT ${nft.name}`}
                                            className="aspect-square w-full rounded-lg object-cover"
                                        />

                                        <div className="px-2 pb-3 pt-5">
                                            <p className="text-xs text-[#b09270]">
                                                {nft.collection}
                                            </p>

                                            <h3 className="mt-2 text-xl font-bold">
                                                {nft.name}
                                            </h3>

                                            <p className="mt-2 text-xs text-[#b09270]">
                                                Criado por {nft.creator}
                                            </p>

                                            <div className="mt-5 flex items-end justify-between">
                                                <div>
                                                    <p className="text-xs text-[#b09270]">
                                                        Preço
                                                    </p>

                                                    <p className="mt-1 text-lg font-bold text-[#d8904c]">
                                                        {nft.priceEth} ETH
                                                    </p>
                                                </div>

                                                <span className="text-xs text-[#b09270]">
                                                    {nft.available} disponíveis
                                                </span>
                                            </div>

                                            <Button
                                                asChild
                                                className="mt-5 w-full bg-[#d8904c] text-[#140e0b] hover:bg-[#e6a96f]"
                                            >
                                                <Link
                                                    to="/nft/$nftId"
                                                    params={{ nftId: nft.id }}
                                                >
                                                    Ver detalhes
                                                </Link>
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        {/* PAGINAÇÃO */}
                        {data.totalPages > 1 && (
                            <div className="mt-12 flex items-center justify-center gap-5">
                                <Button
                                    variant="outline"
                                    disabled={page === 1}
                                    onClick={() => {
                                        void navigate({
                                            to: "/",
                                            search: {
                                                search,
                                                category,
                                                sort,
                                                page: Math.max(1, page - 1),
                                            },
                                        });
                                    }}
                                >
                                    Anterior
                                </Button>

                                <span className="text-sm text-[#b09270]">
                                    Página {page} de {data.totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    disabled={page >= data.totalPages}
                                    onClick={() => {
                                        void navigate({
                                            to: "/",
                                            search: {
                                                search,
                                                category,
                                                sort,
                                                page: page + 1,
                                            },
                                        });
                                    }}
                                >
                                    Próxima
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}