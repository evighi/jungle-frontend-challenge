import { http, HttpResponse } from "msw";

interface StoredUser {
    id: string;
    name: string;
    email: string;
    salt: string;
    passwordHash: string;
}

interface StoredSession {
    token: string;
    userId: string;
    expiresAt: number;
}

const USERS_KEY = "kurio:users:v1";
const SESSIONS_KEY = "kurio:sessions:v1";

const SESSION_DURATION = 60 * 60 * 1000;

function readStorage<T>(key: string, fallback: T): T {
    try {
        const value = localStorage.getItem(key);
        return value ? (JSON.parse(value) as T) : fallback;
    } catch {
        return fallback;
    }
}

function getUsers(): StoredUser[] {
    return readStorage<StoredUser[]>(USERS_KEY, []);
}

function saveUsers(users: StoredUser[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSessions(): StoredSession[] {
    return readStorage<StoredSession[]>(SESSIONS_KEY, []);
}

function saveSessions(sessions: StoredSession[]) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

async function hashPassword(
    password: string,
    salt: string
): Promise<string> {
    const encoded = new TextEncoder().encode(
        `${salt}:${password}`
    );

    const buffer = await crypto.subtle.digest(
        "SHA-256",
        encoded
    );

    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function initializeUsers() {
    if (getUsers().length > 0) return;

    const fixtures = [
        {
            id: "user-1",
            name: "Ana Silva",
            email: "ana@kurio.test",
        },
        {
            id: "user-2",
            name: "Pedro Costa",
            email: "pedro@kurio.test",
        },
    ];

    const users = await Promise.all(
        fixtures.map(async (user) => {
            const salt = crypto.randomUUID();

            return {
                ...user,
                salt,
                passwordHash: await hashPassword(
                    "Demo1234!",
                    salt
                ),
            };
        })
    );

    saveUsers(users);
}

function publicUser(user: StoredUser) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
    };
}

function createSession(user: StoredUser) {
    const token = crypto.randomUUID();

    const session: StoredSession = {
        token,
        userId: user.id,
        expiresAt: Date.now() + SESSION_DURATION,
    };

    saveSessions([
        ...getSessions().filter(
            (existing) => existing.expiresAt > Date.now()
        ),
        session,
    ]);

    return {
        token,
        user: publicUser(user),
    };
}

function getToken(request: Request) {
    const authorization = request.headers.get(
        "Authorization"
    );

    if (!authorization?.startsWith("Bearer ")) {
        return null;
    }

    return authorization.slice(7);
}

function findAuthenticatedUser(request: Request) {
    const token = getToken(request);

    if (!token) return null;

    const session = getSessions().find(
        (item) =>
            item.token === token &&
            item.expiresAt > Date.now()
    );

    if (!session) return null;

    return (
        getUsers().find(
            (user) => user.id === session.userId
        ) ?? null
    );
}

export type RequestIdentity =
    | { type: "guest" }
    | { type: "authenticated"; userId: string }
    | { type: "invalid" };

export function resolveRequestIdentity(
    request: Request
): RequestIdentity {
    const authorization = request.headers.get("Authorization");

    // Sem credenciais: usuário visitante.
    if (!authorization) {
        return { type: "guest" };
    }

    // Credenciais enviadas, mas inválidas ou expiradas.
    const user = findAuthenticatedUser(request);

    if (!user) {
        return { type: "invalid" };
    }

    // Sessão válida: usuário autenticado.
    return {
        type: "authenticated",
        userId: user.id,
    };
}

export const authHandlers = [
    http.post("/api/auth/login", async ({ request }) => {
        await initializeUsers();

        const body = (await request.json()) as {
            email?: unknown;
            password?: unknown;
        };

        if (
            typeof body.email !== "string" ||
            typeof body.password !== "string"
        ) {
            return HttpResponse.json(
                { message: "Informe e-mail e senha." },
                { status: 400 }
            );
        }

        const normalizedEmail = body.email.trim().toLowerCase();

        const user = getUsers().find(
            (item) =>
                item.email.toLowerCase() === normalizedEmail
        );

        if (!user) {
            return HttpResponse.json(
                { message: "Credenciais inválidas." },
                { status: 401 }
            );
        }

        const passwordHash = await hashPassword(
            body.password,
            user.salt
        );

        if (passwordHash !== user.passwordHash) {
            return HttpResponse.json(
                { message: "Credenciais inválidas." },
                { status: 401 }
            );
        }

        return HttpResponse.json(createSession(user));
    }),

    http.post("/api/auth/register", async ({ request }) => {
        await initializeUsers();

        const body = (await request.json()) as {
            name?: unknown;
            email?: unknown;
            password?: unknown;
        };

        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : "";

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const password =
            typeof body.password === "string"
                ? body.password
                : "";

        if (
            name.length < 3 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            password.length < 8
        ) {
            return HttpResponse.json(
                { message: "Confira os dados informados." },
                { status: 400 }
            );
        }

        if (
            getUsers().some(
                (user) => user.email === email
            )
        ) {
            return HttpResponse.json(
                { message: "Este e-mail já está cadastrado." },
                { status: 409 }
            );
        }

        const salt = crypto.randomUUID();

        const newUser: StoredUser = {
            id: crypto.randomUUID(),
            name,
            email,
            salt,
            passwordHash: await hashPassword(
                password,
                salt
            ),
        };

        saveUsers([...getUsers(), newUser]);

        return HttpResponse.json(
            createSession(newUser),
            { status: 201 }
        );
    }),

    http.get("/api/auth/session", async ({ request }) => {
        await initializeUsers();

        const user = findAuthenticatedUser(request);

        if (!user) {
            return HttpResponse.json(
                { message: "Sessão inválida ou expirada." },
                { status: 401 }
            );
        }

        return HttpResponse.json(publicUser(user));
    }),

    http.post("/api/auth/logout", ({ request }) => {
        const token = getToken(request);

        saveSessions(
            getSessions().filter(
                (session) => session.token !== token
            )
        );

        return new HttpResponse(null, {
            status: 204,
        });
    }),
];