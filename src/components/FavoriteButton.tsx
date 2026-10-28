import { useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import {
    addFavorite,
    getFavorites,
    removeFavorite,
    type FavoritesResponse,
} from "../api/favorites";

import {
    getAuthToken,
    getSession,
} from "../api/auth";

import { Button } from "./ui/button";

interface FavoriteButtonProps {
    nftId: string;
    nftName: string;
}

export function FavoriteButton({
    nftId,
    nftName,
}: FavoriteButtonProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [errorMessage, setErrorMessage] = useState("");

    const hasToken = Boolean(getAuthToken());

    const { data: user } = useQuery({
        queryKey: ["session"],
        queryFn: getSession,
        enabled: hasToken,
        retry: false,
    });

    const favoritesQueryKey = [
        "favorites",
        user?.id,
    ] as const;

    const { data: favorites } = useQuery({
        queryKey: favoritesQueryKey,
        queryFn: getFavorites,
        enabled: Boolean(user?.id),
        retry: false,
    });

    const isFavorite =
        favorites?.nftIds.includes(nftId) ?? false;

    const mutation = useMutation({
        mutationFn: async (previouslyFavorite: boolean) => {
            if (previouslyFavorite) {
                return removeFavorite(nftId);
            }

            return addFavorite(nftId);
        },

        onMutate: async (previouslyFavorite) => {
            setErrorMessage("");

            await queryClient.cancelQueries({
                queryKey: favoritesQueryKey,
            });

            const previousFavorites =
                queryClient.getQueryData<FavoritesResponse>(
                    favoritesQueryKey
                );

            queryClient.setQueryData<FavoritesResponse>(
                favoritesQueryKey,
                (current) => {
                    const nftIds = current?.nftIds ?? [];

                    if (previouslyFavorite) {
                        return {
                            nftIds: nftIds.filter(
                                (id) => id !== nftId
                            ),
                        };
                    }

                    return {
                        nftIds: [
                            ...new Set([...nftIds, nftId]),
                        ],
                    };
                }
            );

            return { previousFavorites };
        },

        onSuccess: (updatedFavorites) => {
            queryClient.setQueryData(
                favoritesQueryKey,
                updatedFavorites
            );
        },

        onError: (_error, _variables, context) => {
            if (context?.previousFavorites) {
                queryClient.setQueryData(
                    favoritesQueryKey,
                    context.previousFavorites
                );
            } else {
                queryClient.removeQueries({
                    queryKey: favoritesQueryKey,
                    exact: true,
                });
            }

            setErrorMessage(
                "Não foi possível atualizar os favoritos."
            );
        },

        onSettled: () => {
            void queryClient.invalidateQueries({
                queryKey: favoritesQueryKey,
            });
        },
    });

    async function handleToggle() {
        setErrorMessage("");

        if (!user) {
            await navigate({
                to: "/login",
            });

            return;
        }

        if (mutation.isPending) {
            return;
        }

        mutation.mutate(isFavorite);
    }

    return (
        <div className="relative inline-flex flex-col items-center">
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void handleToggle()}
                disabled={mutation.isPending}
                aria-label={
                    isFavorite
                        ? `Remover ${nftName} dos favoritos`
                        : `Adicionar ${nftName} aos favoritos`
                }
                aria-pressed={isFavorite}
                title={
                    isFavorite
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                }
                className="h-10 w-10 rounded-full border-[#4a3328] bg-[#261711] text-[#d8904c] hover:bg-[#38241b]"
            >
                <Heart
                    size={19}
                    fill={isFavorite ? "currentColor" : "none"}
                />
            </Button>

            {errorMessage && (
                <span
                    role="alert"
                    className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-red-500/40 bg-[#261711] p-3 text-xs text-red-300 shadow-lg"
                >
                    {errorMessage}
                </span>
            )}
        </div>
    );
}