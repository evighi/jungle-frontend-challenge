import { api } from "./nfts";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

const TOKEN_KEY = "kurio:auth-token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>(
    "/auth/login",
    { email, password }
  );

  localStorage.setItem(TOKEN_KEY, data.token);

  return data;
}

export async function register(
  input: RegisterInput
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>(
    "/auth/register",
    input
  );

  localStorage.setItem(TOKEN_KEY, data.token);

  return data;
}

export async function getSession(): Promise<User> {
  const { data } = await api.get<User>("/auth/session");

  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}