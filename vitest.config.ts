import path from "node:path"
import { defineConfig } from "vitest/config"

const alias = {
  "@": path.resolve(__dirname, "./src"),
  // `server-only` es un paquete marcador que resuelve el bundler de
  // Next, no `node_modules`. Sin este alias, cualquier test que
  // importe un `queries.ts` falla al resolverlo.
  "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
})
