import {
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
} from "@tanstack/react-router";

import { Header } from "./components/layout/Header";
import { Home } from "./pages/Home";
import { NFTDetails } from "./pages/NFTDetails";

import { Cart } from "./pages/Cart";

const rootRoute = createRootRoute({
    component: () => (
        <>
            <Header />
            <Outlet />
        </>
    ),
    notFoundComponent: () => (
        <main className="min-h-screen bg-[#140e0b] p-12 text-center text-[#f5e7d8]">
            <h1 className="text-3xl font-bold">
                Página não encontrada
            </h1>
            <a href="/" className="mt-6 inline-block text-[#d8904c]">
                Voltar ao início
            </a>
        </main>
    ),
});

const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: Home,

    validateSearch: (search: Record<string, unknown>) => {
        const validCategories = ["Arte", "Digital", "Música"];
        const validSorts = ["price_asc", "price_desc"];

        const requestedPage = Number(search.page ?? 1);

        return {
            search:
                typeof search.search === "string"
                    ? search.search
                    : "",

            category:
                typeof search.category === "string" &&
                    validCategories.includes(search.category)
                    ? search.category
                    : "",

            sort:
                typeof search.sort === "string" &&
                    validSorts.includes(search.sort)
                    ? search.sort
                    : "",

            page:
                Number.isInteger(requestedPage) &&
                    requestedPage > 0
                    ? requestedPage
                    : 1,
        };
    },
});

const nftRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/nft/$nftId",
    component: NFTDetails,
});

const cartRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/carrinho",
    component: Cart,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  nftRoute,
  cartRoute,
]);

export const router = createRouter({
    routeTree,
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}