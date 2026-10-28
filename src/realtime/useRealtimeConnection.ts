import { useSyncExternalStore } from "react";

import { getRealtimeSocket } from "./socket";

export type RealtimeConnectionStatus =
    | "connecting"
    | "connected"
    | "disconnected";

function getConnectionStatus(): RealtimeConnectionStatus {
    const socket = getRealtimeSocket();

    if (socket.connected) {
        return "connected";
    }

    if (socket.active) {
        return "connecting";
    }

    return "disconnected";
}

function subscribeToConnection(
    onStoreChange: () => void
): () => void {
    const socket = getRealtimeSocket();

    socket.on("connect", onStoreChange);
    socket.on("disconnect", onStoreChange);
    socket.on("connect_error", onStoreChange);
    socket.on("reconnect_attempt", onStoreChange);

    if (!socket.connected && !socket.active) {
        socket.connect();
    }

    return () => {
        socket.off("connect", onStoreChange);
        socket.off("disconnect", onStoreChange);
        socket.off("connect_error", onStoreChange);
        socket.off("reconnect_attempt", onStoreChange);
    };
}

function getServerSnapshot(): RealtimeConnectionStatus {
    return "disconnected";
}

export function useRealtimeConnection() {
    const status = useSyncExternalStore(
        subscribeToConnection,
        getConnectionStatus,
        getServerSnapshot
    );

    return {
        status,
        isConnected: status === "connected",
    };
}