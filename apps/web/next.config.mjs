import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: [
    "@clinicbrief/ai",
    "@clinicbrief/documents",
    "@clinicbrief/events",
    "@clinicbrief/exports",
    "@clinicbrief/fixtures",
    "@clinicbrief/types"
  ]
};

export default nextConfig;
