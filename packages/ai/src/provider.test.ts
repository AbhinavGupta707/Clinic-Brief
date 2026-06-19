import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { runClinicJson } from "./provider";

describe("Fireworks provider wrapper", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries once when the first response fails schema validation", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    const fetchMock = mockFireworksResponses([JSON.stringify({ ok: false }), JSON.stringify({ ok: true })]);

    const result = await runClinicJson({
      task: "retry-test",
      system: "Return JSON.",
      user: "Return ok true.",
      schema: z.object({ ok: z.literal(true) }).strict()
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as unknown as Array<[unknown, RequestInit | undefined]>;
    const retryInit = calls[1]?.[1];
    const retryBody = JSON.parse(String(retryInit?.body)) as { messages: Array<{ content: string }> };
    expect(retryBody.messages.at(-1)?.content).toContain("failed validation");
  });

  it("surfaces provider failures to the caller for safe service fallback", async () => {
    vi.stubEnv("FIREWORKS_API_KEY", "test-key");
    vi.stubEnv("FIREWORKS_MODEL", "accounts/fireworks/models/test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503, statusText: "Service Unavailable" }))
    );

    await expect(
      runClinicJson({
        task: "failure-test",
        system: "Return JSON.",
        user: "Return ok true.",
        schema: z.object({ ok: z.literal(true) }).strict()
      })
    ).rejects.toThrow("Fireworks request failed");
  });
});

function mockFireworksResponses(contents: string[]) {
  const queue = [...contents];
  const fetchMock = vi.fn(async () => {
    const content = queue.shift() ?? contents.at(-1) ?? "{}";

    return new Response(
      JSON.stringify({
        choices: [{ message: { content } }]
      }),
      { status: 200 }
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
