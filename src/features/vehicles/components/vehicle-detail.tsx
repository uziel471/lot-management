"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

import {
  DetailGrid,
  DetailItem,
  DetailSection,
} from "@/components/shared/detail-section"
import { StatusBadge } from "@/components/shared/status-badge"
import { SubmitButton } from "@/components/shared/submit-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toastManager } from "@/components/ui/toast"
import type { CatalogOption } from "@/features/catalogs/types"
import { formatMoney } from "@/lib/money"
import type { ActionResult } from "@/types/action-result"
import { changeAskingPriceAction, changeVehicleStatusAction, voidVehicleAction } from "../actions"
import {
  BODY_STYLE_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_TYPE_LABELS,
  MILEAGE_UNIT_LABELS,
  TITLE_STATUS_LABELS,
  TRANSMISSION_LABELS,
} from "../enums"
import type { VehicleDetailDTO } from "../types"
import { StatusHistory } from "./status-history"
import { VehicleImagesSection } from "./vehicle-images-section"

export function VehicleDetail({
  vehicle,
  statuses,
  canWrite,
  canVoid,
}: {
  vehicle: VehicleDetailDTO
  statuses: CatalogOption[]
  canWrite: boolean
  canVoid: boolean
}) {
  const missing = missingFields(vehicle)

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{vehicle.description}</h1>
              <span className="font-mono text-xs text-muted-foreground">{vehicle.code}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge tone={statusTone(vehicle.statusName)}>{vehicle.statusName}</StatusBadge>
              {vehicle.isVoided ? <StatusBadge tone="destructive">Anulado</StatusBadge> : null}
              <StatusBadge tone={vehicle.titleInHand ? "success" : "muted"}>
                {vehicle.titleInHand ? "Título en mano" : "Sin título en mano"}
              </StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              Código, estatus y datos clave de operación para seguimiento diario.
            </p>
          </div>

          {canWrite && !vehicle.isVoided ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/vehiculos/${vehicle.code}/editar`}>Editar</Link>}
              />
              {canVoid ? <VoidVehicleDialog code={vehicle.code} /> : null}
            </div>
          ) : null}
        </div>
      </div>

      {vehicle.isVoided ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">Vehículo anulado</p>
          <p className="text-muted-foreground">{vehicle.voidReason}</p>
        </div>
      ) : null}

      {vehicle.vinCheckDigitWarning ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          El dígito verificador del VIN no corresponde. Puede ser una unidad legítima fuera del
          estándar norteamericano; conviene revisar el VIN capturado.
        </div>
      ) : null}

      {missing.length > 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Falta por capturar: {missing.join(", ")}.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-6">
          <DetailSection
            title="Identidad"
            description="Datos de identificación y permanencia en inventario."
          >
            <DetailGrid>
              <DetailItem label="Año" value={String(vehicle.year)} />
              <DetailItem label="VIN" value={vehicle.vin} mono />
              <DetailItem label="Número de inventario" value={vehicle.stockNumber} mono />
              <DetailItem label="Días en inventario" value={String(vehicle.daysInInventory)} />
              <DetailItem
                label="Fecha de recepción"
                value={new Date(vehicle.dateReceived).toLocaleDateString("es-MX")}
              />
              <DetailItem
                label="Fecha de publicación"
                value={
                  vehicle.dateListed
                    ? new Date(vehicle.dateListed).toLocaleDateString("es-MX")
                    : undefined
                }
              />
              <DetailItem label="Ubicación en el lote" value={vehicle.lotLocation} />
            </DetailGrid>
          </DetailSection>

          <DetailSection
            title="Ficha técnica"
            description="Características visibles y datos técnicos capturados."
          >
            <DetailGrid>
              <DetailItem label="Versión / trim" value={vehicle.trim} />
              <DetailItem
                label="Estilo de carrocería"
                value={vehicle.bodyStyle ? BODY_STYLE_LABELS[vehicle.bodyStyle] : undefined}
              />
              <DetailItem label="Color exterior" value={vehicle.exteriorColor} />
              <DetailItem label="Color interior" value={vehicle.interiorColor} />
              <DetailItem
                label="Transmisión"
                value={vehicle.transmission ? TRANSMISSION_LABELS[vehicle.transmission] : undefined}
              />
              <DetailItem
                label="Combustible"
                value={vehicle.fuelType ? FUEL_TYPE_LABELS[vehicle.fuelType] : undefined}
              />
              <DetailItem
                label="Tracción"
                value={vehicle.drivetrain ? DRIVETRAIN_LABELS[vehicle.drivetrain] : undefined}
              />
            </DetailGrid>
          </DetailSection>

          <DetailSection
            title="Kilometraje y título"
            description="Datos de uso y documentación de la unidad."
          >
            <DetailGrid>
              <DetailItem
                label="Kilometraje"
                value={
                  vehicle.mileage !== null
                    ? `${vehicle.mileage.toLocaleString("es-MX")} ${
                        vehicle.mileageUnit ? MILEAGE_UNIT_LABELS[vehicle.mileageUnit] : ""
                      }`
                    : undefined
                }
              />
              <DetailItem
                label="Situación del título"
                value={vehicle.titleStatus ? TITLE_STATUS_LABELS[vehicle.titleStatus] : undefined}
              />
              <DetailItem label="Número de título" value={vehicle.titleNumber} />
              <DetailItem label="Título en poder del lote" value={vehicle.titleInHand ? "Sí" : "No"} />
            </DetailGrid>
          </DetailSection>

          <VehicleImagesSection
            vehicleId={vehicle.id}
            canWrite={canWrite}
            isVoided={vehicle.isVoided}
            images={vehicle.images}
          />

          <DetailSection
            title="Notas"
            description="Observaciones operativas visibles para el equipo."
          >
            <p className="text-sm whitespace-pre-wrap">{vehicle.notes ?? "Sin notas registradas."}</p>
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection
            title="Precio y estatus"
            description="Acciones frecuentes resguardadas por permisos y estado."
          >
            <div className="grid gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">Precio de lista</p>
                <p className="mt-1 text-lg font-semibold">
                  {vehicle.askingPrice ? formatMoney(vehicle.askingPrice) : "Sin precio"}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">Estatus actual</p>
                <div className="mt-2">
                  <StatusBadge tone={statusTone(vehicle.statusName)}>{vehicle.statusName}</StatusBadge>
                </div>
              </div>
            </div>
          </DetailSection>

          {canWrite && !vehicle.isVoided ? (
            <>
              <ChangeStatusForm
                code={vehicle.code}
                currentStatusId={vehicle.statusId}
                statuses={statuses}
              />
              <ChangePriceForm
                code={vehicle.code}
                currentAmount={vehicle.askingPrice?.amount ?? null}
              />
            </>
          ) : null}

          <DetailSection
            title="Historial de estatus"
            description="Cambios registrados en orden cronológico."
          >
            <StatusHistory entries={vehicle.statusHistory} />
          </DetailSection>
        </div>
      </div>
    </div>
  )
}

function missingFields(vehicle: VehicleDetailDTO): string[] {
  const missing: string[] = []
  if (!vehicle.vin) missing.push("VIN")
  if (!vehicle.titleInHand) missing.push("título en mano")
  if (!vehicle.askingPrice) missing.push("precio de lista")
  if (!vehicle.stockNumber) missing.push("número de inventario")
  return missing
}

function ChangeStatusForm({
  code,
  currentStatusId,
  statuses,
}: {
  code: string
  currentStatusId: string
  statuses: CatalogOption[]
}) {
  const [state, formAction] = useActionState(
    async (_previousState: ActionResult<unknown> | null, formData: FormData) => {
      const result = await changeVehicleStatusAction(code, formData)
      if (result.ok) {
        toastManager.add({ title: "Estatus actualizado" })
      }
      return result
    },
    null,
  )

  return (
    <form action={formAction} className="rounded-lg border p-4">
      <div className="grid gap-3">
        <Label htmlFor="change-status">Cambiar estatus</Label>
        <Select id="change-status" name="statusId" defaultValue={currentStatusId}>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {state && !state.ok ? <p className="text-xs text-destructive">{state.error}</p> : <span />}
          <SubmitButton size="sm">Guardar estatus</SubmitButton>
        </div>
      </div>
    </form>
  )
}

function ChangePriceForm({ code, currentAmount }: { code: string; currentAmount: number | null }) {
  const [state, formAction] = useActionState(
    async (_previousState: ActionResult<unknown> | null, formData: FormData) => {
      const result = await changeAskingPriceAction(code, formData)
      if (result.ok) {
        toastManager.add({ title: "Precio actualizado" })
      }
      return result
    },
    null,
  )

  return (
    <form action={formAction} className="rounded-lg border p-4">
      <div className="grid gap-3">
        <Label htmlFor="change-price">Cambiar precio de lista (USD)</Label>
        <Input
          id="change-price"
          name="askingPrice"
          type="number"
          min={0}
          step="0.01"
          defaultValue={currentAmount !== null ? currentAmount / 100 : ""}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {state && !state.ok ? <p className="text-xs text-destructive">{state.error}</p> : <span />}
          <SubmitButton size="sm">Guardar precio</SubmitButton>
        </div>
      </div>
    </form>
  )
}

function VoidVehicleDialog({ code }: { code: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(
    async (_previousState: ActionResult<unknown> | null, formData: FormData) => {
      const result = await voidVehicleAction(code, formData)
      if (result.ok) {
        toastManager.add({ title: "Vehículo anulado" })
        setOpen(false)
      }
      return result
    },
    null,
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            Anular
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular vehículo</DialogTitle>
          <DialogDescription>
            El vehículo saldrá del inventario y dejará de ofrecerse en transacciones nuevas. No se
            borra: sigue siendo consultable por su código.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="void-reason">Motivo</Label>
            <Textarea id="void-reason" name="reason" required rows={3} />
          </div>
          {state && !state.ok ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              }
            />
            <SubmitButton size="sm" variant="destructive">
              Anular
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function statusTone(statusName: string) {
  const normalized = statusName.toLowerCase()
  if (normalized.includes("vend")) return "success" as const
  if (normalized.includes("apart") || normalized.includes("proceso")) return "warning" as const
  if (normalized.includes("anulad")) return "destructive" as const
  return "neutral" as const
}
