import type { Currency, Money } from "@/types/money"

/**
 * Aritmética de dinero en enteros de unidades menores (centavos).
 *
 * Regla de redondeo única (documentada, ver design.md de
 * `add-foundation-and-auth`): toda conversión bimoneda redondea al
 * centavo más cercano; el caso de medio centavo redondea "half away
 * from zero" (0.5 sube, -0.5 baja). Esta es la única función del
 * sistema que puede introducir redondeo; el resto de la aritmética
 * (sumas, restas) es exacta porque opera sobre enteros.
 */

const MINOR_UNITS_PER_MAJOR = 100

export class MoneyError extends Error {}

/** Convierte un importe decimal capturado por el usuario (p.ej. 12345.67) a centavos (1234567). */
export function toMinorUnits(value: number): number {
  if (!Number.isFinite(value)) {
    throw new MoneyError(`Importe inválido: ${value}`)
  }
  // Se redondea con base en la representación en centavos para evitar
  // el error de punto flotante al multiplicar decimales.
  return Math.round(value * MINOR_UNITS_PER_MAJOR)
}

/** Convierte centavos (1234567) a un número decimal (12345.67) apto para mostrar. */
export function fromMinorUnits(amount: number): number {
  return amount / MINOR_UNITS_PER_MAJOR
}

/** Suma dos importes de la misma moneda. Rechaza sumar monedas distintas. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new MoneyError(
      `No se puede sumar ${a.currency} con ${b.currency}: las transacciones son monomoneda.`,
    )
  }
  return { amount: a.amount + b.amount, currency: a.currency }
}

/** Suma una lista de importes de la misma moneda. Lanza si la lista está vacía o mezcla monedas. */
export function sumMoney(items: Money[]): Money {
  if (items.length === 0) {
    throw new MoneyError("No hay importes que sumar.")
  }
  return items.reduce((total, item) => addMoney(total, item))
}

/**
 * Divide un numerador entero (BigInt) entre un denominador entero
 * (BigInt), redondeando half-away-from-zero, sin pasar por punto
 * flotante en ningún momento.
 */
function divideRoundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new MoneyError("División entre cero.")
  }
  const negative = (numerator < 0n) !== (denominator < 0n)
  const n = numerator < 0n ? -numerator : numerator
  const d = denominator < 0n ? -denominator : denominator
  const quotient = n / d
  const remainder = n % d
  // remainder*2 >= d  <=>  remainder/d >= 0.5
  const roundedUp = remainder * 2n >= d ? quotient + 1n : quotient
  return negative ? -roundedUp : roundedUp
}

/**
 * Descompone una cadena decimal exacta (p.ej. "18.50") en un par
 * entero (numerador, denominador) sin pérdida de precisión.
 */
function decimalStringToFraction(decimal: string): { numerator: bigint; denominator: bigint } {
  const trimmed = decimal.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new MoneyError(`Tipo de cambio inválido: "${decimal}"`)
  }
  const negative = trimmed.startsWith("-")
  const unsigned = negative ? trimmed.slice(1) : trimmed
  const [intPart, fracPart = ""] = unsigned.split(".")
  const numerator = BigInt((intPart || "0") + fracPart)
  const denominator = 10n ** BigInt(fracPart.length)
  return { numerator: negative ? -numerator : numerator, denominator }
}

/**
 * Convierte un importe a su equivalente en USD dado un tipo de
 * cambio congelado (MXN por 1 USD), expresado como cadena decimal
 * exacta para no perder precisión. Rechaza tipo de cambio <= 0.
 */
export function convertToUsd(money: Money, exchangeRate: string): Money {
  const { numerator: rateNum, denominator: rateDen } = decimalStringToFraction(exchangeRate)
  if (rateNum <= 0n) {
    throw new MoneyError("El tipo de cambio debe ser mayor que cero.")
  }

  if (money.currency === "USD") {
    if (rateNum !== rateDen) {
      throw new MoneyError("Para importes en USD el tipo de cambio debe ser exactamente 1.")
    }
    return { amount: money.amount, currency: "USD" }
  }

  // usdCents = round(mxnCents * rateDen / rateNum)
  const usdCents = divideRoundHalfAwayFromZero(BigInt(money.amount) * rateDen, rateNum)
  return { amount: Number(usdCents), currency: "USD" }
}

const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  MXN: "es-MX",
}

/** Formatea un importe para mostrarlo, p.ej. "$12,345.67 USD". */
export function formatMoney(money: Money): string {
  const major = fromMinorUnits(money.amount)
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[money.currency], {
    style: "currency",
    currency: money.currency,
  }).format(major)
  return `${formatted} ${money.currency}`
}
