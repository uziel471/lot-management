/**
 * Reglas puras de vehículos: sin I/O, sin Mongoose, sin sesión. Todo
 * lo que se pueda decidir sin tocar la base vive aquí, y aquí es
 * donde se prueba (`domain.test.ts`), conforme a la forma de feature
 * de ARCHITECTURE.md §2.
 */

export const VIN_LENGTH = 17

/** Letras que el estándar VIN excluye por confundirse con dígitos. */
const VIN_EXCLUDED_LETTERS = /[IOQ]/

/** Normaliza un VIN capturado: mayúsculas, sin espacios ni guiones. */
export function normalizeVin(vin: string): string {
  return vin.toUpperCase().replace(/[\s-]/g, "")
}

/**
 * Formato de un VIN ya normalizado: 17 caracteres alfanuméricos que no
 * incluyan `I`, `O` ni `Q`.
 */
export function isValidVinFormat(vin: string): boolean {
  if (vin.length !== VIN_LENGTH) return false
  if (VIN_EXCLUDED_LETTERS.test(vin)) return false
  return /^[A-Z0-9]+$/.test(vin)
}

/**
 * Tabla de transliteración y pesos del dígito verificador ISO 3779
 * (posición 9). El dígito verificador se calcula pero solo para
 * advertir (ver design.md, "VIN: formato estricto, dígito verificador
 * advertido"): nunca bloquea el guardado.
 */
const TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
}

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
const CHECK_DIGIT_POSITION = 8 // índice base 0 de la posición 9

function transliterate(char: string): number {
  if (/[0-9]/.test(char)) return Number(char)
  return TRANSLITERATION[char] ?? 0
}

/**
 * Verifica el dígito de control de un VIN de formato válido. Solo
 * tiene sentido invocarla sobre un VIN que ya pasó
 * `isValidVinFormat`; con uno de otra longitud devuelve `false`.
 */
export function hasValidVinCheckDigit(vin: string): boolean {
  if (!isValidVinFormat(vin)) return false

  let sum = 0
  for (let i = 0; i < vin.length; i++) {
    sum += transliterate(vin[i]!) * WEIGHTS[i]!
  }
  const remainder = sum % 11
  const expected = remainder === 10 ? "X" : String(remainder)

  return vin[CHECK_DIGIT_POSITION] === expected
}

/** Trunca una fecha a medianoche UTC, para comparar solo el día calendario. */
function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Días en inventario: la diferencia en días calendario entre la fecha
 * de recepción y "hoy". Función pura —recibe "hoy" como parámetro— para
 * que sea determinista en pruebas. Nunca se almacena (ver
 * proposal.md): se calcula siempre al consultar.
 */
export function daysInInventory(dateReceived: Date, today: Date): number {
  const diff = startOfUtcDay(today) - startOfUtcDay(dateReceived)
  return Math.max(0, Math.round(diff / MS_PER_DAY))
}

/**
 * Descripción corta del vehículo: año, marca y modelo. Es lo que en la
 * hoja de cálculo era la columna calculada `vehicle_desc`.
 */
export function describeVehicle({
  year,
  makeName,
  modelName,
}: {
  year: number
  makeName: string
  modelName: string
}): string {
  return [String(year), makeName, modelName].filter(Boolean).join(" ").trim()
}

export const MIN_VEHICLE_YEAR = 1950

/** Año más alto admitido: el siguiente al actual (modelos de año próximo). */
export function maxVehicleYear(today: Date): number {
  return today.getUTCFullYear() + 1
}

/** Un año de vehículo está dentro del rango admitido. */
export function isValidVehicleYear(year: number, today: Date): boolean {
  return Number.isInteger(year) && year >= MIN_VEHICLE_YEAR && year <= maxVehicleYear(today)
}

export const VEHICLE_IMAGE_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const VEHICLE_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const VEHICLE_IMAGE_MAX_BYTES_MB = 10
export const VEHICLE_IMAGE_MAX_ACTIVE = 40
export const VEHICLE_IMAGE_ACCEPT = VEHICLE_IMAGE_ALLOWED_MIME_TYPES.join(",")

const VEHICLE_IMAGE_EXTENSION_BY_MIME_TYPE: Record<(typeof VEHICLE_IMAGE_ALLOWED_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function isSupportedVehicleImageMimeType(
  mimeType: string,
): mimeType is (typeof VEHICLE_IMAGE_ALLOWED_MIME_TYPES)[number] {
  return VEHICLE_IMAGE_ALLOWED_MIME_TYPES.includes(
    mimeType as (typeof VEHICLE_IMAGE_ALLOWED_MIME_TYPES)[number],
  )
}

export function vehicleImageExtensionFromMimeType(mimeType: string): string | null {
  if (!isSupportedVehicleImageMimeType(mimeType)) return null
  return VEHICLE_IMAGE_EXTENSION_BY_MIME_TYPE[mimeType]
}

export function isSupportedVehicleImageSize(byteSize: number): boolean {
  return Number.isInteger(byteSize) && byteSize > 0 && byteSize <= VEHICLE_IMAGE_MAX_BYTES
}

export function canAddVehicleImage(activeImages: number): boolean {
  return activeImages < VEHICLE_IMAGE_MAX_ACTIVE
}

export function vehicleImageRulesDescription() {
  return `JPEG, PNG o WebP · máximo ${VEHICLE_IMAGE_MAX_BYTES_MB} MB · hasta ${VEHICLE_IMAGE_MAX_ACTIVE} imágenes activas`
}
