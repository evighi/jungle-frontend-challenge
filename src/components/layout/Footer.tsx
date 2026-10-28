import { Link } from "@tanstack/react-router";
import {
    ShieldCheck,
    Palette,
    Bell,
    Wallet,
} from "lucide-react";

const homeSearch = {
    search: "",
    category: "",
    sort: "",
    page: 1,
};

const benefits = [
    {
        icon: ShieldCheck,
        title: "Segurança da carteira",
        description:
            "Gerencie sua carteira e explore colecionáveis digitais com confiança.",
    },
    {
        icon: Palette,
        title: "Criadores em destaque",
        description:
            "Conheça artistas, coleções e projetos da cultura digital.",
    },
    {
        icon: Bell,
        title: "Novidades do mercado",
        description:
            "Explore novos NFTs e acompanhe as coleções disponíveis.",
    },
];

export function Footer() {
    return (
        <footer className="bg-[#140e0b] px-6 pb-8 pt-16 text-[#f5e7d8]">
            <div className="mx-auto max-w-7xl">
                {/* BENEFÍCIOS */}
                <div className="grid gap-8 bg-[#261711] px-8 py-10 md:grid-cols-3">
                    {benefits.map((benefit) => {
                        const Icon = benefit.icon;

                        return (
                            <div
                                key={benefit.title}
                                className="flex flex-col items-start"
                            >
                                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#d8904c] text-[#140e0b]">
                                    <Icon
                                        size={26}
                                        strokeWidth={1.8}
                                    />
                                </div>

                                <h2 className="mb-3 text-lg font-bold">
                                    {benefit.title}
                                </h2>

                                <p className="max-w-xs text-sm leading-6 text-[#b09270]">
                                    {benefit.description}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* IDENTIDADE */}
                <div className="grid gap-6 bg-[#3a2213] px-8 py-8 md:grid-cols-3 md:items-center">
                    <Link
                        to="/"
                        search={homeSearch}
                        className="text-lg font-bold tracking-[0.2em] text-[#f5e7d8]"
                    >
                        KURIO
                    </Link>

                    <p className="text-sm leading-6">
                        Feito para colecionadores,
                        criadores e cultura digital.
                    </p>

                    <p className="text-sm text-[#c9b49f] md:text-right">
                        Marketplace de colecionáveis digitais
                    </p>
                </div>

                {/* NAVEGAÇÃO */}
                <div className="grid gap-10 bg-[#261711] px-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <h2 className="mb-5 text-lg font-bold">
                            Área do colecionador
                        </h2>

                        <nav
                            aria-label="Links de perfil"
                            className="flex flex-col items-start gap-3 text-sm"
                        >
                            <Link
                                to="/perfil"
                                className="hover:text-[#d8904c]"
                            >
                                Meu perfil
                            </Link>

                            <Link
                                to="/carteiras"
                                className="hover:text-[#d8904c]"
                            >
                                Minhas carteiras
                            </Link>

                            <Link
                                to="/carrinho"
                                className="hover:text-[#d8904c]"
                            >
                                Meu carrinho
                            </Link>
                        </nav>
                    </div>

                    <div>
                        <h2 className="mb-5 text-lg font-bold">
                            Mercado
                        </h2>

                        <nav
                            aria-label="Links do mercado"
                            className="flex flex-col items-start gap-3 text-sm"
                        >
                            <Link
                                to="/"
                                search={homeSearch}
                                className="hover:text-[#d8904c]"
                            >
                                Explorar NFTs
                            </Link>

                            <Link
                                to="/"
                                search={{
                                    ...homeSearch,
                                    category: "Arte",
                                }}
                                className="hover:text-[#d8904c]"
                            >
                                Arte digital
                            </Link>

                            <Link
                                to="/"
                                search={{
                                    ...homeSearch,
                                    category: "Música",
                                }}
                                className="hover:text-[#d8904c]"
                            >
                                Música
                            </Link>
                        </nav>
                    </div>

                    <div>
                        <h2 className="mb-5 text-lg font-bold">
                            Sua conta
                        </h2>

                        <nav
                            aria-label="Links da conta"
                            className="flex flex-col items-start gap-3 text-sm"
                        >
                            <Link
                                to="/login"
                                className="hover:text-[#d8904c]"
                            >
                                Acessar minha conta
                            </Link>

                            <Link
                                to="/cadastro"
                                className="hover:text-[#d8904c]"
                            >
                                Criar conta
                            </Link>

                            <Link
                                to="/carteiras"
                                className="inline-flex items-center gap-2 hover:text-[#d8904c]"
                            >
                                <Wallet size={16} />
                                Carteiras compatíveis
                            </Link>
                        </nav>
                    </div>

                    <div>
                        <h2 className="mb-5 text-lg font-bold">
                            Sobre a Kurio
                        </h2>

                        <p className="text-sm leading-7 text-[#b09270]">
                            Um espaço para descobrir,
                            explorar e colecionar NFTs.
                        </p>

                        <p className="mt-4 text-xs leading-6 text-[#b09270]">
                            Projeto demonstrativo com
                            pagamentos blockchain simulados.
                        </p>
                    </div>
                </div>

                <div className="py-5 text-center text-xs text-[#b09270]">
                    © 2026 Kurio. Propriedade digital para todos.
                </div>
            </div>
        </footer>
    );
}