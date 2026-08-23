import { describe, expect, it } from "vitest"
import {
  canAddVehicleImage,
  daysInInventory,
  describeVehicle,
  hasValidVinCheckDigit,
  isSupportedVehicleImageMimeType,
  isSupportedVehicleImageSize,
  isValidVehicleYear,
  isValidVinFormat,
  normalizeVin,
  vehicleImageExtensionFromMimeType,
} from "./domain"

// VIN de ejemplo con dígito verificador válido (posición 9 = "X"),
// tomado del ejemplo de referencia del estándar ISO 3779.
const VALID_VIN = "1M8GDM9AXKP042788"

describe("normalizeVin", () => {
  it("pasa a mayúsculas", () => {
    expect(normalizeVin("1m8gdm9axkp042788")).toBe(VALID_VIN)
  })

  it("quita espacios y guiones", () => {
    expect(normalizeVin(" 1M8 GDM9AX-KP042788 ")).toBe(VALID_VIN)
  })
})

describe("isValidVinFormat", () => {
  it("acepta un VIN de 17 caracteres alfanuméricos válidos", () => {
    expect(isValidVinFormat(VALID_VIN)).toBe(true)
  })

  it("rechaza un VIN de 15 caracteres", () => {
    expect(isValidVinFormat("1M8GDM9AXKP0427")).toBe(false)
  })

  it("rechaza un VIN que contiene la letra O", () => {
    expect(isValidVinFormat("1M8GDM9AOKP042788")).toBe(false)
  })

  it("rechaza un VIN que contiene la letra I", () => {
    expect(isValidVinFormat("1M8GDM9AIKP042788")).toBe(false)
  })

  it("rechaza un VIN que contiene la letra Q", () => {
    expect(isValidVinFormat("1M8GDM9AQKP042788")).toBe(false)
  })
})

describe("hasValidVinCheckDigit", () => {
  it("detecta un dígito verificador correcto", () => {
    expect(hasValidVinCheckDigit(VALID_VIN)).toBe(true)
  })

  it("detecta un dígito verificador incorrecto", () => {
    const withWrongCheckDigit = `${VALID_VIN.slice(0, 8)}1${VALID_VIN.slice(9)}`
    expect(hasValidVinCheckDigit(withWrongCheckDigit)).toBe(false)
  })

  it("devuelve false para un VIN con formato inválido, sin lanzar", () => {
    expect(hasValidVinCheckDigit("demasiado-corto")).toBe(false)
  })
})

describe("daysInInventory", () => {
  it("es 0 el mismo día de recepción", () => {
    const today = new Date("2026-08-19T22:00:00Z")
    const dateReceived = new Date("2026-08-19T05:00:00Z")
    expect(daysInInventory(dateReceived, today)).toBe(0)
  })

  it("es 1 al día siguiente", () => {
    const dateReceived = new Date("2026-08-19T00:00:00Z")
    const today = new Date("2026-08-20T00:00:00Z")
    expect(daysInInventory(dateReceived, today)).toBe(1)
  })

  it("cuenta correctamente a través de un cambio de mes", () => {
    const dateReceived = new Date("2026-08-30T00:00:00Z")
    const today = new Date("2026-09-02T00:00:00Z")
    expect(daysInInventory(dateReceived, today)).toBe(3)
  })

  it("nunca es negativo, aunque la fecha de recepción sea futura", () => {
    const dateReceived = new Date("2026-09-01T00:00:00Z")
    const today = new Date("2026-08-19T00:00:00Z")
    expect(daysInInventory(dateReceived, today)).toBe(0)
  })
})

describe("describeVehicle", () => {
  it("compone año, marca y modelo", () => {
    expect(describeVehicle({ year: 2020, makeName: "Toyota", modelName: "Corolla" })).toBe(
      "2020 Toyota Corolla",
    )
  })
})

describe("isValidVehicleYear", () => {
  const today = new Date("2026-08-19T00:00:00Z")

  it("rechaza un año anterior a 1950", () => {
    expect(isValidVehicleYear(1949, today)).toBe(false)
  })

  it("acepta 1950", () => {
    expect(isValidVehicleYear(1950, today)).toBe(true)
  })

  it("acepta el año siguiente al actual", () => {
    expect(isValidVehicleYear(2027, today)).toBe(true)
  })

  it("rechaza dos años después del actual", () => {
    expect(isValidVehicleYear(2028, today)).toBe(false)
  })
})

describe("vehicle image rules", () => {
  it("acepta MIME types soportados y rechaza otros", () => {
    expect(isSupportedVehicleImageMimeType("image/jpeg")).toBe(true)
    expect(isSupportedVehicleImageMimeType("image/png")).toBe(true)
    expect(isSupportedVehicleImageMimeType("application/pdf")).toBe(false)
  })

  it("deriva la extensión desde el MIME type", () => {
    expect(vehicleImageExtensionFromMimeType("image/jpeg")).toBe("jpg")
    expect(vehicleImageExtensionFromMimeType("image/webp")).toBe("webp")
    expect(vehicleImageExtensionFromMimeType("application/pdf")).toBeNull()
  })

  it("acepta tamaños positivos dentro del máximo y rechaza cero o mayores", () => {
    expect(isSupportedVehicleImageSize(1)).toBe(true)
    expect(isSupportedVehicleImageSize(10 * 1024 * 1024)).toBe(true)
    expect(isSupportedVehicleImageSize(0)).toBe(false)
    expect(isSupportedVehicleImageSize(10 * 1024 * 1024 + 1)).toBe(false)
  })

  it("solo permite agregar imágenes mientras no se alcance el límite", () => {
    expect(canAddVehicleImage(0)).toBe(true)
    expect(canAddVehicleImage(39)).toBe(true)
    expect(canAddVehicleImage(40)).toBe(false)
  })
})
