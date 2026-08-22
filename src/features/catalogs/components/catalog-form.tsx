"use client"

import { useActionState, useState } from "react"

import { EmptyState } from "@/components/shared/empty-state"
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
import type { ActionResult } from "@/types/action-result"
import { saveCatalogEntryAction } from "../actions"
import type { CatalogFieldDef, CatalogMeta } from "../registry"
import type { CatalogEntryDTO, CatalogOption } from "../types"

/**
 * Formulario de alta y edición, en diálogo. Los campos salen del
 * registro del catálogo, así que agregar un campo a un catálogo es
 * declararlo, no escribir otro formulario.
 *
 * La validación que decide es la del servidor: aquí se pintan los
 * errores por campo que devuelve la Server Action, y los atributos
 * nativos (`required`, `type`) dan el aviso inmediato.
 */
export function CatalogForm({
  meta,
  entry,
  makeOptions,
  trigger,
}: {
  meta: CatalogMeta
  entry?: CatalogEntryDTO
  makeOptions: CatalogOption[]
  trigger: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const isEdit = Boolean(entry)
  const isModelCatalog = meta.key === "models"
  const hasActiveMakes = makeOptions.length > 0
  const currentMakeUnavailable = Boolean(
    isModelCatalog &&
      entry?.makeId &&
      !makeOptions.some((option) => option.id === entry.makeId),
  )
  const formBlocked = isModelCatalog && !hasActiveMakes

  const [state, formAction] = useActionState<ActionResult<CatalogEntryDTO> | null, FormData>(
    async (previousState, formData) => {
      const result = await saveCatalogEntryAction(previousState, formData)
      if (result.ok) {
        toastManager.add({
          title: isEdit ? `${meta.singular} actualizada` : `${meta.singular} creada`,
          description: `${result.data.name} · ${result.data.code}`,
        })
        setOpen(false)
      }
      return result
    },
    null,
  )

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="w-[min(36rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar ${meta.singular.toLowerCase()}` : meta.newEntryLabel}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Código ${entry?.code}. ${meta.formDescription}`
              : `${meta.formDescription} El sistema asigna el código al guardar.`}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="catalogKey" value={meta.key} />
          {entry ? <input type="hidden" name="code" value={entry.code} /> : null}

          {isEdit ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Código del sistema: <span className="font-mono text-foreground">{entry?.code}</span>
            </div>
          ) : null}

          {formBlocked ? (
            <EmptyState
              title="No hay marcas activas disponibles"
              description="Reactiva o registra una marca antes de crear o reasignar modelos. La validación del servidor sigue exigiendo una marca activa."
              className="items-start px-4 py-5 text-left"
            />
          ) : null}

          {currentMakeUnavailable ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              La marca actual de este modelo está inactiva. Selecciona una marca activa para
              reasignarlo antes de guardar.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {meta.fields.map((field) => (
              <CatalogFormField
                key={field.name}
                field={field}
                entry={entry}
                makeOptions={makeOptions}
                errors={fieldErrors[field.name]}
                disabled={formBlocked}
                currentMakeUnavailable={currentMakeUnavailable}
              />
            ))}
          </div>

          {state && !state.ok ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              }
            />
            <SubmitButton size="sm" pendingLabel="Guardando..." disabled={formBlocked}>
              {isEdit ? "Guardar cambios" : "Guardar"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CatalogFormField({
  field,
  entry,
  makeOptions,
  errors,
  disabled,
  currentMakeUnavailable,
}: {
  field: CatalogFieldDef
  entry?: CatalogEntryDTO
  makeOptions: CatalogOption[]
  errors?: string[]
  disabled?: boolean
  currentMakeUnavailable?: boolean
}) {
  const raw = entry ? (entry as unknown as Record<string, unknown>)[field.name] : undefined
  const defaultValue =
    currentMakeUnavailable && field.type === "make"
      ? ""
      : raw === null || raw === undefined
        ? ""
        : String(raw)
  const invalid = Boolean(errors?.length)
  const id = `catalog-field-${field.name}`
  const isTextarea = field.type === "textarea"

  return (
    <div className={isTextarea ? "flex flex-col gap-1 sm:col-span-2" : "flex flex-col gap-1"}>
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <span>
          {field.label}
          {field.required ? <span className="text-destructive"> *</span> : null}
        </span>
        {!field.required ? <span className="text-xs text-muted-foreground">Opcional</span> : null}
      </Label>

      {field.type === "make" ? (
        <Select
          id={id}
          name={field.name}
          defaultValue={defaultValue}
          required={field.required}
          aria-invalid={invalid}
          disabled={disabled}
        >
          <option value="">Selecciona una marca</option>
          {currentMakeUnavailable && entry?.makeId && entry.makeName ? (
            <option value={entry.makeId} disabled>
              {entry.makeName} (inactiva)
            </option>
          ) : null}
          {makeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea
          id={id}
          name={field.name}
          defaultValue={defaultValue}
          required={field.required}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          disabled={disabled}
        />
      ) : (
        <Input
          id={id}
          name={field.name}
          type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
          step={field.type === "number" ? 1 : undefined}
          defaultValue={defaultValue}
          required={field.required}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          disabled={disabled}
        />
      )}

      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      {errors?.map((error) => (
        <p key={error} className="text-xs text-destructive">
          {error}
        </p>
      ))}
    </div>
  )
}
