import { afterEach, describe, expect, it, vi } from "vitest";

import { deletePrivateFilesForCase, hashText, savePrivateFile } from "./private-storage";

describe("private storage boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stores files behind a private memory URL and deletes by case", async () => {
    const receipt = await savePrivateFile({
      caseId: "case-storage-test",
      fileName: "clinic note.pdf",
      contentType: "application/pdf",
      bytes: new TextEncoder().encode("synthetic private file").buffer
    });

    expect(receipt.fileUrl).toMatch(/^memory:\/\/clinicbrief\/cases\/case-storage-test\//);
    expect(receipt.storageBackend).toBe("memory");
    expect(receipt.sourceHash).toHaveLength(64);
    await expect(deletePrivateFilesForCase("case-storage-test")).resolves.toMatchObject({
      storageBackend: "memory",
      objectPrefix: "cases/case-storage-test/",
      filesRemoved: 1
    });
    await expect(deletePrivateFilesForCase("case-storage-test")).resolves.toMatchObject({
      storageBackend: "memory",
      filesRemoved: 0
    });
  });

  it("sanitizes file names before creating case-scoped object keys", async () => {
    const receipt = await savePrivateFile({
      caseId: "case-with-weird-file",
      fileName: "../clinic note (final) #1.pdf",
      contentType: "application/pdf",
      bytes: new TextEncoder().encode("synthetic filename test").buffer
    });

    expect(receipt.objectKey).toMatch(/^cases\/case-with-weird-file\/[0-9a-f-]+-clinic-note-final-1\.pdf$/);
    expect(receipt.objectKey).not.toContain("..");
    expect(receipt.objectKey).not.toContain(" ");
    await deletePrivateFilesForCase("case-with-weird-file");
  });

  it("uploads to Supabase storage only when explicitly configured", async () => {
    vi.stubEnv("CLINICBRIEF_STORAGE_BACKEND", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co/");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-secret");
    vi.stubEnv("SUPABASE_STORAGE_BUCKET", "clinicbrief");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const receipt = await savePrivateFile({
      caseId: "case-supabase-upload",
      fileName: "clinic note.pdf",
      contentType: "application/pdf",
      bytes: new TextEncoder().encode("synthetic supabase file").buffer
    });

    expect(receipt.storageBackend).toBe("supabase");
    expect(receipt.fileUrl).toMatch(/^supabase:\/\/clinicbrief\/cases\/case-supabase-upload\//);
    expect(receipt.objectKey).toMatch(/^cases\/case-supabase-upload\/[0-9a-f-]+-clinic-note\.pdf$/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/^https:\/\/example\.supabase\.co\/storage\/v1\/object\/clinicbrief\/cases\/case-supabase-upload\//);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        apikey: "service-role-secret",
        authorization: "Bearer service-role-secret",
        "content-type": "application/pdf",
        "x-upsert": "false"
      })
    });
  });

  it("deletes Supabase case files by prefix and returns a cleanup receipt", async () => {
    vi.stubEnv("CLINICBRIEF_STORAGE_BACKEND", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-secret");
    vi.stubEnv("SUPABASE_STORAGE_BUCKET", "clinicbrief");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ name: "one.pdf" }, { name: "cases/case-supabase-delete/two.pdf" }]
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const receipt = await deletePrivateFilesForCase("case-supabase-delete");

    expect(receipt).toEqual({
      storageBackend: "supabase",
      objectPrefix: "cases/case-supabase-delete/",
      filesRemoved: 2
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://example.supabase.co/storage/v1/object/list/clinicbrief");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      prefix: "cases/case-supabase-delete/"
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://example.supabase.co/storage/v1/object/clinicbrief");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      prefixes: ["cases/case-supabase-delete/one.pdf", "cases/case-supabase-delete/two.pdf"]
    });
  });

  it("does not fake Supabase storage when credentials are absent", async () => {
    vi.stubEnv("CLINICBRIEF_STORAGE_BACKEND", "supabase");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      savePrivateFile({
        caseId: "case-missing-supabase-env",
        fileName: "clinic note.pdf",
        contentType: "application/pdf",
        bytes: new TextEncoder().encode("synthetic supabase config failure").buffer
      })
    ).rejects.toThrow("Supabase storage is selected but missing required env");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hashes text without exposing the source text", () => {
    expect(hashText("synthetic appointment note")).toHaveLength(64);
    expect(hashText("synthetic appointment note")).toBe(hashText("synthetic appointment note"));
  });
});
