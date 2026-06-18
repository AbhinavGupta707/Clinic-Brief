/** @type {import('next').NextConfig} */
const nextConfig = {
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
