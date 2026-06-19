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
});
