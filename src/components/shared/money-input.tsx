"use client"

import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"

/**
 * Campo de un importe monetario.
 *
 * El usuario captura en la unidad mayor —pesos o dólares, con
 * centavos, como cualquier campo de precio—, pero el valor que debe
 * viajar al servidor es siempre el entero de unidades menores
 * (centavos), conforme a `lib/money.ts` y a lo que espera cada
 * esquema Zod (`z.coerce.number().int()`). Sin esta conversión, un
 * `<input type="number">` común manda la cadena decimal tal cual —
 * "100.50"— y el esquema la rechaza por no ser entera, o peor, la
 * acepta truncada y guarda 100 pesos como 100 centavos.
 *
 * El campo visible es un número decimal sin `name`; un campo oculto
 * con el `name` real lleva los centavos. Es el primer componente que
 * necesitó esta conversión (compras); design.md de `add-purchases` ya
 * anticipaba que reparaciones, gastos, pagos y ventas la
 * necesitarían idéntica.
 */
export function MoneyInput({
  name,
  defaultValueCents = 0,
  valueCents,
  onChangeCents,
  className,
  ...props
}: {
  name: string
  /** Valor inicial en centavos. */
  defaultValueCents?: number
  /** Valor controlado en centavos, util para rehidratar despues de errores. */
  valueCents?: number
  /** Notifica el nuevo valor en centavos en cada cambio. */
  onChangeCents?: (cents: number) => void
} & Omit<
  React.ComponentProps<typeof Input>,
  "name" | "defaultValue" | "onChange" | "type" | "step"
>) {
  const [cents, setCents] = useState(defaultValueCents)
  const controlled = valueCents !== undefined
  const currentCents = controlled ? valueCents : cents

  useEffect(() => {
    if (!controlled) setCents(defaultValueCents)
  }, [controlled, defaultValueCents])

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    const amount = raw.trim() === "" ? 0 : Math.round(Number(raw) * 100)
    const next = Number.isFinite(amount) ? amount : 0
    if (!controlled) setCents(next)
    onChangeCents?.(next)
  }

  return (
    <>
      <input type="hidden" name={name} value={currentCents} />
      <Input
        type="number"
        step="0.01"
        value={controlled ? (currentCents ? currentCents / 100 : "") : undefined}
        defaultValue={!controlled && defaultValueCents ? defaultValueCents / 100 : undefined}
        onChange={handleChange}
        className={className}
        {...props}
      />
    </>
  )
}
