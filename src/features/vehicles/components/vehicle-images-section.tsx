"use client"

import { Expand, ImagePlus, Trash2 } from "lucide-react"
import { useActionState, useEffect, useRef, useState } from "react"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DetailSection } from "@/components/shared/detail-section"
import { EmptyState } from "@/components/shared/empty-state"
import { SubmitButton } from "@/components/shared/submit-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toastManager } from "@/components/ui/toast"
import type { ActionResult } from "@/types/action-result"
import { deleteVehicleImageAction, uploadVehicleImageAction } from "../actions"
import {
  VEHICLE_IMAGE_ACCEPT,
  VEHICLE_IMAGE_MAX_ACTIVE,
  vehicleImageRulesDescription,
} from "../domain"
import type { VehicleImageDTO } from "../types"

type ImageMutationResult = ActionResult<{ ids: string[]; uploadedCount: number }> | null

function formatByteSize(byteSize: number) {
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`
}

export function VehicleImagesSection({
  vehicleId,
  canWrite,
  isVoided,
  images,
}: {
  vehicleId: string
  canWrite: boolean
  isVoided: boolean
  images: VehicleImageDTO[]
}) {
  const [selectedImage, setSelectedImage] = useState<VehicleImageDTO | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [uploadState, formAction, pending] = useActionState<ImageMutationResult, FormData>(
    uploadVehicleImageAction.bind(null, vehicleId),
    null,
  )

  useEffect(() => {
    if (!uploadState) return

    if (uploadState.ok) {
      formRef.current?.reset()
      toastManager.add({
        title: uploadState.data.uploadedCount === 1 ? "Imagen agregada" : "Imágenes agregadas",
        description:
          uploadState.data.uploadedCount === 1
            ? undefined
            : `${uploadState.data.uploadedCount} archivos cargados`,
      })
      return
    }

    toastManager.add({
      title: "No se pudo subir la imagen",
      description: uploadState.error,
    })
  }, [uploadState])

  const fieldErrors = uploadState && !uploadState.ok ? (uploadState.fieldErrors ?? {}) : {}

  return (
    <DetailSection
      title="Imágenes"
      description="Fotos de la unidad para consulta operativa y validación visual."
      actions={
        <p className="text-xs text-muted-foreground">
          {images.length}/{VEHICLE_IMAGE_MAX_ACTIVE} activas
        </p>
      }
    >
      {canWrite ? (
        <form ref={formRef} action={formAction} className="grid gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Agregar imagen</p>
              <p className="text-xs text-muted-foreground">{vehicleImageRulesDescription()}</p>
            </div>
            {isVoided ? (
              <p className="text-xs text-muted-foreground">
                La carga está deshabilitada para vehículos anulados.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Archivos</span>
              <input
                name="images"
                type="file"
                multiple
                accept={VEHICLE_IMAGE_ACCEPT}
                disabled={pending || isVoided}
                className="h-9 rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
            <SubmitButton size="sm" pendingLabel="Subiendo…" disabled={isVoided}>
              <ImagePlus />
              Subir imagen
            </SubmitButton>
          </div>

          {fieldErrors.images ? (
            <p className="text-xs text-destructive">{fieldErrors.images.join(" ")}</p>
          ) : null}
        </form>
      ) : null}

      {images.length === 0 ? (
        <EmptyState
          title="Sin imágenes registradas"
          description="La ficha del vehículo todavía no tiene evidencia visual cargada."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <article key={image.id} className="overflow-hidden rounded-lg border">
              <button
                type="button"
                onClick={() => setSelectedImage(image)}
                className="group flex w-full flex-col text-left"
              >
                {image.renderUrl ? (
                  <img
                    src={image.renderUrl}
                    alt={image.originalFileName}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">
                    Vista previa no disponible
                  </div>
                )}
                <div className="grid gap-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">{image.originalFileName}</p>
                    <Expand className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(image.createdAt).toLocaleDateString("es-MX")} · {formatByteSize(image.byteSize)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {image.createdByName ?? "Usuario no disponible"}
                  </p>
                </div>
              </button>

              {canWrite ? (
                <div className="border-t p-2">
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" title="Eliminar imagen">
                        <Trash2 />
                        Eliminar
                      </Button>
                    }
                    title="Eliminar imagen"
                    description="La imagen dejará de mostrarse en la ficha del vehículo."
                    confirmLabel="Eliminar"
                    variant="destructive"
                    onConfirm={async () => {
                      const result = await deleteVehicleImageAction(vehicleId, image.id)
                      if (result.ok) {
                        toastManager.add({ title: "Imagen eliminada" })
                        return
                      }

                      toastManager.add({
                        title: "No se pudo eliminar la imagen",
                        description: result.error,
                      })
                    }}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selectedImage)} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="w-[min(48rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{selectedImage?.originalFileName ?? "Imagen"}</DialogTitle>
            <DialogDescription>
              {selectedImage
                ? `${new Date(selectedImage.createdAt).toLocaleString("es-MX")} · ${formatByteSize(selectedImage.byteSize)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedImage?.renderUrl ? (
            <img
              src={selectedImage.renderUrl}
              alt={selectedImage.originalFileName}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
              Vista previa no disponible
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DetailSection>
  )
}
