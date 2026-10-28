import { http, HttpResponse } from "msw";
import { nftDatabase } from "./data/nfts";
import { cartHandlers } from "./cart";
import { authHandlers } from "./auth";
import { quoteHandlers } from "./quote";
import { orderHandlers } from "./orders";
import { walletHandlers } from "./wallets";
import { getNftWithStock } from "./stock";
import { favoriteHandlers } from "./favorites";

export const handlers = [
    http.get("/api/nfts", ({ request }) => {
        const url = new URL(request.url);

        const search = (url.searchParams.get("search") ?? "")
            .trim()
            .toLowerCase();

        const category = url.searchParams.get("category") ?? "";
        const sort = url.searchParams.get("sort") ?? "";

        const requestedPage = Number(url.searchParams.get("page") ?? "1");
        const page =
            Number.isInteger(requestedPage) && requestedPage > 0
                ? requestedPage
                : 1;

        const limit = 3;

        let results = nftDatabase.filter((nft) => {
            const matchesSearch =
                nft.name.toLowerCase().includes(search) ||
                nft.collection.toLowerCase().includes(search);

            const matchesCategory =
                !category || nft.category === category;

            return matchesSearch && matchesCategory;
        });

        if (sort === "price_asc") {
            results = [...results].sort(
                (a, b) => Number(a.priceEth) - Number(b.priceEth)
            );
        }

        if (sort === "price_desc") {
            results = [...results].sort(
                (a, b) => Number(b.priceEth) - Number(a.priceEth)
            );
        }

        const total = results.length;
        const totalPages = Math.ceil(total / limit);

        const start = (page - 1) * limit;
        const items = results
            .slice(start, start + limit)
            .map(getNftWithStock);

        return HttpResponse.json({
            items,
            total,
            page,
            totalPages,
        });
    }),

    http.get("/api/nfts/:id", ({ params }) => {
        const nft = nftDatabase.find(
            (item) => item.id === params.id
        );

        if (!nft) {
            return HttpResponse.json(
                { message: "NFT não encontrado." },
                { status: 404 }
            );
        }

        return HttpResponse.json(
            getNftWithStock(nft)
        );
    }),

    ...cartHandlers,
    ...authHandlers,
    ...quoteHandlers,
    ...orderHandlers,
    ...walletHandlers,
    ...favoriteHandlers,
];