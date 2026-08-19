/** Convierte un header `set-cookie` de una respuesta en un header `cookie` para la siguiente petición. */
export function setCookieToCookieHeader(setCookieHeader: string | null): string {
  if (!setCookieHeader) return ""
  return setCookieHeader
    .split(/,(?=[^;]+?=)/)
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ")
}
