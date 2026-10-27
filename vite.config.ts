import path from "node:path";

import { Server as HttpServer } from "node:http";

import {
  defineConfig,
  type Plugin,
  type ViteDevServer,
  type PreviewServer,
} from "vite";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { Server as SocketIOServer } from "socket.io";

function mockRealtimePlugin(): Plugin {
  let socketServer: SocketIOServer | null = null;

  function registerRealtimeBridge(
    middlewares: ViteDevServer["middlewares"]
  ) {

    middlewares.use(
      "/__mock/realtime/nft",
      (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }

        let body = "";
        let tooLarge = false;

        request.on("data", (chunk: Buffer) => {
          body += chunk.toString();

          if (body.length > 2048) {
            tooLarge = true;
          }
        });

        request.on("end", () => {
          if (tooLarge) {
            response.statusCode = 413;
            response.end();
            return;
          }

          try {
            const parsed: unknown =
              JSON.parse(body);

            if (
              typeof parsed !== "object" ||
              parsed === null ||
              !("nftId" in parsed) ||
              !("version" in parsed) ||
              typeof parsed.nftId !== "string" ||
              parsed.nftId.length === 0 ||
              parsed.nftId.length > 64 ||
              typeof parsed.version !== "number" ||
              !Number.isFinite(parsed.version)
            ) {
              response.statusCode = 400;
              response.end();
              return;
            }

            socketServer?.emit("nft.updated", {
              nftId: parsed.nftId,
              version: parsed.version,
            });

            response.statusCode = 204;
            response.end();
          } catch {
            response.statusCode = 400;
            response.end();
          }
        });
      }
    );

    middlewares.use(
      "/__mock/realtime/order",
      (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }

        let body = "";
        let tooLarge = false;

        request.on("data", (chunk: Buffer) => {
          body += chunk.toString();

          if (body.length > 2048) {
            tooLarge = true;
          }
        });

        request.on("end", () => {
          if (tooLarge) {
            response.statusCode = 413;
            response.end();
            return;
          }

          try {
            const parsed: unknown =
              JSON.parse(body);

            if (
              typeof parsed !== "object" ||
              parsed === null ||
              !("orderId" in parsed) ||
              !("version" in parsed) ||
              typeof parsed.orderId !== "string" ||
              !/^[0-9a-f-]{36}$/i.test(parsed.orderId) ||
              typeof parsed.version !== "number" ||
              !Number.isFinite(parsed.version)
            ) {
              response.statusCode = 400;
              response.end();
              return;
            }

            socketServer
              ?.to(`order:${parsed.orderId}`)
              .emit("order.updated", {
                orderId: parsed.orderId,
                version: parsed.version,
              });

            response.statusCode = 204;
            response.end();
          } catch {
            response.statusCode = 400;
            response.end();
          }
        });
      }
    );
  }

  function attachSocketServer(
    httpServer:
      | ViteDevServer["httpServer"]
      | PreviewServer["httpServer"]
  ) {
    if (!httpServer) {
      return;
    }


    if (!(httpServer instanceof HttpServer)) {
      return;
    }

    const io = new SocketIOServer(httpServer, {
      path: "/socket.io",

      transports: ["websocket"],

      serveClient: false,

    });

    io.on("connection", (socket) => {

      socket.on(
        "order.watch",
        (
          orderId: unknown,
          acknowledge?: (result: {
            ok: boolean;
          }) => void
        ) => {
          if (
            typeof orderId !== "string" ||
            !/^[0-9a-f-]{36}$/i.test(orderId)
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

      socket.on("order.unwatch", (orderId: unknown) => {
        if (
          typeof orderId !== "string" ||
          !/^[0-9a-f-]{36}$/i.test(orderId)
        ) {
          return;
        }

        socket.leave(`order:${orderId}`);
      });

      console.log(
        `[Socket.IO] Cliente conectado: ${socket.id}`
      );

      socketServer = io;

      socket.emit("realtime.ready", {
        connected: true,
        version: 1,
      });

      socket.on("disconnect", (reason) => {
        console.log(
          `[Socket.IO] Cliente desconectado: ${reason}`
        );
      });
    });


    httpServer.once("close", () => {
      void io.close();
    });

  }



  return {
    name: "kurio-mock-realtime",

    configureServer(server) {
      attachSocketServer(server.httpServer);
      registerRealtimeBridge(server.middlewares);
    },

    configurePreviewServer(server) {
      attachSocketServer(server.httpServer);
      registerRealtimeBridge(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mockRealtimePlugin(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(
        import.meta.dirname,
        "./src"
      ),
    },
  },
});