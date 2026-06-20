import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Events } from "@clinicbrief/events";

import { POST } from "./route";

describe("events route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sanitizes event props and skips Track API when no integration key is configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(
      makeJsonRequest({
        name: Events.ExtractionCompleted,
        caseId: "case-private",
        props: {
          mode: "PREOP",
          factCount: 4,
          rawText: "private health narrative",
          fileName: "private.pdf"
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      name: Events.ExtractionCompleted,
      props: {
        mode: "PREOP",
        factCount: 4
      },
      droppedUnsafeProps: 2,
      forwardsCaseIdentifierToNovus: false,
      forwardedToServerTrackApi: false
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(payload)).not.toContain("case-private");
    expect(JSON.stringify(payload)).not.toContain("private health narrative");
  });

  it("forwards only sanitized props to the Pendo Track API when the generated integration key env is configured", async () => {
    vi.stubEnv("PENDO_INTEGRATION_KEY", "test-pendo-integration-key");
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(
      makeJsonRequest({
        name: Events.PatternCardsGenerated,
        caseId: "case-private",
        props: {
          mode: "PREOP",
          patternCardCount: 2,
          safetyLabel: "possible_medication_issue",
          sourceQuote: "private source quote"
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      props: {
        mode: "PREOP",
        patternCardCount: 2
      },
      forwardsCaseIdentifierToNovus: false,
      forwardedToServerTrackApi: true
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://data.pendo.io/data/track",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pendo-integration-key": "test-pendo-integration-key"
        }
      })
    );

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const forwardedBody = JSON.parse(String(init.body));
    expect(forwardedBody).toEqual({
      type: "track",
      event: Events.PatternCardsGenerated,
      visitorId: "anonymous-clinicbrief-user",
      accountId: "clinicbrief-public-demo",
      timestamp: Date.parse("2026-06-20T12:00:00.000Z"),
      properties: {
        mode: "PREOP",
        patternCardCount: 2
      }
    });
    expect(JSON.stringify(forwardedBody)).not.toContain("case-private");
    expect(JSON.stringify(forwardedBody)).not.toContain("private source quote");
    expect(JSON.stringify(forwardedBody)).not.toContain("possible_medication_issue");
  });

  it("rejects unknown events before attempting Track API forwarding", async () => {
    vi.stubEnv("PENDO_INTEGRATION_KEY", "test-pendo-integration-key");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(makeJsonRequest({ name: "raw_health_text_sent", props: { factCount: 1 } }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
