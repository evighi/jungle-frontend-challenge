import {
    test,
    expect,
} from "@playwright/test";

import { io } from "socket.io-client";

test(
    "deve transmitir nft.updated por Socket.IO real",
    async ({ request }) => {
        const nftId = "1";
        const version = Date.now();

        const socket = io(
            "http://127.0.0.1:4173",
            {
                path: "/socket.io",
                transports: ["websocket"],
                autoConnect: false,
                forceNew: true,
                reconnection: false,
                timeout: 5000,
            }
        );

        try {
            await new Promise<void>(
                (resolve, reject) => {
                    const timeout = setTimeout(
                        () => {
                            reject(
                                new Error(
                                    "Timeout na conexão Socket.IO."
                                )
                            );
                        },
                        5000
                    );

                    socket.once("connect", () => {
                        clearTimeout(timeout);
                        resolve();
                    });

                    socket.once(
                        "connect_error",
                        (error) => {
                            clearTimeout(timeout);
                            reject(error);
                        }
                    );

                    socket.connect();
                }
            );

            expect(socket.connected).toBe(true);

            const eventPromise = new Promise<{
                nftId: string;
                version: number;
            }>((resolve, reject) => {
                const timeout = setTimeout(
                    () => {
                        reject(
                            new Error(
                                "nft.updated não foi recebido."
                            )
                        );
                    },
                    5000
                );

                socket.once(
                    "nft.updated",
                    (event: {
                        nftId: string;
                        version: number;
                    }) => {
                        clearTimeout(timeout);
                        resolve(event);
                    }
                );
            });

            const response = await request.post(
                "/__mock/realtime/nft",
                {
                    data: {
                        nftId,
                        version,
                    },
                }
            );

            expect(response.status()).toBe(204);

            const event = await eventPromise;

            expect(event).toEqual({
                nftId,
                version,
            });
        } finally {
            socket.disconnect();
        }
    }
);