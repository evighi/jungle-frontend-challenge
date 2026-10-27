import { Search, ShoppingCart, LogIn, LogOut, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { getCart } from "../../api/cart";
import {
  clearAuthToken,
  getAuthToken,
  getSession,
  logout,
} from "../../api/auth";

export function Header() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const hasToken = Boolean(getAuthToken());

  const {
    data: user,
    isError: sessionError,
  } = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!sessionError) return;

    async function handleInvalidSession() {
      // Remove o token inválido.
      clearAuthToken();

      // Descarta os dados da sessão anterior.
      queryClient.setQueryData(["session"], null);

      // Evita exibir os itens privados anteriormente carregados.
      await queryClient.cancelQueries({
        queryKey: ["cart"],
      });

      queryClient.setQueryData(["cart"], {
        items: [],
        totalItems: 0,
      });

      // Busca o carrinho de visitante.
      await queryClient.invalidateQueries({
        queryKey: ["cart"],
      });
    }

    void handleInvalidSession();
  }, [sessionError, queryClient]);

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,

    onSettled: async () => {
      queryClient.setQueryData(["session"], null);

      await queryClient.invalidateQueries({
        queryKey: ["cart"],
      });

      await navigate({
        to: "/",
        search: {
          search: "",
          category: "",
          sort: "",
          page: 1,
        },
      });
    },
  });

  return (
    <header className="w-full bg-[#140e0b] text-[#f1e8e0]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between border-b border-[#4a3021] px-5">

        <Link
          to="/"
          search={{
            search: "",
            category: "",
            sort: "",
            page: 1,
          }}
          className="text-sm font-bold tracking-[0.15em]"
        >
          KURIO
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            search={{
              search: "",
              category: "",
              sort: "",
              page: 1,
            }}
            className="text-sm font-bold text-[#d8904c]"
          >
            Início
          </Link>

          <a href="/mercado" className="text-sm hover:text-[#d8904c]">
            Mercado
          </a>

          <a href="/criadores" className="text-sm hover:text-[#d8904c]">
            Criadores
          </a>

          <a href="/aprenda" className="text-sm hover:text-[#d8904c]">
            Aprenda
          </a>
        </nav>

        <div className="flex items-center gap-5">

          <button
            type="button"
            aria-label="Pesquisar"
            className="hover:text-[#d8904c]"
          >
            <Search size={19} />
          </button>

          <Link
            to="/carrinho"
            aria-label={`Abrir carrinho com ${cart?.totalItems ?? 0} itens`}
            className="relative hover:text-[#d8904c]"
          >
            <ShoppingCart size={20} />

            <span className="absolute -right-2 -top-2 rounded-full bg-[#d8904c] px-1 text-[10px] text-[#140e0b]">
              {cart?.totalItems ?? 0}
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-[#f1e8e0]">
                <UserRound size={17} />

                <span className="hidden sm:inline">
                  {user.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-label="Sair da conta"
                className="flex items-center gap-2 rounded border border-[#4a3021] px-3 py-2 text-xs hover:border-[#d8904c] hover:text-[#d8904c] disabled:opacity-50"
              >
                <LogOut size={15} />

                <span className="hidden sm:inline">
                  {logoutMutation.isPending ? "Saindo..." : "Sair"}
                </span>
              </button>
            </div>
          ) : hasToken ? (
            <span className="text-xs text-[#b09270]">
              Carregando...
            </span>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded bg-[#d8904c] px-4 py-2 text-xs font-bold text-[#140e0b] hover:bg-[#edac6d]"
            >
              <LogIn size={15} />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}