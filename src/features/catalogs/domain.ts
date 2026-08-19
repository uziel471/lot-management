/**
 * Reglas puras de los catálogos: sin I/O, sin Mongoose, sin sesión.
 * Todo lo que se pueda decidir sin tocar la base vive aquí, y aquí es
 * donde se prueba (`domain.test.ts`).
 */

/** Longitud mínima y máxima del nombre de una entrada de catálogo. */
export const NAME_MIN_LENGTH = 2
export const NAME_MAX_LENGTH = 80

/**
 * Deriva la clave de unicidad de un nombre de catálogo.
 *
 * Recorta los extremos, colapsa los espacios internos consecutivos en
 * uno solo, normaliza a NFD, quita los diacríticos y pasa a
 * minúsculas. Es lo que hace que "Toyota", "toyota", "  Toyota " y
 * "Land   Rover" no puedan coexistir con "Land Rover".
 *
 * El pliegue de acentos tiene un costo aceptado: "Peña" y "Pena"
 * cuentan como el mismo nombre (ver design.md). El mensaje de rechazo
 * nombra la entrada existente, así que el caso raro es visible.
 *
 * El valor devuelto se guarda en `nameKey` y lo respalda un índice
 * único; `name` conserva siempre lo que el usuario capturó.
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** Un nombre es utilizable si, una vez normalizado, no queda vacío. */
export function isUsableName(name: string): boolean {
  return normalizeName(name).length > 0
}

/** Estado mínimo de una entrada de catálogo para las reglas de esta capa. */
export type CatalogEntryState = {
  isActive: boolean
}

/** Solo se desactiva lo que está activo. */
export function canDeactivate(entry: CatalogEntryState): boolean {
  return entry.isActive
}

/** Solo se reactiva lo que está desactivado. */
export function canReactivate(entry: CatalogEntryState): boolean {
  return !entry.isActive
}

/**
 * Un modelo solo puede vivir bajo una marca que exista y esté activa.
 * Vale tanto para el alta como para la reasignación: `null` (marca
 * inexistente) y marca inactiva se rechazan igual.
 */
export function canModelLiveUnderMake(make: CatalogEntryState | null | undefined): boolean {
  return Boolean(make?.isActive)
}
