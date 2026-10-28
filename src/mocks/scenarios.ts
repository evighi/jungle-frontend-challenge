import { delay, HttpResponse } from "msw";

export type MockFailureMode =
    | "none"
    | "http500"
    | "network";

export interface MockScenario {
    delayMs: number;
    failure: MockFailureMode;
}

const STORAGE_KEY = "kurio:mock-scenario:v1";

const defaultScenario: MockScenario = {
    delayMs: 0,
    failure: "none",
};

export function getMockScenario(): MockScenario {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return defaultScenario;
        }

        const parsed: unknown = JSON.parse(raw);

        if (
            typeof parsed !== "object" ||
            parsed === null
        ) {
            return defaultScenario;
        }

        const value = parsed as Partial<MockScenario>;

        const delayMs =
            typeof value.delayMs === "number" &&
                Number.isFinite(value.delayMs)
                ? Math.max(
                    0,
                    Math.min(value.delayMs, 30000)
                )
                : 0;

        const failure: MockFailureMode =
            value.failure === "http500" ||
                value.failure === "network"
                ? value.failure
                : "none";

        return {
            delayMs,
            failure,
        };
    } catch {
        return defaultScenario;
    }
}

export async function applyMockScenario():
    Promise<Response | null> {
    const scenario = getMockScenario();

    if (scenario.delayMs > 0) {
        await delay(scenario.delayMs);
    }

    if (scenario.failure === "http500") {
        return HttpResponse.json(
            {
                message:
                    "Serviço temporariamente indisponível.",
            },
            {
                status: 500,
            }
        );
    }

    if (scenario.failure === "network") {
        return HttpResponse.error();
    }

    return null;
}