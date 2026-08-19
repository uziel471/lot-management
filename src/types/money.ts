/**
 * Moneda soportada por el sistema. Cada transacción es monomoneda.
 */
export type Currency = "USD" | "MXN"

/**
 * Importe monetario representado como entero de unidades menores
 * (centavos) para evitar el error de punto flotante de `Number`.
 */
export type Money = {
  /** Unidades menores (centavos). Siempre un entero. */
  amount: number
  currency: Currency
}
