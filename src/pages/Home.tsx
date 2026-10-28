import {
    Link,
    useNavigate,
    useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";

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
    const [maxPrice, setMaxPrice] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "trending">("all");

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

    const priceLimit = maxPrice === "" ? null : Number(maxPrice);
    const visibleItems = (data?.items ?? []).filter(
        (nft) => priceLimit === null || Number(nft.priceEth) <= priceLimit
    );

    return (
        <main className="min-h-screen bg-[#140e0b] text-[#f5e7d8]">
            {/* HERO */}
            <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-2 md:items-center md:py-16">
                <div>
                    <p className="mb-5 text-sm text-[#d8904c]">
                        Bem-vindo à Kurio
                    </p>

                    <h1 className="max-w-xl text-3xl font-bold uppercase leading-tight tracking-wide md:text-5xl">
                        Seja dono do futuro da arte digital
                    </h1>

                    <p className="mt-5 max-w-lg text-sm leading-7 text-[#b09270]">
                        Descubra NFTs selecionados de criadores emergentes
                        e consagrados. Colecione arte digital rara, apoie
                        artistas e tenha uma parte da cultura da internet.
                    </p>

                    <a
                        href="#catalogo"
                        className="mt-6 inline-flex items-center gap-3 rounded bg-[#d8904c] px-6 py-3 text-sm font-semibold text-[#140e0b] transition hover:bg-[#e6a96f]"
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
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-[#d8904c]">
                        Todos os NFTs
                    </h2>

                    <p className="mt-2 text-sm text-[#b09270]">
                        Explore nossa coleção de arte digital.
                    </p>
                </div>

                <div className="grid items-start gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
                    {/* FILTROS LATERAIS, COMO NO LAYOUT DE REFERÊNCIA */}
                    <aside className="rounded-lg border border-[#3b261e] bg-[#261711] p-5 lg:sticky lg:top-24" aria-label="Filtros do catálogo">
                        <h3 className="mb-4 border-b border-[#4a3328] pb-3 text-sm font-bold">Coleções</h3>
                        <div className="space-y-1">
                            {[
                                { value: "", label: "Todos os NFTs" },
                                { value: "Arte", label: "Arte digital" },
                                { value: "Digital", label: "Colecionáveis" },
                                { value: "Música", label: "Música" },
                            ].map((option) => (
                                <button key={option.label} type="button" onClick={() => updateCategory(option.value)}
                                    aria-pressed={category === option.value}
                                    className={`flex w-full justify-between rounded px-2 py-2 text-left text-xs transition hover:bg-[#38241b] ${category === option.value ? "font-semibold text-[#d8904c]" : "text-[#b09270]"}`}>
                                    {option.label}<span aria-hidden="true">{category === option.value ? "●" : "○"}</span>
                                </button>
                            ))}
                        </div>

                        <label htmlFor="category-filter" className="mt-5 block text-xs font-semibold">Filtrar por categoria</label>
                        <select id="category-filter" aria-label="Filtrar por categoria" value={category}
                            onChange={(event) => updateCategory(event.target.value)}
                            className="mt-2 w-full rounded border border-[#4a3328] bg-[#140e0b] p-2 text-xs text-[#f5e7d8]">
                            <option value="">Todas as categorias</option>
                            <option value="Arte">Arte</option>
                            <option value="Digital">Digital</option>
                            <option value="Música">Música</option>
                        </select>

                        <div className="mt-7 border-t border-[#4a3328] pt-5">
                            <label htmlFor="max-price" className="block text-sm font-bold">Faixa de preço</label>
                            <p className="mt-2 text-xs text-[#b09270]">Preço máximo (ETH) nesta página</p>
                            <input id="max-price" type="number" min="0" step="0.01" inputMode="decimal"
                                value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}
                                placeholder="Sem limite"
                                className="mt-3 w-full rounded border border-[#4a3328] bg-[#140e0b] px-3 py-2 text-sm text-[#f5e7d8]" />
                            {maxPrice !== "" && <button type="button" className="mt-3 text-xs text-[#d8904c] hover:underline" onClick={() => setMaxPrice("")}>Limpar preço</button>}
                        </div>

                        <div className="mt-7 border-t border-[#4a3328] pt-5">
                            <h3 className="text-sm font-bold">Rede</h3>
                            <p className="mt-3 text-xs leading-5 text-[#b09270]">Ethereum e Polygon disponíveis no checkout. A filtragem por rede não está disponível neste catálogo.</p>
                        </div>
                    </aside>

                    <div className="min-w-0">
                        <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-[#4a3328] pb-4">
                            {([
                                ["all", "Todos os NFTs"],
                                ["trending", "Maior preço"],
                            ] as const).map(([value, label]) => (
                                <button type="button" key={value} aria-pressed={activeTab === value}
                                    onClick={() => { setActiveTab(value); updateSort(value === "all" ? "" : "price_desc"); }}
                                    className={`border-b-2 pb-2 text-xs ${activeTab === value ? "border-[#d8904c] text-[#d8904c]" : "border-transparent text-[#b09270] hover:text-[#f5e7d8]"}`}>{label}</button>
                            ))}
                            <label className="ml-auto flex items-center gap-2 text-xs text-[#b09270]">Ordenar por:
                                <select aria-label="Ordenar NFTs" value={sort} onChange={(event) => updateSort(event.target.value)}
                                    className="max-w-36 rounded border border-[#4a3328] bg-[#140e0b] px-2 py-2 text-xs text-[#f5e7d8]">
                                    <option value="">Padrão</option>
                                    <option value="price_asc">Menor preço</option>
                                    <option value="price_desc">Maior preço</option>
                                </select>
                            </label>
                        </div>
                        <div className="relative mb-6">
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
                                        {priceLimit === null ? `${data.total} NFT(s) encontrado(s)` : `${visibleItems.length} NFT(s) nesta página até ${priceLimit} ETH`}
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

                                {visibleItems.length === 0 ? (
                                    <div className="rounded-xl border border-[#4a3328] p-12 text-center">
                                        <p className="text-[#b09270]">
                                            Nenhum NFT encontrado.
                                        </p>

                                        <Button
                                            variant="outline"
                                            className="mt-5"
                                            onClick={() => {
                                                setMaxPrice("");
                                                setActiveTab("all");
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
                                    <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                                        {visibleItems.map((nft) => (
                                            <article
                                                key={nft.id}
                                                className="group relative overflow-visible rounded-lg border border-transparent bg-[#20140f] p-2 transition hover:border-[#d8904c]"
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

                                                <div className="px-1 pb-2 pt-3">
                                                    <p className="text-xs text-[#b09270]">
                                                        {nft.collection}
                                                    </p>

                                                    <h3 className="mt-1 text-base font-bold">
                                                        {nft.name}
                                                    </h3>

                                                    <p className="mt-2 text-xs text-[#b09270]">
                                                        Criado por {nft.creator}
                                                    </p>

                                                    <div className="mt-3 flex items-end justify-between">
                                                        <div>
                                                            <p className="text-xs text-[#b09270]">
                                                                Preço
                                                            </p>

                                                            <p className="mt-1 text-base font-bold text-[#d8904c]">
                                                                {nft.priceEth} ETH
                                                            </p>
                                                        </div>

                                                        <span className="text-xs text-[#b09270]">
                                                            {nft.available} disponíveis
                                                        </span>
                                                    </div>

                                                    <Button
                                                        asChild
                                                        className="mt-4 w-full bg-[#d8904c] text-[#140e0b] hover:bg-[#e6a96f]"
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
                    </div>
                </div>
            </section>
        </main>
    );
}
