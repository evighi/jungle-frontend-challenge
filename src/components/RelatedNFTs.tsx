import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
    getNFTs,
    type NFT,
} from "../api/nfts";

import { Skeleton } from "./ui/skeleton";

interface RelatedNFTsProps {
    nft: NFT;
}

export function RelatedNFTs({
    nft,
}: RelatedNFTsProps) {
    const {
        data,
        isLoading,
        isError,
    } = useQuery({
        queryKey: [
            "related-nfts",
            nft.id,
            nft.category,
            nft.collection,
        ],
        queryFn: async () => {
            const firstPage = await getNFTs({
                category: nft.category,
                page: 1,
            });

            const pages = [firstPage];

            for (
                let page = 2;
                page <= firstPage.totalPages;
                page++
            ) {
                const nextPage = await getNFTs({
                    category: nft.category,
                    page,
                });

                pages.push(nextPage);
            }

            return pages
                .flatMap((result) => result.items)
                .filter(
                    (item) =>
                        item.id !== nft.id &&
                        item.collection === nft.collection
                )
                .slice(0, 5);
        },
    });

    if (!isLoading && (!data || data.length === 0)) {
        return null;
    }

    return (
        <section
            aria-labelledby="related-nfts-heading"
            className="mt-20"
        >
            <div className="mb-8 border-b border-[#4a3328] pb-4">
                <h2
                    id="related-nfts-heading"
                    className="text-xl font-bold text-[#d8904c]"
                >
                    Mais desta coleção
                </h2>
            </div>

            {isLoading && (
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
                    {Array.from({
                        length: 3,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="space-y-3"
                        >
                            <Skeleton className="aspect-square w-full bg-[#261711]" />
                            <Skeleton className="h-5 w-3/4 bg-[#261711]" />
                            <Skeleton className="h-4 w-1/2 bg-[#261711]" />
                        </div>
                    ))}
                </div>
            )}

            {isError && (
                <p
                    role="status"
                    className="text-sm text-[#b09270]"
                >
                    Não foi possível carregar outros NFTs
                    desta coleção.
                </p>
            )}

            {data && data.length > 0 && (
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
                    {data.map((related) => (
                        <Link
                            key={related.id}
                            to="/nft/$nftId"
                            params={{
                                nftId: related.id,
                            }}
                            className="group block min-w-0"
                        >
                            <div className="overflow-hidden rounded-lg bg-[#261711] p-2">
                                <img
                                    src={related.image}
                                    alt={related.name}
                                    loading="lazy"
                                    className="aspect-square w-full rounded-md object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>

                            <h3 className="mt-3 truncate text-sm font-medium text-[#f5e7d8] group-hover:text-[#d8904c]">
                                {related.name}
                            </h3>

                            <p className="mt-1 text-sm font-bold text-[#d8904c]">
                                {related.priceEth} ETH
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}