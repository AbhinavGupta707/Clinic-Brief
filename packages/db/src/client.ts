import { PrismaClient } from "@prisma/client";

export type ClinicDataBackend = "memory" | "prisma";

export type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

export function resolveClinicDataBackend(env: NodeJS.ProcessEnv = process.env): ClinicDataBackend {
  const configuredBackend = env.CLINICBRIEF_DATA_BACKEND?.trim().toLowerCase();

  if (configuredBackend === "prisma" || configuredBackend === "supabase" || configuredBackend === "postgres") {
    return "prisma";
  }

  return "memory";
}

export async function createClinicPrismaClient(): Promise<PrismaClientLike> {
  return new PrismaClient();
}
