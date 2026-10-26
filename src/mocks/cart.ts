import { http, HttpResponse } from "msw";
import { nftDatabase } from "./data/nfts";

interface StoredCartItem {
  nftId: string;
  quantity: number;
}

const STORAGE_KEY = "kurio:guest-cart:v1";

function readCart(): StoredCartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is StoredCartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.nftId === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
}

function saveCart(items: StoredCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function cartResponse(items: StoredCartItem[]) {
  const populatedItems = items.flatMap((item) => {
    const nft = nftDatabase.find(
      (candidate) => candidate.id === item.nftId
    );

    if (!nft) return [];

    return [
      {
        nft,
        quantity: item.quantity,
      },
    ];
  });

  return {
    items: populatedItems,
    totalItems: populatedItems.reduce(
      (total, item) => total + item.quantity,
      0
    ),
  };
}

export const cartHandlers = [
  http.get("/api/cart", () => {
    return HttpResponse.json(cartResponse(readCart()));
  }),

  http.post("/api/cart/items", async ({ request }) => {
    const body = (await request.json()) as {
      nftId?: unknown;
      quantity?: unknown;
    };

    if (
      typeof body.nftId !== "string" ||
      !Number.isInteger(body.quantity) ||
      typeof body.quantity !== "number" ||
      body.quantity <= 0
    ) {
      return HttpResponse.json(
        { message: "Dados inválidos." },
        { status: 400 }
      );
    }

    const nft = nftDatabase.find(
      (item) => item.id === body.nftId
    );

    if (!nft) {
      return HttpResponse.json(
        { message: "NFT não encontrado." },
        { status: 404 }
      );
    }

    const cart = readCart();

    const existing = cart.find(
      (item) => item.nftId === body.nftId
    );

    const newQuantity =
      (existing?.quantity ?? 0) + body.quantity;

    if (newQuantity > nft.available) {
      return HttpResponse.json(
        { message: "Quantidade indisponível." },
        { status: 409 }
      );
    }

    if (existing) {
      existing.quantity = newQuantity;
    } else {
      cart.push({
        nftId: nft.id,
        quantity: body.quantity,
      });
    }

    saveCart(cart);

    return HttpResponse.json(cartResponse(cart));
  }),

  http.patch("/api/cart/items/:nftId", async ({ params, request }) => {
    const body = (await request.json()) as {
      quantity?: unknown;
    };

    if (
      typeof body.quantity !== "number" ||
      !Number.isInteger(body.quantity) ||
      body.quantity <= 0
    ) {
      return HttpResponse.json(
        { message: "Quantidade inválida." },
        { status: 400 }
      );
    }

    const nft = nftDatabase.find(
      (item) => item.id === params.nftId
    );

    const cart = readCart();

    const existing = cart.find(
      (item) => item.nftId === params.nftId
    );

    if (!nft || !existing) {
      return HttpResponse.json(
        { message: "Item não encontrado." },
        { status: 404 }
      );
    }

    if (body.quantity > nft.available) {
      return HttpResponse.json(
        { message: "Estoque insuficiente." },
        { status: 409 }
      );
    }

    existing.quantity = body.quantity;

    saveCart(cart);

    return HttpResponse.json(cartResponse(cart));
  }),

  http.delete("/api/cart/items/:nftId", ({ params }) => {
    const cart = readCart();

    const existing = cart.find(
      (item) => item.nftId === params.nftId
    );

    if (!existing) {
      return HttpResponse.json(
        { message: "Item não encontrado." },
        { status: 404 }
      );
    }

    const updated = cart.filter(
      (item) => item.nftId !== params.nftId
    );

    saveCart(updated);

    return HttpResponse.json(cartResponse(updated));
  }),
];