import type { Model, Types } from "mongoose"
import type { ZodType } from "zod"
import { Make } from "@/lib/db/models/make"
import { VehicleModel } from "@/lib/db/models/model"
import { VehicleStatus } from "@/lib/db/models/vehicle-status"
import { Vendor } from "@/lib/db/models/vendor"
import { makeSchema, modelSchema, vehicleStatusSchema, vendorSchema } from "./schema"
import { CATALOG_KEYS, type CatalogKey } from "./types"

/**
 * El registro es la declaración de los cuatro catálogos: qué colección
 * usan, con qué prefijo de código, qué esquema los valida, cómo se
 * llaman en la interfaz y qué columnas y campos muestran.
 *
 * `actions.ts` y `queries.ts` trabajan contra esta declaración en vez
 * de repetir cuatro veces el mismo 90 % de comportamiento. El límite
 * de la abstracción es explícito (ver design.md): si un catálogo
 * necesitara una regla que no se pueda declarar aquí, se saca del
 * registro y se le da su propia feature. La señal de alarma es el
 * segundo `if (catalogKey === ...)` dentro de `actions.ts`.
 *
 * Este módulo importa los modelos de Mongoose, así que solo se usa
 * desde el servidor. Lo que la UI necesita —etiquetas, columnas y
 * campos— es dato plano y viaja como props a los Client Components.
 */

/**
 * Forma común de un documento de catálogo. Cada modelo tiene su tipo
 * inferido propio; el núcleo genérico los maneja a todos con esta
 * vista única, y el registro hace la conversión en un solo lugar.
 */
export interface CatalogDocument {
  _id: Types.ObjectId
  code: string
  name: string
  nameKey: string
  isActive: boolean
  createdBy: Types.ObjectId
  updatedBy: Types.ObjectId
  deactivatedAt: Date | null
  deactivatedBy: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
  /** Modelos */
  makeId?: Types.ObjectId
  /** Estatus de vehículo */
  sortOrder?: number
  description?: string | null
  /** Proveedores */
  phone?: string | null
  email?: string | null
  city?: string | null
  notes?: string | null
}

export type CatalogModel = Model<CatalogDocument>

/** Tipo de control con el que se captura un campo propio del catálogo. */
export type CatalogFieldType = "text" | "email" | "number" | "textarea" | "make"

export type CatalogFieldDef = {
  name: string
  label: string
  type: CatalogFieldType
  required: boolean
  placeholder?: string
  helpText?: string
}

export type CatalogColumnDef = {
  /** Clave del DTO que se muestra, o `status` para el indicador de estado. */
  key: string
  label: string
  numeric?: boolean
}

/** Metadatos serializables: es lo único que cruza al cliente. */
export type CatalogMeta = {
  key: CatalogKey
  /** Segmento de la URL, en español (ARCHITECTURE.md §6). */
  routeKey: string
  singular: string
  plural: string
  description: string
  newEntryLabel: string
  searchPlaceholder: string
  emptyDescription: string
  filteredEmptyDescription: string
  formDescription: string
  columns: CatalogColumnDef[]
  fields: CatalogFieldDef[]
}

export type CatalogDefinition = CatalogMeta & {
  codePrefix: string
  model: CatalogModel
  schema: ZodType
  /** Orden por defecto del listado de administración. */
  defaultSort: Record<string, 1 | -1>
}

const NAME_FIELD: CatalogFieldDef = {
  name: "name",
  label: "Nombre",
  type: "text",
  required: true,
}

const CODE_COLUMN: CatalogColumnDef = { key: "code", label: "Código" }
const NAME_COLUMN: CatalogColumnDef = { key: "name", label: "Nombre" }
const STATUS_COLUMN: CatalogColumnDef = { key: "status", label: "Estado" }

const definitions: Record<CatalogKey, CatalogDefinition> = {
  makes: {
    key: "makes",
    routeKey: "marcas",
    singular: "Marca",
    plural: "Marcas",
    description:
      "Administra las marcas que habilitan la captura y mantienen visible el contexto operativo de sus modelos.",
    newEntryLabel: "Nueva marca",
    searchPlaceholder: "Buscar por código o nombre",
    emptyDescription:
      "Da de alta la primera marca para habilitar la captura de modelos y vehículos.",
    filteredEmptyDescription:
      "Ajusta o limpia los filtros para volver a ver las marcas disponibles.",
    formDescription:
      "Registra la marca tal como debe aparecer en los catálogos operativos.",
    codePrefix: "MAKE",
    model: Make as unknown as CatalogModel,
    schema: makeSchema,
    defaultSort: { name: 1 },
    columns: [CODE_COLUMN, NAME_COLUMN, STATUS_COLUMN],
    fields: [NAME_FIELD],
  },
  models: {
    key: "models",
    routeKey: "modelos",
    singular: "Modelo",
    plural: "Modelos",
    description:
      "Cada modelo pertenece a una marca activa. Usa esta vista para mantener visible esa dependencia.",
    newEntryLabel: "Nuevo modelo",
    searchPlaceholder: "Buscar por código, modelo o marca",
    emptyDescription:
      "Primero activa una marca y después registra sus modelos para que aparezcan en captura.",
    filteredEmptyDescription:
      "Ajusta o limpia los filtros para volver a ver los modelos disponibles.",
    formDescription:
      "Selecciona una marca activa y registra el modelo dentro de ese contexto.",
    codePrefix: "MODEL",
    model: VehicleModel as unknown as CatalogModel,
    schema: modelSchema,
    defaultSort: { name: 1 },
    columns: [CODE_COLUMN, NAME_COLUMN, { key: "makeName", label: "Marca" }, STATUS_COLUMN],
    fields: [
      { name: "makeId", label: "Marca", type: "make", required: true },
      NAME_FIELD,
    ],
  },
  vehicleStatuses: {
    key: "vehicleStatuses",
    routeKey: "estatus",
    singular: "Estatus",
    plural: "Estatus de vehículo",
    description:
      "Las etapas por las que pasa un vehículo. El orden manda sobre el código: deja huecos para poder intercalar.",
    newEntryLabel: "Nuevo estatus",
    searchPlaceholder: "Buscar por orden, código o nombre",
    emptyDescription:
      "Registra el primer estatus para empezar a ordenar el flujo operativo del vehículo.",
    filteredEmptyDescription:
      "Ajusta o limpia los filtros para volver a ver los estatus disponibles.",
    formDescription:
      "Define el nombre operativo, el orden explícito y la descripción opcional del estatus.",
    codePrefix: "STATUS",
    model: VehicleStatus as unknown as CatalogModel,
    schema: vehicleStatusSchema,
    defaultSort: { sortOrder: 1, name: 1 },
    columns: [
      { key: "sortOrder", label: "Orden", numeric: true },
      CODE_COLUMN,
      NAME_COLUMN,
      { key: "description", label: "Descripción" },
      STATUS_COLUMN,
    ],
    fields: [
      NAME_FIELD,
      {
        name: "sortOrder",
        label: "Orden",
        type: "number",
        required: true,
        helpText: "De 10 en 10, para poder intercalar después sin renumerar.",
      },
      {
        name: "description",
        label: "Descripción",
        type: "textarea",
        required: false,
        placeholder: "Cuándo aplicar este estatus",
      },
    ],
  },
  vendors: {
    key: "vendors",
    routeKey: "proveedores",
    singular: "Proveedor",
    plural: "Proveedores",
    description:
      "Mantiene visibles los proveedores y sus datos de contacto para compras y seguimiento operativo.",
    newEntryLabel: "Nuevo proveedor",
    searchPlaceholder: "Buscar por código, nombre o contacto",
    emptyDescription:
      "Registra el primer proveedor para usarlo en el flujo de compras.",
    filteredEmptyDescription:
      "Ajusta o limpia los filtros para volver a ver los proveedores disponibles.",
    formDescription:
      "Captura el nombre y los datos de contacto que hagan falta para compras y seguimiento.",
    codePrefix: "VEND",
    model: Vendor as unknown as CatalogModel,
    schema: vendorSchema,
    defaultSort: { name: 1 },
    columns: [
      CODE_COLUMN,
      NAME_COLUMN,
      { key: "contact", label: "Contacto" },
      { key: "city", label: "Ciudad" },
      STATUS_COLUMN,
    ],
    fields: [
      NAME_FIELD,
      { name: "phone", label: "Teléfono", type: "text", required: false },
      { name: "email", label: "Correo", type: "email", required: false },
      { name: "city", label: "Ciudad", type: "text", required: false },
      { name: "notes", label: "Notas", type: "textarea", required: false },
    ],
  },
}

/** Definición completa de un catálogo. Lanza si la clave no existe. */
export function getCatalog(key: CatalogKey): CatalogDefinition {
  return definitions[key]
}

/** Todas las definiciones, en el orden en que se presentan en el índice. */
export function listCatalogs(): CatalogDefinition[] {
  return CATALOG_KEYS.map((key) => definitions[key])
}

/** Traduce el segmento en español de la URL a la clave interna. */
export function catalogKeyFromRoute(routeKey: string): CatalogKey | null {
  const found = CATALOG_KEYS.find((key) => definitions[key].routeKey === routeKey)
  return found ?? null
}

/** Los metadatos serializables que se pasan a los Client Components. */
export function toCatalogMeta(definition: CatalogDefinition): CatalogMeta {
  return {
    key: definition.key,
    routeKey: definition.routeKey,
    singular: definition.singular,
    plural: definition.plural,
    description: definition.description,
    newEntryLabel: definition.newEntryLabel,
    searchPlaceholder: definition.searchPlaceholder,
    emptyDescription: definition.emptyDescription,
    filteredEmptyDescription: definition.filteredEmptyDescription,
    formDescription: definition.formDescription,
    columns: definition.columns,
    fields: definition.fields,
  }
}
