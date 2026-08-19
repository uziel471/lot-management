/**
 * `server-only` es un paquete marcador que Next resuelve en su propio
 * bundler (`next/dist/compiled/server-only`) y que no existe en
 * `node_modules` como dependencia del proyecto. Bajo Vitest no hay
 * bundler que lo resuelva, así que `vitest.config.ts` apunta el
 * import a este módulo vacío.
 *
 * No debilita nada: la garantía de que un `queries.ts` no llegue al
 * cliente la da el build de Next, no los tests.
 */
export {}
