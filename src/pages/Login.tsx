import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";

import { login } from "../api/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import { mergeGuestCart } from "../api/cart";

export function Login() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [transferError, setTransferError] = useState("");

    const loginMutation = useMutation({
        mutationFn: () => login(email, password),

        onSuccess: async ({ user }) => {
            // Atualiza imediatamente a sessão.
            queryClient.setQueryData(["session"], user);

            setTransferError("");

            try {
                // Transfere o carrinho do visitante para o usuário.
                const mergedCart = await mergeGuestCart();

                // Atualiza o cache com o resultado da API.
                queryClient.setQueryData(["cart"], mergedCart);

                // Navega para o catálogo.
                await navigate({
                    to: "/",
                    search: {
                        search: "",
                        category: "",
                        sort: "",
                        page: 1,
                    },
                });
            } catch (error) {
                // O login foi concluído, mesmo se a transferência falhou.
                await queryClient.invalidateQueries({
                    queryKey: ["cart"],
                });

                const message = isAxiosError(error)
                    ? error.response?.data?.message
                    : null;

                setTransferError(
                    message ??
                    "Você entrou na sua conta, mas não foi possível transferir o carrinho. Seus itens de visitante foram preservados."
                );
            }
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        loginMutation.mutate();
    }

    const errorMessage =
        transferError ||
        (isAxiosError(loginMutation.error)
            ? loginMutation.error.response?.data?.message
            : loginMutation.isError
                ? "Não foi possível entrar. Tente novamente."
                : null);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#140e0b] px-5 py-12 text-[#f5e7d8]">
            <section className="w-full max-w-md rounded-xl border border-[#4a3328] bg-[#261711] p-8">
                <p className="text-sm text-[#d8904c]">
                    Bem-vindo de volta
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Entrar na Kurio
                </h1>

                <p className="mt-3 text-sm text-[#b09270]">
                    Acesse sua conta para continuar sua coleção.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="login-email">E-mail</Label>

                        <Input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="seu@email.com"
                            className="border-[#4a3328] bg-[#140e0b]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>

                        <Input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Digite sua senha"
                            className="border-[#4a3328] bg-[#140e0b]"
                        />
                    </div>

                    {errorMessage && (
                        <p
                            role="alert"
                            className="rounded-lg border border-red-500/40 p-3 text-sm text-red-300"
                        >
                            {errorMessage}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full bg-[#d8904c] py-5 text-[#140e0b] hover:bg-[#e6a96f]"
                    >
                        {loginMutation.isPending
                            ? "Entrando..."
                            : "Entrar"}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-[#b09270]">
                    Ainda não possui uma conta?{" "}
                    <Link
                        to="/cadastro"
                        className="font-semibold text-[#d8904c] hover:underline"
                    >
                        Cadastre-se
                    </Link>
                </p>
            </section>
        </main>
    );
}