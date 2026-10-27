import {
    useEffect,
    useRef,
} from "react";

import { useQueryClient } from "@tanstack/react-query";

import { getRealtimeSocket } from "./socket";

interface NftUpdatedEvent {
    nftId: string;
    version: number;
}

export function useNftRealtimeUpdates() {
    const queryClient = useQueryClient();

    const versionsRef = useRef(
        new Map<string, number>()
    );

    useEffect(() => {
        const socket = getRealtimeSocket();

        function synchronizeCatalog() {
            void queryClient.invalidateQueries({
                queryKey: ["nfts"],
            });

            void queryClient.invalidateQueries({
                queryKey: ["nft"],
            });
        }

        function handleNftUpdated(
            event: NftUpdatedEvent
        ) {
            if (
                !event ||
                typeof event.nftId !== "string" ||
                !event.nftId ||
                !Number.isFinite(event.version)
            ) {
                return;
            }

            const previousVersion =
                versionsRef.current.get(
                    event.nftId
                ) ?? 0;

            // Ignora eventos antigos ou duplicados.
            if (event.version <= previousVersion) {
                return;
            }

            versionsRef.current.set(
                event.nftId,
                event.version
            );

            // Atualiza as listas do catálogo.
            void queryClient.invalidateQueries({
                queryKey: ["nfts"],
            });

            // Atualiza os detalhes do NFT alterado.
            void queryClient.invalidateQueries({
                queryKey: [
                    "nft",
                    event.nftId,
                ],
            });
        }

        socket.on(
            "nft.updated",
            handleNftUpdated
        );

        // Após reconectar, recupera o estado atual.
        socket.on(
            "connect",
            synchronizeCatalog
        );

        if (!socket.connected) {
            socket.connect();
        } else {
            synchronizeCatalog();
        }

        return () => {
            socket.off(
                "nft.updated",
                handleNftUpdated
            );

            socket.off(
                "connect",
                synchronizeCatalog
            );

            socket.disconnect();
        };
    }, [queryClient]);
}