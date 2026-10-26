import { Search, ShoppingCart, LogIn } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getCart } from "../../api/cart";

export function Header() {
  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });
  return (
    <header className="w-full bg-[#140e0b]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between border-b border-[#4a3021] px-5">
        <a
          href="/"
          className="text-sm font-bold tracking-[0.15em] text-[#f1e8e0]"
        >
          KURIO
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="/"
            className="border-b-2 border-[#d8904c] py-5 text-sm font-bold text-[#d8904c]"
          >
            Início
          </a>

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

          <button
            type="button"
            className="flex items-center gap-2 rounded bg-[#d8904c] px-4 py-2 text-xs font-bold text-[#140e0b] hover:bg-[#edac6d]"
          >
            <LogIn size={15} />
            Entrar
          </button>
        </div>
      </div>
    </header>
  );
}