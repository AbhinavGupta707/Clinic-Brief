import type { RuntimeReadiness, RuntimeServiceReadiness } from "@clinicbrief/types";

type Env = Record<string, string | undefined>;

const memoryDataBackend = "memory";
const prismaDataBackend = "prisma";
const memoryStorageBackend = "memory";
const supabaseStorageBackend = "supabase";

export function getRuntimeReadiness(env: Env = process.env): RuntimeReadiness {
  const readiness = {
    generatedAt: new Date().toISOString(),
    app: getAppReadiness(env),
    ai: getAiReadiness(env),
    database: getDatabaseReadiness(env),
    storage: getStorageReadiness(env),
    novus: getNovusReadiness(env)
  };

  return {
    ok: Object.values(readiness).every((service) => !isRuntimeServiceReadiness(service) || service.state !== "misconfigured"),
    ...readiness
  };
}

export function getReadinessHttpStatus(readiness: RuntimeReadiness): number {
  return readiness.ok ? 200 : 503;
}

function getAppReadiness(env: Env): RuntimeServiceReadiness {
  const configured = present(env.NEXT_PUBLIC_APP_URL);

  if (!configured) {
    return {
      state: "fallback",
      summary: "App URL is not configured; local fallback URL is used for development-only links.",
      configuredEnv: [],
      missingEnv: ["NEXT_PUBLIC_APP_URL"],
      fallback: "http://localhost:3000"
    };
  }

  if (!isSafeHttpUrl(env.NEXT_PUBLIC_APP_URL)) {
    return {
      state: "misconfigured",
      summary: "NEXT_PUBLIC_APP_URL must be an http(s) URL.",
      configuredEnv: ["NEXT_PUBLIC_APP_URL"],
      missingEnv: []
    };
  }

  return {
    state: "configured",
    summary: "Public app URL is configured.",
    configuredEnv: ["NEXT_PUBLIC_APP_URL"],
    missingEnv: []
  };
}

function getAiReadiness(env: Env): RuntimeServiceReadiness {
  const requireAi = env.CLINICBRIEF_REQUIRE_AI?.trim().toLowerCase() === "true";
  const configuredEnv = presentNames(env, ["FIREWORKS_API_KEY", "FIREWORKS_MODEL"]);
  const missingEnv = missingNames(env, ["FIREWORKS_API_KEY", "FIREWORKS_MODEL"]);
  const allConfiguredEnv = [...presentNames(env, ["CLINICBRIEF_REQUIRE_AI"]), ...configuredEnv];

  if (configuredEnv.length === 2) {
    return {
      state: "configured",
      backend: "fireworks",
      summary: requireAi ? "Fireworks AI provider is configured and AI-required mode is active." : "Fireworks AI provider is configured. All AI calls must still use strict schemas and safety guards.",
      configuredEnv: allConfiguredEnv,
      missingEnv: []
    };
  }

  if (requireAi) {
    return {
      state: "misconfigured",
      backend: "fireworks",
      summary: "CLINICBRIEF_REQUIRE_AI is true, but Fireworks requires both FIREWORKS_API_KEY and FIREWORKS_MODEL.",
      configuredEnv: allConfiguredEnv,
      missingEnv
    };
  }

  if (configuredEnv.length === 0) {
    return {
      state: "fallback",
      backend: "deterministic",
      summary: "Fireworks is not configured; deterministic fixture/source-text fallbacks remain active.",
      configuredEnv: [],
      missingEnv,
      fallback: "fixture_and_source_text"
    };
  }

  return {
    state: "misconfigured",
    backend: "fireworks",
    summary: "Fireworks requires both FIREWORKS_API_KEY and FIREWORKS_MODEL.",
    configuredEnv,
    missingEnv
  };
}

function getDatabaseReadiness(env: Env): RuntimeServiceReadiness {
  const backend = normalizeChoice(env.CLINICBRIEF_DATA_BACKEND, [memoryDataBackend, prismaDataBackend], memoryDataBackend);

  if (!backend.valid) {
    return {
      state: "misconfigured",
      backend: env.CLINICBRIEF_DATA_BACKEND,
      summary: "CLINICBRIEF_DATA_BACKEND must be memory or prisma.",
      configuredEnv: presentNames(env, ["CLINICBRIEF_DATA_BACKEND"]),
      missingEnv: []
    };
  }

  if (backend.value === memoryDataBackend) {
    return {
      state: "fallback",
      backend: memoryDataBackend,
      summary: "Memory repository is active. This keeps demos working without external credentials.",
      configuredEnv: presentNames(env, ["CLINICBRIEF_DATA_BACKEND"]),
      missingEnv: [],
      fallback: "process_memory"
    };
  }

  if (!present(env.DATABASE_URL)) {
    return {
      state: "misconfigured",
      backend: prismaDataBackend,
      summary: "Prisma repository was selected but DATABASE_URL is missing.",
      configuredEnv: ["CLINICBRIEF_DATA_BACKEND"],
      missingEnv: ["DATABASE_URL"]
    };
  }

  return {
    state: "configured",
    backend: prismaDataBackend,
    summary: "Prisma database backend is selected and DATABASE_URL is present.",
    configuredEnv: ["CLINICBRIEF_DATA_BACKEND", "DATABASE_URL"],
    missingEnv: []
  };
}

function getStorageReadiness(env: Env): RuntimeServiceReadiness {
  const backend = normalizeChoice(env.CLINICBRIEF_STORAGE_BACKEND, [memoryStorageBackend, supabaseStorageBackend], memoryStorageBackend);

  if (!backend.valid) {
    return {
      state: "misconfigured",
      backend: env.CLINICBRIEF_STORAGE_BACKEND,
      summary: "CLINICBRIEF_STORAGE_BACKEND must be memory or supabase.",
      configuredEnv: presentNames(env, ["CLINICBRIEF_STORAGE_BACKEND"]),
      missingEnv: []
    };
  }

  if (backend.value === memoryStorageBackend) {
    return {
      state: "fallback",
      backend: memoryStorageBackend,
      summary: "Private memory storage is active. Uploaded files stay in process memory and can be deleted by case.",
      configuredEnv: presentNames(env, ["CLINICBRIEF_STORAGE_BACKEND"]),
      missingEnv: [],
      fallback: "private_memory_urls"
    };
  }

  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"];
  const configuredEnv = ["CLINICBRIEF_STORAGE_BACKEND", ...presentNames(env, required)];
  const missingEnv = missingNames(env, required);

  if (missingEnv.length > 0) {
    return {
      state: "misconfigured",
      backend: supabaseStorageBackend,
      summary: "Supabase storage was selected but required private storage env is missing.",
      configuredEnv,
      missingEnv
    };
  }

  return {
    state: "configured",
    backend: supabaseStorageBackend,
    summary: "Supabase private storage backend is selected and required env is present.",
    configuredEnv,
    missingEnv: []
  };
}

function getNovusReadiness(env: Env): RuntimeServiceReadiness {
  const publicEnv = ["NEXT_PUBLIC_NOVUS_CLIENT_KEY", "NEXT_PUBLIC_PENDO_API_KEY"];
  const configuredPublicEnv = presentNames(env, publicEnv);
  const configuredServerEnv = presentNames(env, ["PENDO_INTEGRATION_KEY"]);
  const configuredEnv = [...configuredPublicEnv, ...configuredServerEnv, ...presentNames(env, ["NOVUS_API_KEY"])];

  if (configuredServerEnv.length > 0) {
    return {
      state: "configured",
      backend: "novus_pendo_track_api",
      summary: "Pendo Track API integration key is configured server-side. Client events route through /api/events and are sanitized before forwarding.",
      configuredEnv,
      missingEnv: []
    };
  }

  if (configuredPublicEnv.length === 0) {
    return {
      state: "unconfigured",
      backend: "novus_pendo",
      summary:
        configuredEnv.length > 0
          ? "A server-only Novus key marker is present, but it is not the generated Pendo Track API integration key and the browser Novus/Pendo install is not active without a public client key or dashboard-generated snippet."
          : "Novus/Pendo is not installed. Safe local analytics sanitizer proof still works.",
      configuredEnv,
      missingEnv: publicEnv,
      fallback: "local_event_sanitizer"
    };
  }

  return {
    state: "configured",
    backend: "novus_pendo",
    summary: "A Novus/Pendo env marker is present. Use only the sanitized event wrapper and dashboard-generated install flow.",
    configuredEnv,
    missingEnv: []
  };
}

function normalizeChoice(value: string | undefined, allowed: string[], fallback: string): { valid: true; value: string } | { valid: false } {
  if (!present(value)) {
    return { valid: true, value: fallback };
  }

  const normalized = value?.trim().toLowerCase();

  if (normalized && allowed.includes(normalized)) {
    return { valid: true, value: normalized };
  }

  return { valid: false };
}

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function presentNames(env: Env, names: string[]): string[] {
  return names.filter((name) => present(env[name]));
}

function missingNames(env: Env, names: string[]): string[] {
  return names.filter((name) => !present(env[name]));
}

function isSafeHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRuntimeServiceReadiness(value: unknown): value is RuntimeServiceReadiness {
  return Boolean(value && typeof value === "object" && "state" in value);
}
