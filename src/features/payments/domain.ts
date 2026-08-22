import { convertToUsd, MoneyError } from "@/lib/money"
import type { Currency, Money } from "@/types/money"
import { PAYMENT_SOURCE_TYPE_VALUES, type PaymentSourceType, type PaymentStatus } from "./enums"

export type PaymentLike = {
  amount: number
  currency: Currency
  exchangeRate: string
}

export type ApplicationLike = {
  sourceType: PaymentSourceType
  appliedAmount: number
  appliedUsd?: number
  isVoided?: boolean
}

export function paymentTotalUsd(amount: number, currency: Currency, exchangeRate: string): Money {
  return convertToUsd({ amount, currency }, exchangeRate)
}

export function sumApplications(applications: Pick<ApplicationLike, "appliedAmount">[]): number {
  return applications.reduce((total, application) => total + application.appliedAmount, 0)
}

export function assertApplicationsMatchPaymentAmount(
  payment: PaymentLike,
  applications: Pick<ApplicationLike, "appliedAmount">[],
): void {
  const total = sumApplications(applications)
  if (total !== payment.amount) {
    throw new MoneyError("La suma de las aplicaciones debe coincidir exactamente con el monto del pago.")
  }
}

export function calculatePaidAndPending(
  sourceTotalUsd: number,
  activeApplications: Pick<ApplicationLike, "appliedUsd" | "isVoided">[],
): { paidUsd: Money; pendingUsd: Money } {
  const paidAmount = activeApplications.reduce((total, application) => {
    if (application.isVoided) return total
    return total + (application.appliedUsd ?? 0)
  }, 0)
  const pendingAmount = Math.max(0, sourceTotalUsd - paidAmount)

  return {
    paidUsd: { amount: paidAmount, currency: "USD" },
    pendingUsd: { amount: pendingAmount, currency: "USD" },
  }
}

export function paymentStatus(
  sourceTotalUsd: number,
  activeApplications: Pick<ApplicationLike, "appliedUsd" | "isVoided">[],
): PaymentStatus {
  const { paidUsd, pendingUsd } = calculatePaidAndPending(sourceTotalUsd, activeApplications)
  if (paidUsd.amount <= 0) return "unpaid"
  if (pendingUsd.amount <= 0) return "paid"
  return "partial"
}

export function assertPositivePaymentAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new MoneyError("El pago debe tener un monto mayor que cero.")
  }
}

export function assertApplicationsNotEmpty(applications: unknown[]): void {
  if (applications.length === 0) {
    throw new MoneyError("Debe capturarse al menos una aplicación.")
  }
}

export function assertSupportedSourceType(sourceType: string): asserts sourceType is PaymentSourceType {
  if (!PAYMENT_SOURCE_TYPE_VALUES.includes(sourceType as PaymentSourceType)) {
    throw new MoneyError(`El tipo de documento "${sourceType}" no es compatible con pagos.`)
  }
}

export function assertNoOverpayment(
  sourceCode: string,
  sourceTotalUsd: number,
  activeApplications: Pick<ApplicationLike, "appliedUsd" | "isVoided">[],
  nextAppliedUsd: number,
): void {
  const { paidUsd } = calculatePaidAndPending(sourceTotalUsd, activeApplications)
  if (paidUsd.amount + nextAppliedUsd > sourceTotalUsd) {
    throw new MoneyError(`El documento ${sourceCode} quedaría sobrepagado con esta aplicación.`)
  }
}
