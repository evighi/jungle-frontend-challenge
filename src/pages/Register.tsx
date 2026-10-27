import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";

import { register } from "../api/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import { mergeGuestCart } from "../api/cart";

export function Register() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [validationError, setValidationError] = useState("");

    const [transferError, setTransferError] = useState("");

    const registerMutation = useMutation({
        mutationFn: () =>
            register({
                name,
                email,
                password,
            }),

        onSuccess: async ({ user }) => {
            // Atualiza imediatamente a sessão do usuário.
            queryClient.setQueryData(["session"], user);

            setTransferError("");

            try {
                // Transfere o carrinho visitante para a nova conta.
                const mergedCart = await mergeGuestCart();

                // Atualiza o cache do carrinho.
                queryClient.setQueryData(["cart"], mergedCart);

                // Redireciona para a página inicial.
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
                // O cadastro foi concluído, mesmo se a transferência falhou.
                await queryClient.invalidateQueries({
                    queryKey: ["cart"],
                });

                const message = isAxiosError(error)
                    ? error.response?.data?.message
                    : null;

                setTransferError(
                    message ??
                    "Sua conta foi criada, mas não foi possível transferir os itens do carrinho. Seus produtos de visitante foram preservados."
                );
            }
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setValidationError("");

        if (name.trim().length < 3) {
            setValidationError(
                "Informe um nome com pelo menos 3 caracteres."
            );
            return;
        }

        if (password.length < 8) {
            setValidationError(
                "A senha deve ter pelo menos 8 caracteres."
            );
            return;
        }

        if (password !== confirmPassword) {
            setValidationError("As senhas não coincidem.");
            return;
        }

        registerMutation.mutate();
    }

    const apiError = isAxiosError(registerMutation.error)
        ? registerMutation.error.response?.data?.message
        : registerMutation.isError
            ? "Não foi possível criar sua conta."
            : null;

    const errorMessage =
        validationError || transferError || apiError;

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#140e0b] px-5 py-12 text-[#f5e7d8]">
            <section className="w-full max-w-md rounded-xl border border-[#4a3328] bg-[#261711] p-8">
                <p className="text-sm text-[#d8904c]">
                    Comece sua coleção
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Criar conta
                </h1>

                <p className="mt-3 text-sm text-[#b09270]">
                    Cadastre-se para explorar os recursos da Kurio.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="register-name">
                            Nome completo
                        </Label>

                        <Input
                            id="register-name"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            className="border-[#4a3328] bg-[#140e0b]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="register-email">E-mail</Label>

                        <Input
                            id="register-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            className="border-[#4a3328] bg-[#140e0b]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="register-password">Senha</Label>

                        <Input
                            id="register-password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            className="border-[#4a3328] bg-[#140e0b]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="register-confirm">
                            Confirmar senha
                        </Label>

                        <Input
                            id="register-confirm"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) =>
                                setConfirmPassword(event.target.value)
                            }
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
                        disabled={registerMutation.isPending}
                        className="w-full bg-[#d8904c] py-5 text-[#140e0b] hover:bg-[#e6a96f]"
                    >
                        {registerMutation.isPending
                            ? "Criando conta..."
                            : "Criar conta"}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-[#b09270]">
                    Já possui uma conta?{" "}
                    <Link
                        to="/login"
                        className="font-semibold text-[#d8904c] hover:underline"
                    >
                        Entrar
                    </Link>
                </p>
            </section>
        </main>
    );
}