import type { NextConfig } from "next"

const projectRoot = process.cwd()

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  allowedDevOrigins: ["192.168.1.90", "192.168.1.90:3000", "192.168.1.90:3001"],
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      // Next 16 conserva un límite por defecto de 1 MB en Server Actions.
      bodySizeLimit: "12mb",
    },
    // Habilita unauthorized() / forbidden() y sus boundaries
    // (src/app/unauthorized.tsx), usados por requireRole() en dal.ts.
    authInterrupts: true,
  },
}

export default nextConfig
