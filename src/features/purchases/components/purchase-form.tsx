"use client"

import { useActionState, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { MoneyInput } from "@/components/shared/money-input"
import { SubmitButton } from "@/components/shared/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import type { CatalogOption } from "@/features/catalogs/types"
import type { VehicleOption } from "@/features/vehicles/types"
import { formatMoney } from "@/lib/money"
import { savePurchaseAction, type SavePurchaseResult } from "../actions"
import { totalOriginal, totalUsd } from "../domain"
import {
  COST_COMPONENTS,
  PAYMENT_METHOD_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  TX_TYPE_OPTIONS,
  type CostComponentKey,
  type CostComponents,
} from "../enums"
import type { VoidedPurchaseOptionDTO } from "../types"

const EMPTY_COMPONENTS: CostComponents = Object.fromEntries(
  COST_COMPONENTS.map((c) => [c.key, 0]),
) as CostComponents

/**
 * Formulario de alta de una compra, en una página completa —no en
 * diálogo—: cinco secciones (ver design.md, "El formulario se agrupa
 * por decisión, no por columna"). El total en vivo se calcula con las
 * mismas funciones puras de `domain.ts` que usa el servidor, así que
 * lo que se ve antes de guardar es exactamente lo que se guardará.
 */
export function PurchaseForm({
  vehicles,
  vendors,
  defaultVehicleId,
  correctionTargets = [],
}: {
  vehicles: VehicleOption[]
  vendors: CatalogOption[]
  defaultVehicleId?: string
  correctionTargets?: VoidedPurchaseOptionDTO[]
}) {
  const router = useRouter()
  // Se genera una sola vez, en el montaje: es el token que protege
  // contra el guardado doble (ver design.md, "El guardado doble se
  // resuelve con un token de envío").
  const [submissionToken, setSubmissionToken] = useState(() => crypto.randomUUID())
  const [currency, setCurrency] = useState<"USD" | "MXN">("USD")
  const [exchangeRate, setExchangeRate] = useState("1")
  const [txType, setTxType] = useState<(typeof TX_TYPE_OPTIONS)[number]["value"]>("initial")
  const [components, setComponents] = useState<CostComponents>(EMPTY_COMPONENTS)

  const [state, formAction] = useActionState<SavePurchaseResult | null, FormData>(
    async (previousState, formData) => {
      const result = await savePurchaseAction(previousState, formData)
      if (result.ok) {
        toastManager.add({
          title: "Compra registrada",
          description: `${result.data.code} · ${result.data.vehicleDescription}`,
        })
        if (result.purchaseDateWarning) {
          toastManager.add({
            title: "Revisa las fechas",
            description: "La compra es posterior a la fecha de recepción del vehículo. Se guardó de todos modos.",
          })
        }
        router.push(`/compras/${result.data.code}`)
      } else {
        // Un intento rechazado renueva el token: el que se usó no debe reciclarse.
        setSubmissionToken(crypto.randomUUID())
      }
      return result
    },
    null,
  )

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {}

  const original = useMemo(() => totalOriginal(components, currency), [components, currency])
  const usd = useMemo(() => {
    try {
      return totalUsd(components, currency, exchangeRate || "0")
    } catch {
      return null
    }
  }, [components, currency, exchangeRate])

  function handleCurrencyChange(value: string) {
    const nextCurrency = value as "USD" | "MXN"
    setCurrency(nextCurrency)
    if (nextCurrency === "USD") setExchangeRate("1")
  }

  function handleComponentChange(key: CostComponentKey, cents: number) {
    setComponents((prev) => ({ ...prev, [key]: cents }))
  }

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="submissionToken" value={submissionToken} />

      <Section title="Identificación">
        <Field label="Vehículo" required error={fieldErrors.vehicleId}>
          <Select name="vehicleId" defaultValue={defaultVehicleId ?? ""} required>
            <option value="">Selecciona un vehículo</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.code} · {vehicle.description}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Proveedor" required error={fieldErrors.vendorId}>
          <Select name="vendorId" defaultValue="" required>
            <option value="">Selecciona un proveedor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha de compra" required error={fieldErrors.purchaseDate}>
          <Input name="purchaseDate" type="date" required />
        </Field>

        <Field label="Origen" required error={fieldErrors.sourceType}>
          <Select name="sourceType" defaultValue="" required>
            <option value="">Selecciona un origen</option>
            {SOURCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tipo de compra" required error={fieldErrors.txType}>
          <Select
            name="txType"
            value={txType}
            onChange={(event) => setTxType(event.target.value as typeof txType)}
            required
          >
            {TX_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        {txType === "correction" ? (
          <Field
            label="Compra que corrige"
            required
            error={fieldErrors.correctsPurchaseId}
            help="Solo aparecen las compras anuladas de este vehículo que aún no tienen corrección."
          >
            <Select name="correctsPurchaseId" defaultValue="" required>
              <option value="">Selecciona la compra anulada</option>
              {correctionTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.code} · {formatMoney(target.totalOriginal)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </Section>

      <Section title="Moneda">
        <Field label="Moneda" required error={fieldErrors.currency}>
          <Select
            name="currency"
            value={currency}
            onChange={(event) => handleCurrencyChange(event.target.value)}
            required
          >
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
          </Select>
        </Field>

        <Field
          label="Tipo de cambio (MXN por 1 USD)"
          required
          error={fieldErrors.exchangeRate}
          help="Se congela al guardar. En USD queda fijo en 1."
        >
          <Input
            name="exchangeRate"
            value={exchangeRate}
            onChange={(event) => setExchangeRate(event.target.value)}
            disabled={currency === "USD"}
            required
          />
        </Field>
      </Section>

      <Section title="Componentes del costo">
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Solo costos de adquisición de la unidad: precio, comisiones de la operación, traslado al
          lote, trámites de título e importación. El reacondicionamiento se registra como
          reparación; todo lo demás, como gasto.
        </p>
        {COST_COMPONENTS.map((component) => (
          <Field
            key={component.key}
            label={component.label}
            error={fieldErrors[component.key]}
          >
            <MoneyInput
              name={component.key}
              onChangeCents={(cents) => handleComponentChange(component.key, cents)}
            />
          </Field>
        ))}

        <div className="sm:col-span-2 flex flex-col gap-1 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total original</span>
            <span className="font-medium">{formatMoney(original)}</span>
          </div>
          {currency !== "USD" ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equivalente en USD</span>
              <span className="font-medium">{usd ? formatMoney(usd) : "—"}</span>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title="Pago y referencias">
        <Field label="Forma de pago" error={fieldErrors.paymentMethod}>
          <Select name="paymentMethod" defaultValue="">
            <option value="">Sin especificar</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Número de referencia" error={fieldErrors.referenceNumber}>
          <Input name="referenceNumber" />
        </Field>

        <Field label="Número de lote" error={fieldErrors.lotNumber}>
          <Input name="lotNumber" />
        </Field>
      </Section>

      <Section title="Notas">
        <Field label="Notas" error={fieldErrors.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} />
        </Field>
      </Section>

      {state && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton>Registrar compra</SubmitButton>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  help,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  help?: string
  error?: string[]
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <Label>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <FieldErrors errors={error} />
    </div>
  )
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return (
    <>
      {errors.map((error) => (
        <p key={error} className="text-xs text-destructive">
          {error}
        </p>
      ))}
    </>
  )
}
