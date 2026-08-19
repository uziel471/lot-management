import { describe, expect, it } from "vitest"
import { nextCode } from "@/lib/db/counters"

describe("nextCode", () => {
  it("entrega PUR-0001 como primer código de una secuencia", async () => {
    const code = await nextCode("PUR")
    expect(code).toBe("PUR-0001")
  })

  it("entrega cien códigos concurrentes distintos y consecutivos, sin huecos ni repeticiones", async () => {
    const codes = await Promise.all(Array.from({ length: 100 }, () => nextCode("VEH")))
    const sequenceNumbers = codes
      .map((code) => Number(code.split("-")[1]))
      .sort((a, b) => a - b)

    expect(new Set(codes).size).toBe(100)
    expect(sequenceNumbers).toEqual(Array.from({ length: 100 }, (_, i) => i + 1))
  })

  it("mantiene secuencias independientes por prefijo", async () => {
    await nextCode("PUR")
    await nextCode("PUR")
    await nextCode("PUR")

    const vehCode = await nextCode("VEH")
    expect(vehCode).toBe("VEH-0001")
  })

  it("desborda a cinco dígitos sin truncar", async () => {
    for (let i = 0; i < 9999; i++) {
      await nextCode("BIG")
    }
    const overflowCode = await nextCode("BIG")
    expect(overflowCode).toBe("BIG-10000")
  })
})
