import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
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
