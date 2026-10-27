import {
    useEffect,
    useState,
} from "react";

import { getRealtimeSocket } from "./socket";

export type RealtimeConnectionStatus =
    | "connecting"
    | "connected"
    | "disconnected";

export function useRealtimeConnection() {
    const [status, setStatus] =
        useState<RealtimeConnectionStatus>(
            "connecting"
        );

    useEffect(() => {
        const socket = getRealtimeSocket();

        function handleConnect() {
            setStatus("connected");
        }

        function handleDisconnect() {
            setStatus("disconnected");
        }

        function handleConnectError() {
            setStatus("disconnected");
        }

        socket.on("connect", handleConnect);

        socket.on("disconnect", handleDisconnect);

        socket.on(
            "connect_error",
            handleConnectError
        );

        if (socket.connected) {
            setStatus("connected");
        } else {
            setStatus("connecting");
            socket.connect();
        }

        return () => {
            socket.off("connect", handleConnect);

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "connect_error",
                handleConnectError
            );

            socket.disconnect();
        };
    }, []);

    return {
        status,
        isConnected: status === "connected",
    };
}