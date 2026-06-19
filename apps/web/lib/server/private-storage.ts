import { createHash, randomUUID } from "node:crypto";

type StorageBackend = "memory" | "supabase";

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
  storageBackend: StorageBackend;
  objectKey: string;
};

export type PrivateStorageDeleteReceipt = {
  storageBackend: StorageBackend;
  objectPrefix: string;
  filesRemoved: number;
};

declare global {
  // eslint-disable-next-line no-var
  var clinicBriefPrivateFiles: Map<string, StoredPrivateFile> | undefined;
}

const privateFiles = globalThis.clinicBriefPrivateFiles ?? new Map<string, StoredPrivateFile>();
globalThis.clinicBriefPrivateFiles = privateFiles;

const storageBackendEnv = "CLINICBRIEF_STORAGE_BACKEND";
const supabaseUrlEnv = "NEXT_PUBLIC_SUPABASE_URL";
const supabaseServiceRoleKeyEnv = "SUPABASE_SERVICE_ROLE_KEY";
const supabaseStorageBucketEnv = "SUPABASE_STORAGE_BUCKET";

export async function savePrivateFile(input: {
  caseId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
}): Promise<PrivateStorageReceipt> {
  const byteArray = new Uint8Array(input.bytes);
  const sourceHash = hashBytes(byteArray);
  const objectKey = makeCaseObjectKey(input.caseId, input.fileName);
  const backend = getSelectedStorageBackend();

  if (backend === "supabase") {
    const config = getSupabaseStorageConfig();
    await uploadSupabaseObject({
      config,
      objectKey,
      contentType: input.contentType,
      bytes: byteArray
    });

    return {
      fileUrl: `supabase://${config.bucket}/${objectKey}`,
      sourceHash,
      storageBackend: "supabase",
      objectKey
    };
  }

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

export async function deletePrivateFilesForCase(caseId: string): Promise<PrivateStorageDeleteReceipt> {
  const objectPrefix = makeCaseObjectPrefix(caseId);
  const backend = getSelectedStorageBackend();

  if (backend === "supabase") {
    const filesRemoved = await deleteSupabaseObjectsByPrefix(getSupabaseStorageConfig(), objectPrefix);

    return {
      storageBackend: "supabase",
      objectPrefix,
      filesRemoved
    };
  }

  let removed = 0;

  for (const [objectKey, file] of privateFiles.entries()) {
    if (file.caseId === caseId || objectKey.startsWith(objectPrefix)) {
      privateFiles.delete(objectKey);
      removed += 1;
    }
  }

  return {
    storageBackend: "memory",
    objectPrefix,
    filesRemoved: removed
  };
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).filter(Boolean).pop() ?? "";
  const sanitized = baseName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return sanitized || "uploaded-document";
}

function makeCaseObjectKey(caseId: string, fileName: string): string {
  return `${makeCaseObjectPrefix(caseId)}${randomUUID()}-${sanitizeFileName(fileName)}`;
}

function makeCaseObjectPrefix(caseId: string): string {
  return `cases/${sanitizePathSegment(caseId)}/`;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
  return sanitized || "unknown-case";
}

function getSelectedStorageBackend(env: NodeJS.ProcessEnv = process.env): StorageBackend {
  const configured = env[storageBackendEnv]?.trim().toLowerCase();

  if (!configured || configured === "memory") {
    return "memory";
  }

  if (configured === "supabase") {
    return "supabase";
  }

  throw new Error(`${storageBackendEnv} must be memory or supabase.`);
}

type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

function getSupabaseStorageConfig(env: NodeJS.ProcessEnv = process.env): SupabaseStorageConfig {
  const url = env[supabaseUrlEnv]?.trim();
  const serviceRoleKey = env[supabaseServiceRoleKeyEnv]?.trim();
  const bucket = env[supabaseStorageBucketEnv]?.trim();
  const missing = [
    [supabaseUrlEnv, url],
    [supabaseServiceRoleKeyEnv, serviceRoleKey],
    [supabaseStorageBucketEnv, bucket]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (!url || !serviceRoleKey || !bucket || missing.length > 0) {
    throw new Error(`Supabase storage is selected but missing required env: ${missing.join(", ")}`);
  }

  return {
    url: normalizeSupabaseUrl(url),
    serviceRoleKey,
    bucket
  };
}

async function uploadSupabaseObject(input: {
  config: SupabaseStorageConfig;
  objectKey: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<void> {
  const body = input.bytes.buffer.slice(input.bytes.byteOffset, input.bytes.byteOffset + input.bytes.byteLength) as BodyInit;
  const response = await fetch(`${input.config.url}/storage/v1/object/${encodePath(input.config.bucket)}/${encodeObjectKey(input.objectKey)}`, {
    method: "POST",
    headers: supabaseHeaders(input.config, {
      "content-type": input.contentType || "application/octet-stream",
      "x-upsert": "false"
    }),
    body
  });

  if (!response.ok) {
    throw new Error(`Supabase storage upload failed with status ${response.status}.`);
  }
}

async function deleteSupabaseObjectsByPrefix(config: SupabaseStorageConfig, objectPrefix: string): Promise<number> {
  const objectKeys = await listSupabaseObjectsByPrefix(config, objectPrefix);

  if (objectKeys.length === 0) {
    return 0;
  }

  const response = await fetch(`${config.url}/storage/v1/object/${encodePath(config.bucket)}`, {
    method: "DELETE",
    headers: supabaseHeaders(config, {
      "content-type": "application/json"
    }),
    body: JSON.stringify({ prefixes: objectKeys })
  });

  if (!response.ok) {
    throw new Error(`Supabase storage delete failed with status ${response.status}.`);
  }

  return objectKeys.length;
}

async function listSupabaseObjectsByPrefix(config: SupabaseStorageConfig, objectPrefix: string): Promise<string[]> {
  const pageSize = 1000;
  const objectKeys: string[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(`${config.url}/storage/v1/object/list/${encodePath(config.bucket)}`, {
      method: "POST",
      headers: supabaseHeaders(config, {
        "content-type": "application/json"
      }),
      body: JSON.stringify({
        prefix: objectPrefix,
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" }
      })
    });

    if (!response.ok) {
      throw new Error(`Supabase storage list failed with status ${response.status}.`);
    }

    const objects = await response.json();

    if (!Array.isArray(objects) || objects.length === 0) {
      return objectKeys;
    }

    objectKeys.push(...objects.map((object) => parseSupabaseObjectKey(object, objectPrefix)).filter((key): key is string => Boolean(key)));

    if (objects.length < pageSize) {
      return objectKeys;
    }
  }
}

function parseSupabaseObjectKey(object: unknown, objectPrefix: string): string | null {
  if (!object || typeof object !== "object" || !("name" in object) || typeof object.name !== "string") {
    return null;
  }

  if (object.name.startsWith(objectPrefix)) {
    return object.name;
  }

  return `${objectPrefix}${object.name}`;
}

function supabaseHeaders(config: SupabaseStorageConfig, extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
    ...extra
  };
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/+$/g, "");
}

function encodePath(segment: string): string {
  return encodeURIComponent(segment);
}

function encodeObjectKey(objectKey: string): string {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}
