import { useEffect, useState, type FormEvent } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { ArrowLeft, UserRound } from "lucide-react";

import {
    getAuthToken,
    getSession,
} from "../api/auth";

import {
    getProfile,
    updateProfile,
    changePassword,
} from "../api/profile";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";

function getErrorMessage(
    error: unknown,
    fallback: string
): string {
    if (isAxiosError(error)) {
        const message = error.response?.data?.message;

        if (typeof message === "string") {
            return message;
        }
    }

    return fallback;
}

export function Profile() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const hasToken = Boolean(getAuthToken());

    const [editedName, setEditedName] =
        useState<string | null>(null);

    const [editedEmail, setEditedEmail] =
        useState<string | null>(null);

    const [editedAvatarUrl, setEditedAvatarUrl] =
        useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [profileError, setProfileError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const [profileSuccess, setProfileSuccess] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");

    // Primeiro identifica o usuário autenticado.
    const {
        data: session,
        isLoading: sessionLoading,
        isError: sessionError,
    } = useQuery({
        queryKey: ["session"],
        queryFn: getSession,
        enabled: hasToken,
        retry: false,
    });

    // O identificador do usuário compõe a chave do cache.
    // Isso impede reutilizar o perfil de outra conta.
    const profileQueryKey = [
        "profile",
        session?.id,
    ] as const;

    const {
        data: profile,
        isLoading: profileLoading,
        isError: profileLoadingError,
        refetch,
    } = useQuery({
        queryKey: profileQueryKey,
        queryFn: getProfile,
        enabled: hasToken && Boolean(session?.id),
        retry: false,
    });

    // Protege o acesso quando não existe sessão válida.
    useEffect(() => {
        if (!hasToken || sessionError) {
            void navigate({
                to: "/login",
                replace: true,
            });
        }
    }, [hasToken, sessionError, navigate]);

    // Inicializa os campos com os dados recebidos.
    const name =
        editedName ?? profile?.name ?? "";

    const email =
        editedEmail ?? profile?.email ?? "";

    const avatarUrl =
        editedAvatarUrl ?? profile?.avatarUrl ?? "";

    const updateMutation = useMutation({
        mutationFn: updateProfile,

        onSuccess: (updatedProfile) => {
            queryClient.setQueryData(
                profileQueryKey,
                updatedProfile
            );

            // Atualiza também os dados exibidos no Header.
            queryClient.setQueryData(
                ["session"],
                updatedProfile
            );


            setEditedName(null);
            setEditedEmail(null);
            setEditedAvatarUrl(null);
            setProfileError("");
            setProfileSuccess(
                "Perfil atualizado com sucesso."
            );
        },
    });

    const passwordMutation = useMutation({
        mutationFn: changePassword,

        onSuccess: () => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            setPasswordError("");
            setPasswordSuccess(
                "Senha alterada com sucesso."
            );
        },
    });

    function handleUpdateProfile(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setProfileError("");
        setProfileSuccess("");

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (
            normalizedName.length < 3 ||
            normalizedName.length > 100
        ) {
            setProfileError(
                "O nome deve ter entre 3 e 100 caracteres."
            );
            return;
        }

        if (
            normalizedEmail.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedEmail
            )
        ) {
            setProfileError(
                "Informe um e-mail válido."
            );
            return;
        }

        updateMutation.mutate({
            name: normalizedName,
            email: normalizedEmail,
            avatarUrl: avatarUrl.trim() || null,
        });
    }

    function handleChangePassword(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setPasswordError("");
        setPasswordSuccess("");

        if (!currentPassword) {
            setPasswordError(
                "Informe sua senha atual."
            );
            return;
        }

        if (
            newPassword.length < 8 ||
            newPassword.length > 128
        ) {
            setPasswordError(
                "A nova senha deve ter entre 8 e 128 caracteres."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(
                "A confirmação da nova senha não coincide."
            );
            return;
        }

        if (newPassword === currentPassword) {
            setPasswordError(
                "A nova senha deve ser diferente da atual."
            );
            return;
        }

        passwordMutation.mutate({
            currentPassword,
            newPassword,
        });
    }

    const loading =
        sessionLoading ||
        (Boolean(session) && profileLoading);

    const updateApiError = updateMutation.isError
        ? getErrorMessage(
            updateMutation.error,
            "Não foi possível atualizar o perfil."
        )
        : "";

    const passwordApiError = passwordMutation.isError
        ? getErrorMessage(
            passwordMutation.error,
            "Não foi possível alterar a senha."
        )
        : "";

    if (!hasToken || sessionError) {
        return null;
    }

    return (
        <main className="min-h-screen bg-[#140e0b] px-5 py-12 text-[#f5e7d8]">
            <div className="mx-auto max-w-5xl">
                <Link
                    to="/"
                    search={{
                        search: "",
                        category: "",
                        sort: "",
                        page: 1,
                    }}
                    className="inline-flex items-center gap-2 text-sm text-[#d8904c] hover:underline"
                >
                    <ArrowLeft size={17} />
                    Voltar ao início
                </Link>

                <div className="mt-10">
                    <h1 className="text-3xl font-bold">
                        Meu perfil
                    </h1>

                    <p className="mt-3 text-sm text-[#b09270]">
                        Gerencie seus dados pessoais e a segurança
                        da sua conta.
                    </p>
                </div>

                {loading && (
                    <div className="mt-10 grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-96 bg-[#38241b]" />
                        <Skeleton className="h-96 bg-[#38241b]" />
                    </div>
                )}

                {profileLoadingError && !loading && (
                    <div
                        role="alert"
                        className="mt-10 rounded-xl border border-red-700/50 bg-[#261711] p-6"
                    >
                        <p>
                            Não foi possível carregar seu perfil.
                        </p>

                        <Button
                            type="button"
                            onClick={() => void refetch()}
                            className="mt-4 bg-[#d8904c] text-[#140e0b]"
                        >
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {profile && !loading && (
                    <div className="mt-10 grid items-start gap-6 md:grid-cols-2">
                        {/* DADOS PESSOAIS */}
                        <section className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                            <h2 className="text-xl font-bold">
                                Dados pessoais
                            </h2>

                            <div className="mt-6 flex items-center gap-4">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#4a3328] bg-[#140e0b]">
                                    {avatarUrl &&
                                        /^https?:\/\//i.test(avatarUrl) ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Pré-visualização do avatar"
                                            className="h-full w-full object-cover"
                                            onError={(event) => {
                                                event.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    ) : (
                                        <UserRound
                                            size={34}
                                            className="text-[#d8904c]"
                                        />
                                    )}
                                </div>

                                <div>
                                    <p className="font-semibold">
                                        {profile.name}
                                    </p>

                                    <p className="mt-1 break-all text-xs text-[#b09270]">
                                        {profile.email}
                                    </p>
                                </div>
                            </div>

                            <form
                                onSubmit={handleUpdateProfile}
                                className="mt-8 space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="profile-name">
                                        Nome completo
                                    </Label>

                                    <Input
                                        id="profile-name"
                                        value={name}
                                        onChange={(event) =>
                                            setEditedName(event.target.value)
                                        }
                                        minLength={3}
                                        maxLength={100}
                                        autoComplete="name"
                                        required
                                        className="border-[#4a3328] bg-[#140e0b]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile-email">
                                        E-mail
                                    </Label>

                                    <Input
                                        id="profile-email"
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEditedEmail(event.target.value)
                                        }
                                        autoComplete="email"
                                        required
                                        className="border-[#4a3328] bg-[#140e0b]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile-avatar">
                                        URL do avatar
                                    </Label>

                                    <Input
                                        id="profile-avatar"
                                        type="url"
                                        value={avatarUrl}
                                        onChange={(event) =>
                                            setEditedAvatarUrl(event.target.value)
                                        }
                                        placeholder="https://exemplo.com/avatar.png"
                                        className="border-[#4a3328] bg-[#140e0b]"
                                    />

                                    <p className="text-xs text-[#b09270]">
                                        Informe uma URL HTTP ou HTTPS.
                                        Deixe em branco para remover o avatar.
                                    </p>
                                </div>

                                {(profileError || updateApiError) && (
                                    <p
                                        role="alert"
                                        className="rounded-lg border border-red-500/40 p-3 text-sm text-red-300"
                                    >
                                        {profileError || updateApiError}
                                    </p>
                                )}

                                {profileSuccess && (
                                    <p
                                        role="status"
                                        className="rounded-lg border border-green-500/40 p-3 text-sm text-green-300"
                                    >
                                        {profileSuccess}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="w-full bg-[#d8904c] py-5 text-[#140e0b]"
                                >
                                    {updateMutation.isPending
                                        ? "Salvando..."
                                        : "Salvar alterações"}
                                </Button>
                            </form>
                        </section>

                        {/* SEGURANÇA */}
                        <section className="rounded-xl border border-[#4a3328] bg-[#261711] p-6">
                            <h2 className="text-xl font-bold">
                                Segurança da conta
                            </h2>

                            <p className="mt-3 text-sm text-[#b09270]">
                                Para alterar sua senha, confirme a senha
                                atual e informe uma nova.
                            </p>

                            <form
                                onSubmit={handleChangePassword}
                                className="mt-8 space-y-5"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">
                                        Senha atual
                                    </Label>

                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) =>
                                            setCurrentPassword(
                                                event.target.value
                                            )
                                        }
                                        autoComplete="current-password"
                                        required
                                        className="border-[#4a3328] bg-[#140e0b]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="new-password">
                                        Nova senha
                                    </Label>

                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) =>
                                            setNewPassword(event.target.value)
                                        }
                                        autoComplete="new-password"
                                        minLength={8}
                                        maxLength={128}
                                        required
                                        className="border-[#4a3328] bg-[#140e0b]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm-new-password">
                                        Confirmar nova senha
                                    </Label>

                                    <Input
                                        id="confirm-new-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) =>
                                            setConfirmPassword(
                                                event.target.value
                                            )
                                        }
                                        autoComplete="new-password"
                                        required
                                        className="border-[#4a3328] bg-[#140e0b]"
                                    />
                                </div>

                                {(passwordError || passwordApiError) && (
                                    <p
                                        role="alert"
                                        className="rounded-lg border border-red-500/40 p-3 text-sm text-red-300"
                                    >
                                        {passwordError || passwordApiError}
                                    </p>
                                )}

                                {passwordSuccess && (
                                    <p
                                        role="status"
                                        className="rounded-lg border border-green-500/40 p-3 text-sm text-green-300"
                                    >
                                        {passwordSuccess}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={passwordMutation.isPending}
                                    className="w-full bg-[#d8904c] py-5 text-[#140e0b]"
                                >
                                    {passwordMutation.isPending
                                        ? "Alterando..."
                                        : "Alterar senha"}
                                </Button>
                            </form>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}