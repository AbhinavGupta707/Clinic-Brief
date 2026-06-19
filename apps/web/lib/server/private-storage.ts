import { createHash, randomUUID } from "node:crypto";

type StoredPrivateFile = {
  caseId: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
  sourceHash: string;
  createdAt: string;
};

export type PrivateStorageReceipt = {
  fileUrl: string;
  sourceHash: string;
  storageBackend: "memory";
  objectKey: string;
};

declare global {
  // eslint-disable-next-line no-var
  var clinicBriefPrivateFiles: Map<string, StoredPrivateFile> | undefined;
}

const privateFiles = globalThis.clinicBriefPrivateFiles ?? new Map<string, StoredPrivateFile>();
globalThis.clinicBriefPrivateFiles = privateFiles;

export async function savePrivateFile(input: {
  caseId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
}): Promise<PrivateStorageReceipt> {
  const byteArray = new Uint8Array(input.bytes);
  const sourceHash = hashBytes(byteArray);
  const objectKey = `${input.caseId}/${randomUUID()}-${sanitizeFileName(input.fileName)}`;
  const fileUrl = `memory://clinicbrief/${objectKey}`;

  privateFiles.set(objectKey, {
    caseId: input.caseId,
    objectKey,
    fileName: input.fileName,
    contentType: input.contentType,
    bytes: byteArray,
    sourceHash,
    createdAt: new Date().toISOString()
  });

  return {
    fileUrl,
    sourceHash,
    storageBackend: "memory",
    objectKey
  };
}

export function deletePrivateFilesForCase(caseId: string): number {
  let removed = 0;

  for (const [objectKey, file] of privateFiles.entries()) {
    if (file.caseId === caseId) {
      privateFiles.delete(objectKey);
      removed += 1;
    }
  }

  return removed;
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  return sanitized || "uploaded-document";
}
