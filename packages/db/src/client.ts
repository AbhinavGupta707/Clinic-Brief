export type ClinicDataBackend = "memory" | "prisma";

export type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

type PrismaClientModule = {
  PrismaClient: new () => PrismaClientLike;
};

export function resolveClinicDataBackend(env: NodeJS.ProcessEnv = process.env): ClinicDataBackend {
  const configuredBackend = env.CLINICBRIEF_DATA_BACKEND?.trim().toLowerCase();

  if (configuredBackend === "prisma" || configuredBackend === "supabase" || configuredBackend === "postgres") {
    return "prisma";
  }

  return "memory";
}

export async function createClinicPrismaClient(): Promise<PrismaClientLike> {
  const runtimeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  const prismaModule = (await runtimeImport("@prisma/client")) as PrismaClientModule;
  return new prismaModule.PrismaClient();
}
