/**
 * Contrato uniforme de retorno para toda operación de escritura
 * (Server Action). Nunca se lanza una excepción al cliente: siempre
 * se devuelve uno de estos dos casos.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
