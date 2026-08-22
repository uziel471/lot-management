"use client"

import { useActionState, useMemo, useState } from "react"
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
import { formatMoney } from "@/lib/money"
import { saveRepairAction, type SaveRepairResult } from "../actions"
import { repairTotalOriginal, repairTotalUsd } from "../domain"
import {
  REPAIR_CATEGORY_OPTIONS,
  REPAIR_COST_COMPONENTS,
  type RepairCostComponentKey,
  type RepairCostComponents,
} from "../enums"

const EMPTY_COMPONENTS: RepairCostComponents = Object.fromEntries(
  REPAIR_COST_COMPONENTS.map((component) => [component.key, 0]),
) as RepairCostComponents

export function RepairForm({
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
  const [components, setComponents] = useState<RepairCostComponents>(EMPTY_COMPONENTS)

  const [state, formAction] = useActionState<SaveRepairResult | null, FormData>(
    async (previousState, formData) => {
      const result = await saveRepairAction(previousState, formData)
      if (result.ok) {
        toastManager.add({
          title: "Reparación registrada",
          description: `${result.data.code} · ${result.data.vehicleDescription}`,
        })
        router.push(`/reparaciones/${result.data.code}`)
      } else {
        setSubmissionToken(crypto.randomUUID())
      }
      return result
    },
    null,
  )

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {}

  const totalOriginal = useMemo(() => repairTotalOriginal(components, currency), [components, currency])
  const totalUsd = useMemo(() => {
    try {
      return repairTotalUsd(components, currency, exchangeRate || "0")
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

  function handleComponentChange(key: RepairCostComponentKey, cents: number) {
    setComponents((previous) => ({ ...previous, [key]: cents }))
  }

  return (
    <form action={formAction} className="flex max-w-5xl flex-col gap-6">
      <input type="hidden" name="submissionToken" value={submissionToken} />

      <FormSection
        title="Vehículo y proveedor"
        description="La reparación siempre pertenece a una unidad; el proveedor es opcional para trabajos internos."
      >
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

        <Field label="Proveedor" error={fieldErrors.vendorId} help="Déjalo vacío para una reparación interna.">
          <Select name="vendorId" defaultValue="">
            <option value="">Interna / sin proveedor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection
        title="Clasificación y agenda"
        description="Categoría operativa y fecha de apertura del trabajo."
      >
        <Field label="Categoría" required error={fieldErrors.category}>
          <Select name="category" defaultValue="" required>
            <option value="">Selecciona una categoría</option>
            {REPAIR_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha de apertura" required error={fieldErrors.openedAt}>
          <Input name="openedAt" type="date" required />
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
            disabled={currency === "USD"}
            required
          />
        </Field>

        {REPAIR_COST_COMPONENTS.map((component) => (
          <Field key={component.key} label={component.label} error={fieldErrors[component.key]}>
            <MoneyInput
              name={component.key}
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
            <p className="mt-3 text-xs text-destructive">La reparación debe incluir al menos un importe mayor que cero.</p>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="Trabajo y referencias"
        description="Describe el servicio realizado y deja las referencias operativas que ayudan a ubicarlo después."
      >
        <Field label="Descripción del trabajo" required error={fieldErrors.description} className="md:col-span-2">
          <Textarea name="description" rows={4} required />
        </Field>

        <Field label="Referencia" error={fieldErrors.referenceNumber}>
          <Input name="referenceNumber" />
        </Field>

        <Field label="Orden de trabajo" error={fieldErrors.workOrderNumber}>
          <Input name="workOrderNumber" />
        </Field>

        <Field label="Notas" error={fieldErrors.notes} className="md:col-span-2">
          <Textarea name="notes" rows={3} />
        </Field>
      </FormSection>

      {state && !state.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" render={<Link href={cancelHref}>Cancelar</Link>} />
        <SubmitButton>Registrar reparación</SubmitButton>
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
