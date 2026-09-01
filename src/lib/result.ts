import type { ZodError } from "zod"
import type { ActionResult } from "@/types/action-result"

/** Construye un resultado exitoso. */
export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

/** Construye un resultado de error, opcionalmente con errores por campo. */
export function fail<T = never>(
  error: string,
  fieldErrors?: Record<string, string[]>,
  values?: Record<string, unknown>,
): ActionResult<T> {
  return {
    ok: false,
    error,
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(values ? { values } : {}),
  }
}

/** Mapea un ZodError a `fieldErrors`: ruta del campo -> lista de mensajes. */
export function zodErrorToFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root"
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return fieldErrors
}

/** Construye un resultado de error a partir de un ZodError de validación. */
export function failFromZodError<T = never>(
  error: ZodError,
  message = "Los datos enviados no son válidos.",
  values?: Record<string, unknown>,
): ActionResult<T> {
  return fail(message, zodErrorToFieldErrors(error), values)
}

/** Agrega valores de formulario a un error recuperable sin alterar exitos. */
export function withFormValues<T>(
  result: ActionResult<T>,
  values: Record<string, unknown>,
): ActionResult<T> {
  return result.ok ? result : { ...result, values }
}

/**
 * Mensaje genérico para fallas inesperadas de infraestructura. El
 * detalle técnico se registra en el log del servidor, nunca llega
 * al navegador.
 */
export const GENERIC_SERVER_ERROR = "Ocurrió un error inesperado. Intenta de nuevo."

/** Registra el error técnico en el servidor y devuelve un resultado genérico. */
export function failFromUnknownError<T = never>(error: unknown, context: string): ActionResult<T> {
  console.error(`[${context}]`, error)
  return fail(GENERIC_SERVER_ERROR)
}
