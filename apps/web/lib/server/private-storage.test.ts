import { describe, expect, it } from "vitest";

import { deletePrivateFilesForCase, hashText, savePrivateFile } from "./private-storage";

describe("private storage boundary", () => {
  it("stores files behind a private memory URL and deletes by case", async () => {
    const receipt = await savePrivateFile({
      caseId: "case-storage-test",
      fileName: "clinic note.pdf",
      contentType: "application/pdf",
      bytes: new TextEncoder().encode("synthetic private file").buffer
    });

    expect(receipt.fileUrl).toMatch(/^memory:\/\/clinicbrief\/case-storage-test\//);
    expect(receipt.sourceHash).toHaveLength(64);
    expect(deletePrivateFilesForCase("case-storage-test")).toBe(1);
    expect(deletePrivateFilesForCase("case-storage-test")).toBe(0);
  });

  it("hashes text without exposing the source text", () => {
    expect(hashText("synthetic appointment note")).toHaveLength(64);
    expect(hashText("synthetic appointment note")).toBe(hashText("synthetic appointment note"));
  });
});
