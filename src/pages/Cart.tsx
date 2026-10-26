import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { Minus, Plus, Trash2 } from "lucide-react";

import {
  getCart,
  removeCartItem,
  updateCartItem,
} from "../api/cart";

import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message ?? "Erro na operação.";
  }

  return "Ocorreu um erro inesperado.";
}

// Converte ETH decimal para unidades inteiras,
// evitando erros de precisão com números decimais.
function ethToWei(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) {
    throw new Error("Valor de ETH inválido.");
  }

  const [integer, decimal = ""] = value.split(".");

  return (
    BigInt(integer) * 10n ** 18n +
    BigInt(decimal.padEnd(18, "0"))
  );
}

function formatWei(value: bigint): string {
  const integer = value / 10n ** 18n;
  const decimal = (value % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");

  return decimal
    ? `${integer}.${decimal}`
    : integer.toString();
}

export function Cart() {
  const queryClient = useQueryClient();

  const {
    data: cart,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      nftId,
      quantity,
    }: {
      nftId: string;
      quantity: number;
    }) => updateCartItem(nftId, quantity),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["cart"],
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeCartItem,

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["cart"],
      });
    },
  });

  const isUpdating =
    updateMutation.isPending || removeMutation.isPending;

  const mutationError =
    updateMutation.error ?? removeMutation.error;

  const subtotal = cart?.items.reduce(
    (total, item) =>
      total +
      ethToWei(item.nft.priceEth) *
        BigInt(item.quantity),
    0n
  ) ?? 0n;

  return (
    <main className="min-h-screen bg-[#140e0b] px-6 py-12 text-[#f5e7d8]">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-10 text-3xl font-bold">
          Carrinho de NFTs
        </h1>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full bg-[#38241b]" />
            <Skeleton className="h-40 w-full bg-[#38241b]" />
          </div>
        )}

        {isError && (
          <div role="alert" className="rounded-xl bg-[#261711] p-8">
            <p>Não foi possível carregar seu carrinho.</p>

            <Button
              className="mt-4"
              onClick={() => void refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !isError && cart?.items.length === 0 && (
          <div className="rounded-xl border border-[#4a3328] bg-[#261711] p-12 text-center">
            <h2 className="text-xl font-bold">
              Seu carrinho está vazio
            </h2>

            <p className="mt-3 text-[#b09270]">
              Explore o catálogo e escolha seus NFTs favoritos.
            </p>

            <Link
              to="/"
              search={{
                search: "",
                category: "",
                sort: "",
                page: 1,
              }}
              className="mt-6 inline-block rounded bg-[#d8904c] px-6 py-3 text-[#140e0b]"
            >
              Explorar NFTs
            </Link>
          </div>
        )}

        {cart && cart.items.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <section className="space-y-5">
              {cart.items.map(({ nft, quantity }) => (
                <article
                  key={nft.id}
                  className="flex flex-col gap-5 rounded-xl border border-[#4a3328] bg-[#261711] p-5 sm:flex-row"
                >
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="h-40 w-full rounded-lg object-cover sm:w-40"
                  />

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h2 className="text-xl font-bold">
                        {nft.name}
                      </h2>

                      <p className="mt-2 text-sm text-[#b09270]">
                        {nft.collection}
                      </p>

                      <p className="mt-3 font-bold text-[#d8904c]">
                        {nft.priceEth} ETH
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Diminuir quantidade de ${nft.name}`}
                          disabled={isUpdating || quantity <= 1}
                          onClick={() =>
                            updateMutation.mutate({
                              nftId: nft.id,
                              quantity: quantity - 1,
                            })
                          }
                        >
                          <Minus size={16} />
                        </Button>

                        <span className="min-w-6 text-center">
                          {quantity}
                        </span>

                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Aumentar quantidade de ${nft.name}`}
                          disabled={
                            isUpdating ||
                            quantity >= nft.available
                          }
                          onClick={() =>
                            updateMutation.mutate({
                              nftId: nft.id,
                              quantity: quantity + 1,
                            })
                          }
                        >
                          <Plus size={16} />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        disabled={isUpdating}
                        onClick={() =>
                          removeMutation.mutate(nft.id)
                        }
                        aria-label={`Remover ${nft.name}`}
                        className="text-red-300"
                      >
                        <Trash2 size={17} />
                        Remover
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-xl border border-[#4a3328] bg-[#261711] p-6">
              <h2 className="text-xl font-bold">
                Resumo do pedido
              </h2>

              <div className="mt-8 flex justify-between text-sm text-[#b09270]">
                <span>Itens</span>
                <span>{cart.totalItems}</span>
              </div>

              <div className="mt-5 flex justify-between gap-4 border-t border-[#4a3328] pt-5">
                <span>Subtotal estimado</span>

                <strong className="text-[#d8904c]">
                  {formatWei(subtotal)} ETH
                </strong>
              </div>

              <p className="mt-5 text-xs leading-5 text-[#b09270]">
                Descontos, taxas de rede e total final serão
                validados pela API de cotação no checkout.
              </p>

              <Button
                disabled
                className="mt-8 w-full bg-[#d8904c] text-[#140e0b]"
              >
                Continuar para pagamento
              </Button>
            </aside>
          </div>
        )}

        {mutationError && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-500/40 p-4 text-red-300"
          >
            {getErrorMessage(mutationError)}
          </p>
        )}
      </div>
    </main>
  );
}