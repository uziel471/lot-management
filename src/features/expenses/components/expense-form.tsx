"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { FormSection } from "@/components/shared/form-section"
import { MoneyInput } from "@/components/shared/money-input"
import { SubmitButton } from "@/components/shared/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import type { CatalogOption } from "@/features/catalogs/types"
import type { VehicleOption } from "@/features/vehicles/types"
import { valueAsNumber, valueAsString } from "@/lib/form-values"
import { formatMoney } from "@/lib/money"
import { saveExpenseAction, type SaveExpenseResult } from "../actions"
import { expenseTotalOriginal, expenseTotalUsd } from "../domain"
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_COMPONENTS,
  EXPENSE_EVIDENCE_TYPE_OPTIONS,
  type ExpenseComponentKey,
  type ExpenseComponents,
  PAYMENT_METHOD_OPTIONS,
} from "../enums"

const EMPTY_COMPONENTS: ExpenseComponents = Object.fromEntries(
  EXPENSE_COMPONENTS.map((component) => [component.key, 0]),
) as ExpenseComponents

export function ExpenseForm({
  vehicles,
  vendors,
  defaultVehicleId,
  cancelHref,
}: {
  vehicles: VehicleOption[]
  vendors: CatalogOption[]
  defaultVehicleId?: string
  cancelHref: string
}) {
  const router = useRouter()
  const [submissionToken, setSubmissionToken] = useState(() => crypto.randomUUID())
  const [currency, setCurrency] = useState<"USD" | "MXN">("USD")
  const [exchangeRate, setExchangeRate] = useState("1")
  const [components, setComponents] = useState<ExpenseComponents>(EMPTY_COMPONENTS)

  const [state, formAction] = useActionState<SaveExpenseResult | null, FormData>(
    async (previousState, formData) => {
      const result = await saveExpenseAction(previousState, formData)
      if (result.ok) {
        toastManager.add({
          title: "Gasto registrado",
          description: `${result.data.code} · ${result.data.isGeneral ? "General" : result.data.vehicleDescription ?? "Vehículo"}`,
        })
        router.push(`/gastos/${result.data.code}`)
      } else {
        setSubmissionToken(crypto.randomUUID())
      }
      return result
    },
    null,
  )

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  const formValues = state && !state.ok ? (state.values ?? {}) : {}

  useEffect(() => {
    if (!state || state.ok || !state.values) return

    const nextCurrency = valueAsString(state.values.currency, "USD") === "MXN" ? "MXN" : "USD"
    setCurrency(nextCurrency)
    setExchangeRate(nextCurrency === "USD" ? "1" : valueAsString(state.values.exchangeRate, ""))
    setComponents(
      Object.fromEntries(
        EXPENSE_COMPONENTS.map((component) => [
          component.key,
          valueAsNumber(state.values?.[component.key], 0),
        ]),
      ) as ExpenseComponents,
    )
  }, [state])

  const totalOriginal = useMemo(() => expenseTotalOriginal(components, currency), [components, currency])
  const totalUsd = useMemo(() => {
    try {
      return expenseTotalUsd(components, currency, exchangeRate || "0")
    } catch {
      return null
    }
  }, [components, currency, exchangeRate])

  const mxnRateValid =
    currency === "USD" || (/^\d+(\.\d+)?$/.test(exchangeRate.trim()) && Number(exchangeRate) > 0)
  const hasPositiveTotal = totalOriginal.amount > 0

  function handleCurrencyChange(value: string) {
    const nextCurrency = value as "USD" | "MXN"
    setCurrency(nextCurrency)
    if (nextCurrency === "USD") setExchangeRate("1")
  }

  function handleComponentChange(key: ExpenseComponentKey, cents: number) {
    setComponents((previous) => ({ ...previous, [key]: cents }))
  }

  return (
    <form action={formAction} className="flex max-w-5xl flex-col gap-6">
      <input type="hidden" name="submissionToken" value={submissionToken} />

      <FormSection
        title="Clasificación"
        description="Define la categoría operativa y si el gasto corresponde a una unidad específica o al lote en general."
      >
        <Field label="Categoría" required error={fieldErrors.category}>
          <Select name="category" defaultValue={valueAsString(formValues.category)} required>
            <option value="">Selecciona una categoría</option>
            {EXPENSE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha del gasto" required error={fieldErrors.expenseDate}>
          <Input name="expenseDate" type="date" defaultValue={valueAsString(formValues.expenseDate)} required />
        </Field>
      </FormSection>

      <FormSection
        title="Vehículo y proveedor"
        description="El gasto puede ser general o relacionarse a una unidad. El proveedor es opcional."
      >
        <Field label="Vehículo" error={fieldErrors.vehicleId} help="Déjalo vacío para registrar un gasto general.">
          <Select name="vehicleId" defaultValue={valueAsString(formValues.vehicleId, defaultVehicleId ?? "")}>
            <option value="">Gasto general / sin vehículo</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.code} · {vehicle.description}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Proveedor" error={fieldErrors.vendorId} help="Opcional, para servicios o compras externas.">
          <Select name="vendorId" defaultValue={valueAsString(formValues.vendorId)}>
            <option value="">Sin proveedor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection
        title="Finanzas"
        description="Los importes se guardan en la moneda original y el total en USD queda congelado con el tipo de cambio capturado."
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <Field label="Moneda" required error={fieldErrors.currency}>
          <Select name="currency" value={currency} onChange={(event) => handleCurrencyChange(event.target.value)} required>
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
          </Select>
        </Field>

        <Field
          label="Tipo de cambio (MXN por 1 USD)"
          required
          error={fieldErrors.exchangeRate}
          help={currency === "USD" ? "En USD se bloquea en 1." : "Debe ser un número positivo."}
        >
          <Input
            name="exchangeRate"
            value={exchangeRate}
            onChange={(event) => setExchangeRate(event.target.value)}
            readOnly={currency === "USD"}
            required
          />
        </Field>

        {EXPENSE_COMPONENTS.map((component) => (
          <Field key={component.key} label={component.label} error={fieldErrors[component.key]}>
            <MoneyInput
              name={component.key}
              valueCents={components[component.key] ?? 0}
              onChangeCents={(cents) => handleComponentChange(component.key, cents)}
            />
          </Field>
        ))}

        <div className="md:col-span-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Total original</span>
            <span className="font-medium">{formatMoney(totalOriginal)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Total en USD</span>
            <span className="font-medium">{totalUsd ? formatMoney(totalUsd) : "—"}</span>
          </div>
          {!mxnRateValid ? (
            <p className="mt-3 text-xs text-destructive">Captura un tipo de cambio MXN válido y mayor que cero.</p>
          ) : null}
          {!hasPositiveTotal ? (
            <p className="mt-3 text-xs text-destructive">El gasto debe tener un total final mayor que cero.</p>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="Pago y referencias"
        description="Datos operativos para conciliar el gasto y ubicarlo después."
      >
        <Field label="Forma de pago" error={fieldErrors.paymentMethod}>
          <Select name="paymentMethod" defaultValue={valueAsString(formValues.paymentMethod)}>
            <option value="">Sin especificar</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Referencia" error={fieldErrors.referenceNumber}>
          <Input name="referenceNumber" defaultValue={valueAsString(formValues.referenceNumber)} />
        </Field>
      </FormSection>

      <FormSection
        title="Evidencia"
        description="Se guardan metadatos y liga externa cuando exista soporte documental."
      >
        <Field label="Tipo de evidencia" error={fieldErrors.evidenceType}>
          <Select name="evidenceType" defaultValue={valueAsString(formValues.evidenceType)}>
            <option value="">Sin evidencia</option>
            {EXPENSE_EVIDENCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Etiqueta o folio" error={fieldErrors.evidenceLabel}>
          <Input name="evidenceLabel" defaultValue={valueAsString(formValues.evidenceLabel)} placeholder="Ej. Factura F-1023" />
        </Field>

        <Field label="Liga externa" error={fieldErrors.evidenceUrl} className="md:col-span-2">
          <Input name="evidenceUrl" type="url" defaultValue={valueAsString(formValues.evidenceUrl)} placeholder="https://..." />
        </Field>
      </FormSection>

      <FormSection
        title="Notas"
        description="Observaciones operativas visibles para el equipo."
      >
        <Field label="Notas" error={fieldErrors.notes} className="md:col-span-2">
          <Textarea name="notes" rows={4} defaultValue={valueAsString(formValues.notes)} />
        </Field>
      </FormSection>

      {state && !state.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" render={<Link href={cancelHref}>Cancelar</Link>} />
        <SubmitButton>Registrar gasto</SubmitButton>
      </div>
    </form>
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
    <div className={className}>
      <div className="grid gap-2">
        <Label className="text-sm">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {children}
        {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
        {error?.length ? <p className="text-xs text-destructive">{error[0]}</p> : null}
      </div>
    </div>
  )
}
