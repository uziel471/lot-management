"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useRouter } from "next/navigation"

import { FormSection } from "@/components/shared/form-section"
import { SubmitButton } from "@/components/shared/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import { MakeModelSelect } from "@/features/catalogs/components/make-model-select"
import type { CatalogOption } from "@/features/catalogs/types"
import { valueAsBoolean, valueAsString } from "@/lib/form-values"
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

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

export function VehicleForm({
  entry,
  makes,
  statuses,
  initialModels = [],
  cancelHref,
}: {
  entry?: VehicleDetailDTO
  makes: CatalogOption[]
  statuses: CatalogOption[]
  initialModels?: CatalogOption[]
  cancelHref: string
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
  const formValues = state && !state.ok ? (state.values ?? {}) : {}

  return (
    <form action={formAction} className="flex max-w-5xl flex-col gap-6">
      {entry ? <input type="hidden" name="code" value={entry.code} /> : null}

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {isEdit
                ? "Actualiza la información operativa del vehículo sin alterar su código."
                : "Captura lo obligatorio primero y completa el resto cuando esté disponible."}
            </p>
            <p className="text-xs text-muted-foreground">
              Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
            </p>
          </div>
          <Field label="Código" className="md:justify-self-end">
            <Input value={entry?.code ?? "Se asigna al guardar"} readOnly disabled />
          </Field>
        </div>
      </div>

      <FormSection
        title="Identificación"
        description="Datos mínimos para identificar la unidad y registrarla en inventario."
      >
        <div className="flex flex-col gap-1 md:col-span-2">
          <MakeModelSelect
            makes={makes}
            defaultMakeId={valueAsString(formValues.makeId, entry?.makeId ?? "")}
            defaultModelId={valueAsString(formValues.modelId, entry?.modelId ?? "")}
            initialModels={initialModels}
          />
          <FieldErrors errors={fieldErrors.makeId} />
          <FieldErrors errors={fieldErrors.modelId} />
        </div>

        <Field label="Año" required error={fieldErrors.year}>
          <Input name="year" type="number" defaultValue={valueAsString(formValues.year, entry?.year ? String(entry.year) : "")} required />
        </Field>

        <Field label="Estatus" required error={fieldErrors.statusId}>
          <Select name="statusId" defaultValue={valueAsString(formValues.statusId, entry?.statusId ?? "")} required>
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
            defaultValue={valueAsString(formValues.dateReceived, toDateInputValue(entry?.dateReceived))}
            required
          />
        </Field>

        <Field
          label="VIN"
          error={fieldErrors.vin}
          help="17 caracteres, sin I, O ni Q. Opcional al dar de alta."
        >
          <Input name="vin" defaultValue={valueAsString(formValues.vin, entry?.vin ?? "")} maxLength={17} />
        </Field>

        <Field label="Número de inventario" error={fieldErrors.stockNumber}>
          <Input name="stockNumber" defaultValue={valueAsString(formValues.stockNumber, entry?.stockNumber ?? "")} />
        </Field>
      </FormSection>

      <FormSection
        title="Ficha técnica"
        description="Características físicas y mecánicas visibles durante la captura."
      >
        <Field label="Versión / trim" error={fieldErrors.trim}>
          <Input name="trim" defaultValue={valueAsString(formValues.trim, entry?.trim ?? "")} />
        </Field>

        <Field label="Estilo de carrocería" error={fieldErrors.bodyStyle}>
          <Select name="bodyStyle" defaultValue={valueAsString(formValues.bodyStyle, entry?.bodyStyle ?? "")}>
            <option value="">Sin especificar</option>
            {BODY_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Color exterior" error={fieldErrors.exteriorColor}>
          <Input name="exteriorColor" defaultValue={valueAsString(formValues.exteriorColor, entry?.exteriorColor ?? "")} />
        </Field>

        <Field label="Color interior" error={fieldErrors.interiorColor}>
          <Input name="interiorColor" defaultValue={valueAsString(formValues.interiorColor, entry?.interiorColor ?? "")} />
        </Field>

        <div className="flex gap-2 md:col-span-2">
          <Field label="Kilometraje" error={fieldErrors.mileage} className="flex-1">
            <Input name="mileage" type="number" min={0} defaultValue={valueAsString(formValues.mileage, entry?.mileage ? String(entry.mileage) : "")} />
          </Field>
          <Field label="Unidad" error={fieldErrors.mileageUnit} className="w-36">
            <Select name="mileageUnit" defaultValue={valueAsString(formValues.mileageUnit, entry?.mileageUnit ?? "")}>
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
          <Select name="transmission" defaultValue={valueAsString(formValues.transmission, entry?.transmission ?? "")}>
            <option value="">Sin especificar</option>
            {TRANSMISSION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Combustible" error={fieldErrors.fuelType}>
          <Select name="fuelType" defaultValue={valueAsString(formValues.fuelType, entry?.fuelType ?? "")}>
            <option value="">Sin especificar</option>
            {FUEL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tracción" error={fieldErrors.drivetrain}>
          <Select name="drivetrain" defaultValue={valueAsString(formValues.drivetrain, entry?.drivetrain ?? "")}>
            <option value="">Sin especificar</option>
            {DRIVETRAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Título" description="Situación documental del título de propiedad.">
        <Field label="Situación del título" error={fieldErrors.titleStatus}>
          <Select name="titleStatus" defaultValue={valueAsString(formValues.titleStatus, entry?.titleStatus ?? "")}>
            <option value="">Sin especificar</option>
            {TITLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Número de título" error={fieldErrors.titleNumber}>
          <Input name="titleNumber" defaultValue={valueAsString(formValues.titleNumber, entry?.titleNumber ?? "")} />
        </Field>

        <div className="flex items-center gap-2 md:col-span-2">
          <input
            id="title-in-hand"
            type="checkbox"
            name="titleInHand"
            defaultChecked={valueAsBoolean(formValues.titleInHand, entry?.titleInHand ?? false)}
            className="size-4 accent-primary"
          />
          <Label htmlFor="title-in-hand">Título en poder del lote</Label>
        </div>
      </FormSection>

      <FormSection
        title="Inventario y ubicación"
        description="Seguimiento operativo dentro del lote."
      >
        <Field label="Fecha de publicación" error={fieldErrors.dateListed}>
          <Input name="dateListed" type="date" defaultValue={valueAsString(formValues.dateListed, toDateInputValue(entry?.dateListed))} />
        </Field>

        <Field label="Ubicación en el lote" error={fieldErrors.lotLocation}>
          <Input name="lotLocation" defaultValue={valueAsString(formValues.lotLocation, entry?.lotLocation ?? "")} />
        </Field>
      </FormSection>

      <FormSection title="Precio y notas" description="Contexto comercial visible para el equipo.">
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
            defaultValue={valueAsString(formValues.askingPrice, entry?.askingPrice ? String(entry.askingPrice.amount / 100) : "")}
          />
        </Field>

        <Field label="Notas" error={fieldErrors.notes} className="md:col-span-2">
          <Textarea name="notes" defaultValue={valueAsString(formValues.notes, entry?.notes ?? "")} rows={3} />
        </Field>
      </FormSection>

      {state && !state.ok ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" render={<Link href={cancelHref}>Cancelar</Link>} />
        <SubmitButton>{isEdit ? "Guardar cambios" : "Registrar vehículo"}</SubmitButton>
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
    <div className={`flex min-w-0 flex-col gap-1 ${className ?? ""}`}>
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
