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
import { valueAsNumber, valueAsString } from "@/lib/form-values"
import { formatMoney } from "@/lib/money"
import type { ActionResult } from "@/types/action-result"
import { createSaleSnapshot } from "../domain"
import { saveSaleAction } from "../actions"
import type { SaleCostSnapshotDTO, SaleDetailDTO, SaleVehicleOptionDTO } from "../types"

export function SaleForm({
  vehicles,
  previews,
  defaultVehicleId,
  cancelHref,
}: {
  vehicles: SaleVehicleOptionDTO[]
  previews: Record<string, SaleCostSnapshotDTO>
  defaultVehicleId?: string
  cancelHref: string
}) {
  const router = useRouter()
  const [submissionToken, setSubmissionToken] = useState(() => crypto.randomUUID())
  const [vehicleId, setVehicleId] = useState(defaultVehicleId ?? "")
  const [salePriceUsd, setSalePriceUsd] = useState(0)
  const [state, formAction] = useActionState<ActionResult<SaleDetailDTO> | null, FormData>(
    async (_previousState, formData) => {
      const result = await saveSaleAction(null, formData)
      if (result.ok) {
        toastManager.add({ title: "Venta registrada", description: `${result.data.code} · ${result.data.vehicleDescription}` })
        router.push(`/ventas/${result.data.code}`)
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
    setVehicleId(valueAsString(state.values.vehicleId, defaultVehicleId ?? ""))
    setSalePriceUsd(valueAsNumber(state.values.salePriceUsd, 0))
  }, [state, defaultVehicleId])
  const preview = previews[vehicleId]
  const salePreview = useMemo(() => {
    if (!preview) return null
    return createSaleSnapshot({ amount: salePriceUsd, currency: "USD" }, {
      acquisitionCostUsd: preview.acquisitionCostUsd,
      repairCostUsd: preview.repairCostUsd,
      vehicleExpenseCostUsd: preview.vehicleExpenseCostUsd,
      acquisitionCount: preview.acquisitionCount,
      repairCount: preview.repairCount,
      vehicleExpenseCount: preview.vehicleExpenseCount,
    })
  }, [preview, salePriceUsd])

  return (
    <form action={formAction} className="flex max-w-5xl flex-col gap-6">
      <input type="hidden" name="submissionToken" value={submissionToken} />

      <FormSection title="Vehículo y comprador" description="La venta se captura contra una unidad activa sin otra venta vigente.">
        <Field label="Vehículo" required error={fieldErrors.vehicleId}>
          <Select name="vehicleId" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} required>
            <option value="">Selecciona un vehículo</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.code} · {vehicle.description}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Comprador" required error={fieldErrors.buyerName}>
          <Input name="buyerName" defaultValue={valueAsString(formValues.buyerName)} required />
        </Field>
        <Field label="Teléfono" error={fieldErrors.buyerPhone}>
          <Input name="buyerPhone" defaultValue={valueAsString(formValues.buyerPhone)} />
        </Field>
        <Field label="Correo" error={fieldErrors.buyerEmail}>
          <Input name="buyerEmail" type="email" defaultValue={valueAsString(formValues.buyerEmail)} />
        </Field>
      </FormSection>

      <FormSection title="Datos de venta" description="El sistema asigna el código al guardar y congela el snapshot financiero actual.">
        <Field label="Fecha de venta" required error={fieldErrors.saleDate}>
          <Input name="saleDate" type="date" defaultValue={valueAsString(formValues.saleDate)} required />
        </Field>
        <Field label="Precio de venta (USD)" required error={fieldErrors.salePriceUsd}>
          <MoneyInput name="salePriceUsd" valueCents={salePriceUsd} onChangeCents={setSalePriceUsd} />
        </Field>
        <Field label="Términos" error={fieldErrors.terms}>
          <Input name="terms" defaultValue={valueAsString(formValues.terms)} />
        </Field>
        <Field label="Referencia" error={fieldErrors.referenceNumber}>
          <Input name="referenceNumber" defaultValue={valueAsString(formValues.referenceNumber)} />
        </Field>
      </FormSection>

      <FormSection title="Notas" description="Observaciones visibles para el equipo sobre el cierre de la venta.">
        <Field label="Notas" error={fieldErrors.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={4} defaultValue={valueAsString(formValues.notes)} />
        </Field>
      </FormSection>

      <FormSection title="Preview financiero" description="Se calcula con costos activos no anulados de compras, reparaciones y gastos vehiculares.">
        {salePreview ? (
          <div className="grid gap-3 md:grid-cols-2">
            <PreviewLine label="Costo de adquisición" value={formatMoney(salePreview.acquisitionCostUsd)} />
            <PreviewLine label="Costo de reparación" value={formatMoney(salePreview.repairCostUsd)} />
            <PreviewLine label="Gastos del vehículo" value={formatMoney(salePreview.vehicleExpenseCostUsd)} />
            <PreviewLine label="Costo total" value={formatMoney(salePreview.totalCostUsd)} />
            <PreviewLine label="Profit proyectado" value={formatMoney(salePreview.profitUsd)} />
            <PreviewLine label="ROI proyectado" value={salePreview.roiLabel} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona un vehículo para ver el costo activo y el profit proyectado.</p>
        )}
      </FormSection>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : <span />}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" render={<Link href={cancelHref} />}>
            Cancelar
          </Button>
          <SubmitButton size="sm">Registrar venta</SubmitButton>
        </div>
      </div>
    </form>
  )
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string
  error?: string[]
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1">
        <Label>{label}{required ? " *" : ""}</Label>
        {children}
        {error?.length ? <p className="text-xs text-destructive">{error[0]}</p> : null}
      </div>
    </div>
  )
}
