import { api } from "./nfts";

export interface CollectorProfile {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
}

export interface UpdateProfileInput {
    name: string;
    email: string;
    avatarUrl: string | null;
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

export async function getProfile(): Promise<CollectorProfile> {
    const { data } = await api.get<CollectorProfile>(
        "/profile"
    );

    return data;
}

export async function updateProfile(
    input: UpdateProfileInput
): Promise<CollectorProfile> {
    const { data } = await api.patch<CollectorProfile>(
        "/profile",
        input
    );

    return data;
}

export async function changePassword(
    input: ChangePasswordInput
): Promise<void> {
    await api.patch(
        "/profile/password",
        input
    );
}