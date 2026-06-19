import { resolveClinicDataBackend } from "@clinicbrief/db";

import { createMemoryClinicRepository } from "./memory";
import { createPrismaClinicRepository } from "./prisma";
import type { ClinicRepository } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var clinicBriefRepository: ClinicRepository | undefined;
}

export async function getClinicRepository(): Promise<ClinicRepository> {
  const backend = resolveClinicDataBackend();
  const cached = globalThis.clinicBriefRepository;

  if (cached && cached.backend === backend) {
    return cached;
  }

  const repository = backend === "prisma" ? await createPrismaClinicRepository() : createMemoryClinicRepository();
  globalThis.clinicBriefRepository = repository;
  return repository;
}

export * from "./factories";
export type * from "./types";
