import { describe, expect, it } from "vitest"
import { MoneyError, addMoney, convertToUsd, formatMoney, fromMinorUnits, sumMoney, toMinorUnits } from "./money"

describe("toMinorUnits", () => {
  it("captura 12,345.67 como 1234567 unidades menores", () => {
    expect(toMinorUnits(12345.67)).toBe(1234567)
  })
})

describe("fromMinorUnits", () => {
  it("es la inversa de toMinorUnits", () => {
    expect(fromMinorUnits(1234567)).toBeCloseTo(12345.67, 10)
  })
})

describe("addMoney / sumMoney", () => {
  it("suma ocho componentes sin error de redondeo de punto flotante", () => {
    // Estos ocho valores decimales producen error si se suman como
    // `number` de punto flotante (0.1 + 0.2 !== 0.3, etc).
    const decimalComponents = [10.1, 20.2, 30.3, 5.05, 15.15, 25.25, 8.08, 12.12]
    const components = decimalComponents.map((value) => ({
      amount: toMinorUnits(value),
      currency: "USD" as const,
    }))
    const total = sumMoney(components)

    const expectedCents = decimalComponents.reduce((sum, value) => sum + Math.round(value * 100), 0)
    expect(total.amount).toBe(expectedCents)
    expect(total.currency).toBe("USD")
  })

  it("rechaza sumar monedas distintas", () => {
    expect(() =>
      addMoney({ amount: 100, currency: "USD" }, { amount: 100, currency: "MXN" }),
    ).toThrow(MoneyError)
  })
})

describe("convertToUsd", () => {
  it("convierte 370,000.00 MXN con tipo de cambio 18.50 a 20,000.00 USD", () => {
    const mxn = { amount: toMinorUnits(370000), currency: "MXN" as const }
    const usd = convertToUsd(mxn, "18.50")
    expect(usd.currency).toBe("USD")
    expect(usd.amount).toBe(toMinorUnits(20000))
  })

  it("el equivalente en USD de un importe en USD es el importe original, con tipo de cambio 1", () => {
    const usd = { amount: toMinorUnits(500), currency: "USD" as const }
    const result = convertToUsd(usd, "1")
    expect(result.amount).toBe(usd.amount)
  })

  it("rechaza tipo de cambio 0", () => {
    const mxn = { amount: toMinorUnits(1000), currency: "MXN" as const }
    expect(() => convertToUsd(mxn, "0")).toThrow(MoneyError)
  })

  it("rechaza tipo de cambio negativo", () => {
    const mxn = { amount: toMinorUnits(1000), currency: "MXN" as const }
    expect(() => convertToUsd(mxn, "-18.5")).toThrow(MoneyError)
  })

  it("redondea al centavo (medio centavo hacia arriba)", () => {
    // 1 centavo MXN / 4 = 0.0025 USD -> redondea a 0 centavos si <0.5, aquí probamos exactitud de medio centavo
    const mxn = { amount: 1, currency: "MXN" as const }
    const usd = convertToUsd(mxn, "2")
    // 1 / 2 = 0.5 -> redondea hacia arriba (half away from zero) a 1
    expect(usd.amount).toBe(1)
  })
})

describe("formatMoney", () => {
  it("incluye el código de moneda en el texto formateado", () => {
    const formatted = formatMoney({ amount: toMinorUnits(1234.5), currency: "USD" })
    expect(formatted).toContain("USD")
    expect(formatted).toContain("1,234.50")
  })
})
