import type { Money } from "@/types/money"
import type {
  BodyStyle,
  Drivetrain,
  FuelType,
  MileageUnit,
  TitleStatus,
  Transmission,
} from "./enums"

/**
 * DTO serializables de vehículos. Nunca se pasa un documento de
 * Mongoose a un Client Component (ARCHITECTURE.md §6): las fechas
 * viajan como ISO y los ObjectId como cadenas.
 */

export type StatusHistoryEntryDTO = {
  previousStatusId: string | null
  previousStatusName: string | null
  newStatusId: string
  newStatusName: string
  changedBy: string
  changedByName: string | null
  changedAt: string
}

/** Fila del listado de inventario. */
export type VehicleListItemDTO = {
  id: string
  code: string
  description: string
  makeId: string
  makeName: string
  modelId: string
  modelName: string
  year: number
  vin: string | null
  stockNumber: string | null
  statusId: string
  statusName: string
  statusSortOrder: number
  daysInInventory: number
  askingPrice: Money | null
  dateReceived: string
  titleInHand: boolean
  isVoided: boolean
}

/** Ficha completa de detalle. */
export type VehicleDetailDTO = VehicleListItemDTO & {
  trim: string | null
  bodyStyle: BodyStyle | null
  exteriorColor: string | null
  interiorColor: string | null
  mileage: number | null
  mileageUnit: MileageUnit | null
  transmission: Transmission | null
  fuelType: FuelType | null
  drivetrain: Drivetrain | null
  titleStatus: TitleStatus | null
  titleNumber: string | null
  dateListed: string | null
  lotLocation: string | null
  notes: string | null
  statusHistory: StatusHistoryEntryDTO[]
  vinCheckDigitWarning: boolean
  createdBy: string
  createdByName: string | null
  updatedBy: string
  updatedByName: string | null
  createdAt: string
  updatedAt: string
  voidedAt: string | null
  voidedBy: string | null
  voidReason: string | null
}

/** Opción de vehículo para los desplegables de compras y reparaciones (Fase 4). */
export type VehicleOption = {
  id: string
  code: string
  description: string
}

export type VehicleFilters = {
  statusId?: string
  makeId?: string
  dateReceivedFrom?: Date
  dateReceivedTo?: Date
  search?: string
  includeVoided?: boolean
}
