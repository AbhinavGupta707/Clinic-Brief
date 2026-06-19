import { spawnSync } from "node:child_process";

const fallbackDatabaseUrl = "postgresql://clinicbrief:clinicbrief@localhost:5432/clinicbrief";

const commands = {
  generate: {
    args: ["exec", "prisma", "generate", "--schema", "prisma/schema.prisma"],
    allowFallbackUrl: true
  },
  validate: {
    args: ["exec", "prisma", "validate", "--schema", "prisma/schema.prisma"],
    allowFallbackUrl: true
  },
  push: {
    args: ["exec", "prisma", "db", "push", "--schema", "prisma/schema.prisma"],
    allowFallbackUrl: false
  },
  migrate: {
    args: ["exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    allowFallbackUrl: false
  }
};

const commandName = process.argv[2];
const command = commands[commandName];

if (!command) {
  console.error(`Unknown Prisma command: ${commandName ?? "(missing)"}`);
  process.exit(1);
}

if (!command.allowFallbackUrl && !process.env.DATABASE_URL) {
  console.error(`${commandName} requires DATABASE_URL. Set it to a Supabase/Postgres connection string and retry.`);
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || fallbackDatabaseUrl
};

const result = spawnSync("pnpm", command.args, {
  env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);
