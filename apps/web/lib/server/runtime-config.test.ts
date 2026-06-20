import { describe, expect, it } from "vitest";

import { getReadinessHttpStatus, getRuntimeReadiness } from "./runtime-config";

describe("runtime readiness contract", () => {
  it("keeps the local fallback path ready without external credentials", () => {
    const readiness = getRuntimeReadiness({
      CLINICBRIEF_DATA_BACKEND: "memory",
      CLINICBRIEF_STORAGE_BACKEND: "memory",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    });

    expect(readiness.ok).toBe(true);
    expect(readiness.ai.state).toBe("fallback");
    expect(readiness.database).toMatchObject({ state: "fallback", backend: "memory" });
    expect(readiness.storage).toMatchObject({ state: "fallback", backend: "memory" });
    expect(getReadinessHttpStatus(readiness)).toBe(200);
  });

  it("reports selected but incomplete provider config without leaking values", () => {
    const readiness = getRuntimeReadiness({
      CLINICBRIEF_DATA_BACKEND: "prisma",
      CLINICBRIEF_STORAGE_BACKEND: "supabase",
      FIREWORKS_API_KEY: "secret-key",
      NEXT_PUBLIC_APP_URL: "not-a-url"
    });

    expect(readiness.ok).toBe(false);
    expect(readiness.ai).toMatchObject({ state: "misconfigured", missingEnv: ["FIREWORKS_MODEL"] });
    expect(readiness.database).toMatchObject({ state: "misconfigured", missingEnv: ["DATABASE_URL"] });
    expect(readiness.storage.state).toBe("misconfigured");
    expect(JSON.stringify(readiness)).not.toContain("secret-key");
    expect(getReadinessHttpStatus(readiness)).toBe(503);
  });

  it("treats AI-required mode without Fireworks as misconfigured", () => {
    const readiness = getRuntimeReadiness({
      CLINICBRIEF_REQUIRE_AI: "true",
      CLINICBRIEF_DATA_BACKEND: "memory",
      CLINICBRIEF_STORAGE_BACKEND: "memory",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    });

    expect(readiness.ok).toBe(false);
    expect(readiness.ai).toMatchObject({
      state: "misconfigured",
      backend: "fireworks",
      configuredEnv: ["CLINICBRIEF_REQUIRE_AI"],
      missingEnv: ["FIREWORKS_API_KEY", "FIREWORKS_MODEL"]
    });
    expect(getReadinessHttpStatus(readiness)).toBe(503);
  });

  it("does not treat a server-only Novus key as browser installation", () => {
    const readiness = getRuntimeReadiness({
      CLINICBRIEF_DATA_BACKEND: "memory",
      CLINICBRIEF_STORAGE_BACKEND: "memory",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NOVUS_API_KEY: "private-novus-secret"
    });

    expect(readiness.ok).toBe(true);
    expect(readiness.novus).toMatchObject({
      state: "unconfigured",
      backend: "novus_pendo",
      configuredEnv: ["NOVUS_API_KEY"],
      missingEnv: ["NEXT_PUBLIC_NOVUS_CLIENT_KEY", "NEXT_PUBLIC_PENDO_API_KEY"]
    });
    expect(JSON.stringify(readiness)).not.toContain("private-novus-secret");
  });

  it("treats the generated Pendo integration key env as server-side Novus Track API configuration", () => {
    const readiness = getRuntimeReadiness({
      CLINICBRIEF_DATA_BACKEND: "memory",
      CLINICBRIEF_STORAGE_BACKEND: "memory",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      PENDO_INTEGRATION_KEY: "private-pendo-integration-secret"
    });

    expect(readiness.ok).toBe(true);
    expect(readiness.novus).toMatchObject({
      state: "configured",
      backend: "novus_pendo_track_api",
      configuredEnv: ["PENDO_INTEGRATION_KEY"],
      missingEnv: []
    });
    expect(JSON.stringify(readiness)).not.toContain("private-pendo-integration-secret");
  });
});
