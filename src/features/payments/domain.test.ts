import { describe, expect, it } from "vitest"
import { MoneyError } from "@/lib/money"
import {
  assertApplicationsMatchPaymentAmount,
  assertNoOverpayment,
  calculatePaidAndPending,
  paymentStatus,
  paymentTotalUsd,
  sumApplications,
} from "./domain"

describe("paymentTotalUsd", () => {
  it("mantiene pagos en USD con tipo de cambio 1", () => {
    expect(paymentTotalUsd(10_000, "USD", "1")).toEqual({ amount: 10_000, currency: "USD" })
  })

  it("convierte MXN a USD con el tipo de cambio capturado", () => {
    expect(paymentTotalUsd(370_000_00, "MXN", "18.50")).toEqual({ amount: 2_000_000, currency: "USD" })
  })
})

describe("applications", () => {
  it("suma aplicaciones en centavos de la moneda del pago", () => {
    expect(sumApplications([{ appliedAmount: 1_000 }, { appliedAmount: 2_500 }])).toBe(3_500)
  })

  it("rechaza desajuste entre monto y aplicaciones", () => {
    expect(() =>
      assertApplicationsMatchPaymentAmount(
        { amount: 5_000, currency: "USD", exchangeRate: "1" },
        [{ appliedAmount: 4_999 }],
      ),
    ).toThrow("La suma de las aplicaciones")
  })
})

describe("balances", () => {
  it("calcula pago parcial", () => {
    expect(calculatePaidAndPending(10_000, [{ appliedUsd: 4_000 }])).toEqual({
      paidUsd: { amount: 4_000, currency: "USD" },
      pendingUsd: { amount: 6_000, currency: "USD" },
    })
    expect(paymentStatus(10_000, [{ appliedUsd: 4_000 }])).toBe("partial")
  })

  it("calcula liquidación exacta", () => {
    expect(paymentStatus(10_000, [{ appliedUsd: 10_000 }])).toBe("paid")
  })

  it("excluye pagos anulados", () => {
    expect(calculatePaidAndPending(10_000, [{ appliedUsd: 4_000, isVoided: true }])).toEqual({
      paidUsd: { amount: 0, currency: "USD" },
      pendingUsd: { amount: 10_000, currency: "USD" },
    })
  })

  it("rechaza sobrepago", () => {
    expect(() =>
      assertNoOverpayment("PUR-0001", 10_000, [{ appliedUsd: 9_500 }], 1_000),
    ).toThrow(MoneyError)
  })
})
