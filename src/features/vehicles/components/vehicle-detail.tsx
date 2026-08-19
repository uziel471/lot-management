"use client"

import { useActionState, useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
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
import { Select } from "@/components/ui/select"
import { SubmitButton } from "@/components/shared/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

/**
 * Ficha de lectura del vehículo, con acciones puntuales para cambiar
 * estatus y precio —las dos cosas que cambian a menudo— y el
 * señalamiento de lo que falta por capturar (ver design.md).
 */
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{vehicle.description}</h1>
            <span className="font-mono text-xs text-muted-foreground">{vehicle.code}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{vehicle.statusName}</Badge>
            {vehicle.isVoided ? <Badge variant="destructive">Anulado</Badge> : null}
            {vehicle.titleInHand ? (
              <Badge variant="secondary">Título en mano</Badge>
            ) : (
              <Badge variant="muted">Sin título en mano</Badge>
            )}
          </div>
        </div>

        {canWrite && !vehicle.isVoided ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/vehiculos/${vehicle.code}/editar`}>Editar</Link>}
            />
            {canVoid ? <VoidVehicleDialog code={vehicle.code} /> : null}
          </div>
        ) : null}
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

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Ficha</h2>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Detail label="Año" value={String(vehicle.year)} />
            <Detail label="VIN" value={vehicle.vin ?? "—"} mono />
            <Detail label="Número de inventario" value={vehicle.stockNumber ?? "—"} mono />
            <Detail label="Días en inventario" value={String(vehicle.daysInInventory)} />
            <Detail label="Versión / trim" value={vehicle.trim ?? "—"} />
            <Detail
              label="Estilo de carrocería"
              value={vehicle.bodyStyle ? BODY_STYLE_LABELS[vehicle.bodyStyle] : "—"}
            />
            <Detail label="Color exterior" value={vehicle.exteriorColor ?? "—"} />
            <Detail label="Color interior" value={vehicle.interiorColor ?? "—"} />
            <Detail
              label="Kilometraje"
              value={
                vehicle.mileage !== null
                  ? `${vehicle.mileage.toLocaleString("es-MX")} ${
                      vehicle.mileageUnit ? MILEAGE_UNIT_LABELS[vehicle.mileageUnit] : ""
                    }`
                  : "—"
              }
            />
            <Detail
              label="Transmisión"
              value={vehicle.transmission ? TRANSMISSION_LABELS[vehicle.transmission] : "—"}
            />
            <Detail label="Combustible" value={vehicle.fuelType ? FUEL_TYPE_LABELS[vehicle.fuelType] : "—"} />
            <Detail
              label="Tracción"
              value={vehicle.drivetrain ? DRIVETRAIN_LABELS[vehicle.drivetrain] : "—"}
            />
            <Detail
              label="Situación del título"
              value={vehicle.titleStatus ? TITLE_STATUS_LABELS[vehicle.titleStatus] : "—"}
            />
            <Detail label="Número de título" value={vehicle.titleNumber ?? "—"} />
            <Detail
              label="Fecha de recepción"
              value={new Date(vehicle.dateReceived).toLocaleDateString("es-MX")}
            />
            <Detail
              label="Fecha de publicación"
              value={vehicle.dateListed ? new Date(vehicle.dateListed).toLocaleDateString("es-MX") : "—"}
            />
            <Detail label="Ubicación en el lote" value={vehicle.lotLocation ?? "—"} />
          </dl>
          {vehicle.notes ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Notas</p>
              <p className="text-sm whitespace-pre-wrap">{vehicle.notes}</p>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          {canWrite && !vehicle.isVoided ? (
            <>
              <ChangeStatusForm code={vehicle.code} currentStatusId={vehicle.statusId} statuses={statuses} />
              <ChangePriceForm code={vehicle.code} currentAmount={vehicle.askingPrice?.amount ?? null} />
            </>
          ) : (
            <Detail
              label="Precio de lista"
              value={vehicle.askingPrice ? formatMoney(vehicle.askingPrice) : "Sin precio"}
            />
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold">Historial de estatus</h2>
            <StatusHistory entries={vehicle.statusHistory} />
          </div>
        </section>
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

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </>
  )
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
    <form action={formAction} className="flex items-end gap-2 rounded-lg border p-3">
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="change-status">Cambiar estatus</Label>
        <Select id="change-status" name="statusId" defaultValue={currentStatusId}>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton size="sm">Guardar</SubmitButton>
      {state && !state.ok ? <p className="text-xs text-destructive">{state.error}</p> : null}
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
    <form action={formAction} className="flex items-end gap-2 rounded-lg border p-3">
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="change-price">Cambiar precio de lista (USD)</Label>
        <Input
          id="change-price"
          name="askingPrice"
          type="number"
          min={0}
          step="0.01"
          defaultValue={currentAmount !== null ? currentAmount / 100 : ""}
        />
      </div>
      <SubmitButton size="sm">Guardar</SubmitButton>
      {state && !state.ok ? <p className="text-xs text-destructive">{state.error}</p> : null}
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
      <DialogTrigger render={<Button variant="destructive" size="sm">Anular</Button>} />
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
