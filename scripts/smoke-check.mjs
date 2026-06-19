import { spawnSync } from "node:child_process";

const smokeName = process.argv[2] ?? "memory";

const checks = {
  memory: "Checks the no-credential memory repository and private memory storage fallback.",
  ai: "Checks Fireworks readiness when credentials are present; otherwise confirms deterministic fallback.",
  db: "Checks Prisma readiness when DATABASE_URL is present; otherwise confirms memory fallback.",
  storage: "Checks Supabase storage readiness when selected; otherwise confirms private memory fallback.",
  full: "Reserved for the final integration smoke after provider-backed workstreams land."
};

if (!(smokeName in checks)) {
  console.error(`Unknown smoke check: ${smokeName}`);
  process.exit(1);
}

console.log(`clinicbrief smoke:${smokeName}`);
console.log(checks[smokeName]);

if (smokeName === "db") {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set, so live Prisma/Postgres smoke is skipped.");
    console.log("Memory remains the default backend for normal build/test.");
    process.exit(0);
  }

  const result = spawnSync("pnpm", ["--filter", "@clinicbrief/db", "smoke:live"], {
    env: process.env,
    stdio: "inherit"
  });
  process.exit(result.status ?? 1);
}

console.log("Placeholder contract is installed. Run pnpm typecheck, lint, test, and build for executable verification.");
