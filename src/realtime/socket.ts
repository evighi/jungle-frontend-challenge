import {
    io,
    type Socket,
} from "socket.io-client";

let socketInstance: Socket | null = null;

export function getRealtimeSocket(): Socket {
    if (!socketInstance) {
        socketInstance = io(window.location.origin, {
            path: "/socket.io",

            transports: ["websocket"],

            autoConnect: false,

            reconnection: true,

            reconnectionAttempts: Infinity,

            reconnectionDelay: 1000,

            reconnectionDelayMax: 5000,

            timeout: 10000,
        });
    }

    return socketInstance;
}

export function disconnectRealtimeSocket(): void {
    if (!socketInstance) {
        return;
    }

    socketInstance.disconnect();
}