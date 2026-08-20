import { stripAccentsAndCollapseSpaces } from "@/lib/text"
import { addMoney, convertToUsd, sumMoney } from "@/lib/money"
import type { Currency, Money } from "@/types/money"
import { COST_COMPONENT_KEYS, type CostComponentKey, type CostComponents, type TxType } from "./enums"

/**
 * Reglas puras de compras: sin I/O, sin Mongoose, sin sesión. Todo lo
 * que se pueda decidir sin tocar la base vive aquí, y aquí es donde
 * se prueba (`domain.test.ts`), conforme a la forma de feature de
 * ARCHITECTURE.md §2.
 */

/** Los ocho componentes como lista de `Money`, en el orden declarado. */
function componentsAsMoney(components: CostComponents, currency: Currency): Money[] {
  return COST_COMPONENT_KEYS.map((key) => ({ amount: components[key] ?? 0, currency }))
}

/**
 * Total original de una compra: la suma de los ocho componentes en su
 * propia moneda. Un componente ausente se trata como cero.
 */
export function totalOriginal(components: CostComponents, currency: Currency): Money {
  return sumMoney(componentsAsMoney(components, currency))
}

/**
 * Total en USD de una compra, derivado del total original y el tipo
 * de cambio congelado. El tipo de cambio viaja como cadena decimal
 * exacta (ver `lib/money.ts`, `convertToUsd`): nunca como `number`.
 */
export function totalUsd(components: CostComponents, currency: Currency, exchangeRate: string): Money {
  return convertToUsd(totalOriginal(components, currency), exchangeRate)
}

/** Solo `Adjustment` admite componentes negativos (ver spec, "Control de signo"). */
export function allowsNegativeAmounts(txType: TxType): boolean {
  return txType === "adjustment"
}

/**
 * `Adjustment` y `Related` exigen que el vehículo ya tenga al menos
 * una compra vigente: un ajuste sobre un costo que no existe es un
 * dato huérfano.
 */
export function requiresExistingPurchase(txType: TxType): boolean {
  return txType === "adjustment" || txType === "related"
}

/** `Correction` exige señalar la compra anulada del mismo vehículo que corrige. */
export function requiresCorrectionTarget(txType: TxType): boolean {
  return txType === "correction"
}

/** Solo puede haber una compra `Initial` vigente por vehículo. */
export function isUniqueInitial(txType: TxType): boolean {
  return txType === "initial"
}

/** Rechaza la compra cuyos ocho componentes son todos cero (ningún importe capturado). */
export function hasAnyAmount(components: CostComponents): boolean {
  return COST_COMPONENT_KEYS.some((key) => (components[key] ?? 0) !== 0)
}

/**
 * Clave de unicidad del número de referencia de un comprobante,
 * compartida con la normalización de nombre de catálogo (ver
 * design.md, "Unicidad del comprobante por referencia normalizada").
 * Devuelve `null` para una referencia vacía: no participa en el
 * índice de unicidad.
 */
export function toReferenceKey(reference: string | null | undefined): string | null {
  if (!reference) return null
  const key = stripAccentsAndCollapseSpaces(reference).toUpperCase()
  return key.length > 0 ? key : null
}

/** Una compra vigente para efectos del costo acumulado: no anulada. */
export type AccumulablePurchase = {
  currency: Currency
  exchangeRate: string
  components: CostComponents
  voidedAt: Date | null | string
}

export type AcquisitionCostAccumulation = {
  total: Money
  components: Record<CostComponentKey, Money>
}

/**
 * Costo de adquisición acumulado de un vehículo: la suma en USD de
 * sus compras vigentes, con el desglose por cada uno de los ocho
 * componentes. Cada compra se convierte con su propio tipo de cambio
 * congelado antes de sumarse (ver design.md, "Los totales no se
 * guardan y no los calcula MongoDB"); las anuladas cuentan como cero.
 */
export function accumulateAcquisitionCost(
  purchases: readonly AccumulablePurchase[],
): AcquisitionCostAccumulation {
  const vigentes = purchases.filter((purchase) => !purchase.voidedAt)

  const componentTotals = Object.fromEntries(
    COST_COMPONENT_KEYS.map((key) => {
      const amounts = vigentes.map((purchase) =>
        convertToUsd({ amount: purchase.components[key] ?? 0, currency: purchase.currency }, purchase.exchangeRate),
      )
      const total = amounts.length > 0 ? amounts.reduce((a, b) => addMoney(a, b)) : { amount: 0, currency: "USD" as const }
      return [key, total]
    }),
  ) as Record<CostComponentKey, Money>

  const total =
    vigentes.length > 0
      ? COST_COMPONENT_KEYS.map((key) => componentTotals[key]).reduce((a, b) => addMoney(a, b))
      : ({ amount: 0, currency: "USD" as const } satisfies Money)

  return { total, components: componentTotals }
}
