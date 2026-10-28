import express from "express";

import { createServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import path from "node:path";

import { fileURLToPath } from "node:url";

const app = express();

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
    path: "/socket.io",

    transports: ["websocket"],

    serveClient: false,
});

const currentDirectory = path.dirname(
    fileURLToPath(import.meta.url)
);

const distDirectory = path.join(
    currentDirectory,
    "dist"
);

const port = Number(process.env.PORT ?? 3000);

app.disable("x-powered-by");

app.use(express.json({
    limit: "2kb",
}));

// ======================================================
// SOCKET.IO
// ======================================================

const orderIdPattern = /^[0-9a-f-]{36}$/i;

io.on("connection", (socket) => {
    console.log(
        `[Socket.IO] Cliente conectado: ${socket.id}`
    );

    socket.emit("realtime.ready", {
        connected: true,
        version: 1,
    });

    socket.on(
        "order.watch",
        (orderId, acknowledge) => {
            if (
                typeof orderId !== "string" ||
                !orderIdPattern.test(orderId)
            ) {
                acknowledge?.({
                    ok: false,
                });

                return;
            }

            socket.join(`order:${orderId}`);

            acknowledge?.({
                ok: true,
            });
        }
    );

    socket.on("order.unwatch", (orderId) => {
        if (
            typeof orderId !== "string" ||
            !orderIdPattern.test(orderId)
        ) {
            return;
        }

        socket.leave(`order:${orderId}`);
    });

    socket.on("disconnect", (reason) => {
        console.log(
            `[Socket.IO] Cliente desconectado: ${reason}`
        );
    });
});

// ======================================================
// PONTE MSW -> SOCKET.IO — PEDIDOS
// ======================================================

app.post("/__mock/realtime/order", (request, response) => {
    const { orderId, version } = request.body ?? {};

    if (
        typeof orderId !== "string" ||
        !orderIdPattern.test(orderId) ||
        typeof version !== "number" ||
        !Number.isFinite(version)
    ) {
        return response.status(400).json({
            message: "Evento de pedido inválido.",
        });
    }

    io.to(`order:${orderId}`).emit(
        "order.updated",
        {
            orderId,
            version,
        }
    );

    return response.sendStatus(204);
});

// ======================================================
// PONTE MSW -> SOCKET.IO — NFTS
// ======================================================

app.post("/__mock/realtime/nft", (request, response) => {
    const { nftId, version } = request.body ?? {};

    if (
        typeof nftId !== "string" ||
        nftId.length === 0 ||
        nftId.length > 64 ||
        typeof version !== "number" ||
        !Number.isFinite(version)
    ) {
        return response.status(400).json({
            message: "Evento de NFT inválido.",
        });
    }

    io.emit("nft.updated", {
        nftId,
        version,
    });

    return response.sendStatus(204);
});

// ======================================================
// FRONTEND
// ======================================================

app.use(
    express.static(distDirectory, {
        index: false,
    })
);

// Suporte a acesso direto e refresh de rotas SPA.
app.use((request, response) => {
    if (
        request.method !== "GET" ||
        path.extname(request.path) !== "" ||
        !request.accepts("html")
    ) {
        return response.sendStatus(404);
    }

    return response.sendFile(
        path.join(distDirectory, "index.html")
    );
});

// ======================================================
// INICIALIZAÇÃO
// ======================================================

if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
) {
    throw new Error("PORT inválida.");
}

httpServer.listen(port, "0.0.0.0", () => {
    console.log(
        `[KURIO] Servidor iniciado na porta ${port}`
    );

    console.log(
        `[KURIO] Socket.IO disponível em /socket.io`
    );
});