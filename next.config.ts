import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // Habilita unauthorized() / forbidden() y sus boundaries
    // (src/app/unauthorized.tsx), usados por requireRole() en dal.ts.
    authInterrupts: true,
  },
};

export default nextConfig;
