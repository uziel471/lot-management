/**
 * DTO serializables que devuelven las consultas de catálogo. Nunca se
 * pasa un documento de Mongoose a un Client Component
 * (ARCHITECTURE.md §6): las fechas viajan como ISO y los ObjectId
 * como cadenas.
 */

/** Claves internas de los cuatro catálogos (inglés, como el resto del código). */
export const CATALOG_KEYS = ["makes", "models", "vehicleStatuses", "vendors"] as const

export type CatalogKey = (typeof CATALOG_KEYS)[number]

export function isCatalogKey(value: unknown): value is CatalogKey {
  return typeof value === "string" && (CATALOG_KEYS as readonly string[]).includes(value)
}

/**
 * Una entrada de catálogo tal como la ve la UI. Los campos propios de
 * un solo catálogo van opcionales: el registro declara cuáles aplican
 * en cada caso, así que la tabla y el formulario nunca leen un campo
 * que su catálogo no tiene.
 */
export type CatalogEntryDTO = {
  id: string
  code: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deactivatedAt: string | null
  /** Modelos */
  makeId?: string
  makeName?: string
  /** Estatus de vehículo */
  sortOrder?: number
  description?: string | null
  /** Proveedores */
  phone?: string | null
  email?: string | null
  city?: string | null
  notes?: string | null
}

/**
 * Opción de un desplegable de captura. Es lo que van a consumir
 * vehículos (Fase 3) y compras (Fase 4): solo entradas activas.
 */
export type CatalogOption = {
  id: string
  code: string
  name: string
}
