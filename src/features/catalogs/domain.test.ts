import { describe, expect, it } from "vitest"
import {
  canDeactivate,
  canModelLiveUnderMake,
  canReactivate,
  isUsableName,
  normalizeName,
} from "./domain"

describe("normalizeName", () => {
  it("colapsa mayúsculas y espacios de los extremos", () => {
    expect(normalizeName("  toyota ")).toBe(normalizeName("Toyota"))
    expect(normalizeName("Toyota")).toBe("toyota")
  })

  it("colapsa los espacios internos consecutivos", () => {
    expect(normalizeName("Land   Rover")).toBe(normalizeName("Land Rover"))
    expect(normalizeName("Land Rover")).toBe("land rover")
  })

  it("ignora los acentos", () => {
    expect(normalizeName("García")).toBe(normalizeName("Garcia"))
    expect(normalizeName("García Autos")).toBe("garcia autos")
  })

  it("ignora también otros diacríticos del español", () => {
    expect(normalizeName("Peña")).toBe(normalizeName("Pena"))
    expect(normalizeName("Citroën")).toBe(normalizeName("Citroen"))
  })

  it("no colapsa nombres distintos", () => {
    expect(normalizeName("Toyota")).not.toBe(normalizeName("Toyot"))
    expect(normalizeName("Ford")).not.toBe(normalizeName("Fords"))
    expect(normalizeName("Land Rover")).not.toBe(normalizeName("LandRover"))
  })

  it("es idempotente", () => {
    const once = normalizeName("  Land   ROVER ")
    expect(normalizeName(once)).toBe(once)
  })
})

describe("isUsableName", () => {
  it("rechaza la cadena vacía y la que es solo espacios", () => {
    expect(isUsableName("")).toBe(false)
    expect(isUsableName("   ")).toBe(false)
    expect(isUsableName("\t \n")).toBe(false)
  })

  it("acepta un nombre con contenido", () => {
    expect(isUsableName(" Toyota ")).toBe(true)
  })
})

describe("reglas de estado", () => {
  it("solo desactiva lo activo", () => {
    expect(canDeactivate({ isActive: true })).toBe(true)
    expect(canDeactivate({ isActive: false })).toBe(false)
  })

  it("solo reactiva lo desactivado", () => {
    expect(canReactivate({ isActive: false })).toBe(true)
    expect(canReactivate({ isActive: true })).toBe(false)
  })
})

describe("canModelLiveUnderMake", () => {
  it("exige que la marca exista", () => {
    expect(canModelLiveUnderMake(null)).toBe(false)
    expect(canModelLiveUnderMake(undefined)).toBe(false)
  })

  it("exige que la marca esté activa", () => {
    expect(canModelLiveUnderMake({ isActive: false })).toBe(false)
    expect(canModelLiveUnderMake({ isActive: true })).toBe(true)
  })
})
