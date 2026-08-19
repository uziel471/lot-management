"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"

import { SubmitButton } from "@/components/shared/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import { MakeModelSelect } from "@/features/catalogs/components/make-model-select"
import type { CatalogOption } from "@/features/catalogs/types"
import { saveVehicleAction, type SaveVehicleResult } from "../actions"
import {
  BODY_STYLE_OPTIONS,
  DRIVETRAIN_OPTIONS,
  FUEL_TYPE_OPTIONS,
  MILEAGE_UNIT_OPTIONS,
  TITLE_STATUS_OPTIONS,
  TRANSMISSION_OPTIONS,
} from "../enums"
import type { VehicleDetailDTO } from "../types"

/** Formatea una fecha ISO a `yyyy-mm-dd` para un `<input type="date">`. */
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

/**
 * Formulario de alta y edición, en una página completa —no en
 * diálogo—: veintitrés campos no caben legibles en un modal (ver
 * design.md, "El formulario se agrupa en secciones, no en pasos").
 * Las secciones van en `<details>`, con Identificación abierta y las
 * demás plegadas en el alta; todas abiertas en la edición.
 */
export function VehicleForm({
  entry,
  makes,
  statuses,
  initialModels = [],
}: {
  entry?: VehicleDetailDTO
  makes: CatalogOption[]
  statuses: CatalogOption[]
  initialModels?: CatalogOption[]
}) {
  const isEdit = Boolean(entry)
  const router = useRouter()

  const [state, formAction] = useActionState<SaveVehicleResult | null, FormData>(
    async (previousState, formData) => {
      const result = await saveVehicleAction(previousState, formData)
      if (result.ok) {
        toastManager.add({
          title: isEdit ? "Vehículo actualizado" : "Vehículo creado",
          description: `${result.data.description} · ${result.data.code}`,
        })
        if (result.vinCheckDigitWarning) {
          toastManager.add({
            title: "Revisa el VIN",
            description: "El dígito verificador no corresponde. El vehículo se guardó de todos modos.",
          })
        }
        router.push(`/vehiculos/${result.data.code}`)
      }
      return result
    },
    null,
  )

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      {entry ? <input type="hidden" name="code" value={entry.code} /> : null}

      <Section title="Identificación" open>
        <div className="flex flex-col gap-1">
          <MakeModelSelect
            makes={makes}
            defaultMakeId={entry?.makeId}
            defaultModelId={entry?.modelId}
            initialModels={initialModels}
          />
          <FieldErrors errors={fieldErrors.makeId} />
          <FieldErrors errors={fieldErrors.modelId} />
        </div>

        <Field label="Año" required error={fieldErrors.year}>
          <Input name="year" type="number" defaultValue={entry?.year ?? ""} required />
        </Field>

        <Field label="Estatus" required error={fieldErrors.statusId}>
          <Select name="statusId" defaultValue={entry?.statusId ?? ""} required>
            <option value="">Selecciona un estatus</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha de recepción" required error={fieldErrors.dateReceived}>
          <Input
            name="dateReceived"
            type="date"
            defaultValue={toDateInputValue(entry?.dateReceived)}
            required
          />
        </Field>

        <Field
          label="VIN"
          error={fieldErrors.vin}
          help="17 caracteres, sin I, O ni Q. Opcional al dar de alta."
        >
          <Input name="vin" defaultValue={entry?.vin ?? ""} maxLength={17} />
        </Field>

        <Field label="Número de inventario" error={fieldErrors.stockNumber}>
          <Input name="stockNumber" defaultValue={entry?.stockNumber ?? ""} />
        </Field>
      </Section>

      <Section title="Ficha técnica" open={isEdit}>
        <Field label="Versión / trim" error={fieldErrors.trim}>
          <Input name="trim" defaultValue={entry?.trim ?? ""} />
        </Field>

        <Field label="Estilo de carrocería" error={fieldErrors.bodyStyle}>
          <Select name="bodyStyle" defaultValue={entry?.bodyStyle ?? ""}>
            <option value="">Sin especificar</option>
            {BODY_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Color exterior" error={fieldErrors.exteriorColor}>
          <Input name="exteriorColor" defaultValue={entry?.exteriorColor ?? ""} />
        </Field>

        <Field label="Color interior" error={fieldErrors.interiorColor}>
          <Input name="interiorColor" defaultValue={entry?.interiorColor ?? ""} />
        </Field>

        <div className="flex gap-2">
          <Field label="Kilometraje" error={fieldErrors.mileage} className="flex-1">
            <Input name="mileage" type="number" min={0} defaultValue={entry?.mileage ?? ""} />
          </Field>
          <Field label="Unidad" error={fieldErrors.mileageUnit} className="w-36">
            <Select name="mileageUnit" defaultValue={entry?.mileageUnit ?? ""}>
              <option value="">—</option>
              {MILEAGE_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Transmisión" error={fieldErrors.transmission}>
          <Select name="transmission" defaultValue={entry?.transmission ?? ""}>
            <option value="">Sin especificar</option>
            {TRANSMISSION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Combustible" error={fieldErrors.fuelType}>
          <Select name="fuelType" defaultValue={entry?.fuelType ?? ""}>
            <option value="">Sin especificar</option>
            {FUEL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tracción" error={fieldErrors.drivetrain}>
          <Select name="drivetrain" defaultValue={entry?.drivetrain ?? ""}>
            <option value="">Sin especificar</option>
            {DRIVETRAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Título" open={isEdit}>
        <Field label="Situación del título" error={fieldErrors.titleStatus}>
          <Select name="titleStatus" defaultValue={entry?.titleStatus ?? ""}>
            <option value="">Sin especificar</option>
            {TITLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Número de título" error={fieldErrors.titleNumber}>
          <Input name="titleNumber" defaultValue={entry?.titleNumber ?? ""} />
        </Field>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            name="titleInHand"
            defaultChecked={entry?.titleInHand ?? false}
            className="size-3.5 accent-primary"
          />
          Título en poder del lote
        </label>
      </Section>

      <Section title="Inventario y ubicación" open={isEdit}>
        <Field label="Fecha de publicación" error={fieldErrors.dateListed}>
          <Input name="dateListed" type="date" defaultValue={toDateInputValue(entry?.dateListed)} />
        </Field>

        <Field label="Ubicación en el lote" error={fieldErrors.lotLocation}>
          <Input name="lotLocation" defaultValue={entry?.lotLocation ?? ""} />
        </Field>
      </Section>

      <Section title="Precio y notas" open={isEdit}>
        <Field
          label="Precio de lista (USD)"
          error={fieldErrors.askingPrice}
          help="Sin tipo de cambio congelado: es una intención de venta, no una transacción."
        >
          <Input
            name="askingPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={entry?.askingPrice ? entry.askingPrice.amount / 100 : ""}
          />
        </Field>

        <Field label="Notas" error={fieldErrors.notes}>
          <Textarea name="notes" defaultValue={entry?.notes ?? ""} rows={3} />
        </Field>
      </Section>

      {state && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton>{isEdit ? "Guardar cambios" : "Registrar vehículo"}</SubmitButton>
      </div>
    </form>
  )
}

function Section({
  title,
  open,
  children,
}: {
  title: string
  open?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={open} className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </details>
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
