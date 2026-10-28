import { http, HttpResponse } from "msw";

import { nftDatabase } from "./data/nfts";

import {
    resolveRequestIdentity,
} from "./auth";

interface FavoritesStorage {
    [userId: string]: string[];
}

const FAVORITES_KEY = "kurio:favorites:v1";

function getStoredFavorites(): FavoritesStorage {
    try {
        const value = localStorage.getItem(FAVORITES_KEY);

        if (!value) {
            return {};
        }

        const parsed: unknown = JSON.parse(value);

        if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
        ) {
            return {};
        }

        const result: FavoritesStorage = {};

        for (const [userId, nftIds] of Object.entries(parsed)) {
            if (!Array.isArray(nftIds)) {
                continue;
            }

            result[userId] = [
                ...new Set(
                    nftIds.filter(
                        (id): id is string =>
                            typeof id === "string"
                    )
                ),
            ];
        }

        return result;
    } catch {
        return {};
    }
}

function saveFavorites(storage: FavoritesStorage): void {
    localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(storage)
    );
}

function getUserFavorites(userId: string): string[] {
    const storage = getStoredFavorites();

    return storage[userId] ?? [];
}

function unauthorizedResponse() {
    return HttpResponse.json(
        {
            message: "Sessão inválida ou expirada.",
        },
        { status: 401 }
    );
}

function nftNotFoundResponse() {
    return HttpResponse.json(
        {
            message: "NFT não encontrado.",
        },
        { status: 404 }
    );
}

function shouldSimulateFailure(request: Request): boolean {
    return (
        request.headers.get("x-mock-scenario") ===
        "favorites-fail"
    );
}

function simulatedFailureResponse() {
    return HttpResponse.json(
        {
            message:
                "Falha temporária ao atualizar os favoritos.",
        },
        { status: 503 }
    );
}

function nftExists(nftId: string): boolean {
    return nftDatabase.some(
        (nft) => nft.id === nftId
    );
}

export const favoriteHandlers = [
    // =====================================================
    // LISTAR FAVORITOS
    // =====================================================

    http.get("/api/favorites", ({ request }) => {
        const identity = resolveRequestIdentity(request);

        if (identity.type !== "authenticated") {
            return unauthorizedResponse();
        }

        return HttpResponse.json({
            nftIds: getUserFavorites(identity.userId),
        });
    }),

    // =====================================================
    // ADICIONAR FAVORITO
    // =====================================================

    http.post(
        "/api/favorites/:nftId",
        ({ request, params }) => {
            const identity = resolveRequestIdentity(request);

            if (identity.type !== "authenticated") {
                return unauthorizedResponse();
            }

            const nftId = params.nftId;

            if (
                typeof nftId !== "string" ||
                !nftExists(nftId)
            ) {
                return nftNotFoundResponse();
            }

            if (shouldSimulateFailure(request)) {
                return simulatedFailureResponse();
            }

            const storage = getStoredFavorites();

            const currentFavorites =
                getUserFavorites(identity.userId);

            // Set impede duplicatas.
            const updatedFavorites = [
                ...new Set([
                    ...currentFavorites,
                    nftId,
                ]),
            ];

            storage[identity.userId] = updatedFavorites;

            saveFavorites(storage);

            return HttpResponse.json(
                {
                    nftIds: updatedFavorites,
                },
                { status: 200 }
            );
        }
    ),

    // =====================================================
    // REMOVER FAVORITO
    // =====================================================

    http.delete(
        "/api/favorites/:nftId",
        ({ request, params }) => {
            const identity = resolveRequestIdentity(request);

            if (identity.type !== "authenticated") {
                return unauthorizedResponse();
            }

            const nftId = params.nftId;

            if (
                typeof nftId !== "string" ||
                !nftExists(nftId)
            ) {
                return nftNotFoundResponse();
            }

            if (shouldSimulateFailure(request)) {
                return simulatedFailureResponse();
            }

            const storage = getStoredFavorites();

            const currentFavorites =
                getUserFavorites(identity.userId);

            const updatedFavorites =
                currentFavorites.filter(
                    (id) => id !== nftId
                );

            storage[identity.userId] = updatedFavorites;

            saveFavorites(storage);

            return HttpResponse.json({
                nftIds: updatedFavorites,
            });
        }
    ),
];