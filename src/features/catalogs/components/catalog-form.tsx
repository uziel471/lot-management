"use client"

import { useActionState, useState } from "react"

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

  // La confirmación y el cierre del diálogo ocurren dentro de la
  // propia acción, no en un efecto: es el resultado de la escritura
  // lo que los dispara, no un cambio de estado que haya que observar.
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar ${meta.singular.toLowerCase()}` : meta.newEntryLabel}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Código ${entry?.code}. El código no se puede cambiar.`
              : "El sistema asigna el código al guardar."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="catalogKey" value={meta.key} />
          {entry ? <input type="hidden" name="code" value={entry.code} /> : null}

          {meta.fields.map((field) => (
            <CatalogFormField
              key={field.name}
              field={field}
              entry={entry}
              makeOptions={makeOptions}
              errors={fieldErrors[field.name]}
            />
          ))}

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
            <SubmitButton size="sm">{isEdit ? "Guardar cambios" : "Crear"}</SubmitButton>
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
}: {
  field: CatalogFieldDef
  entry?: CatalogEntryDTO
  makeOptions: CatalogOption[]
  errors?: string[]
}) {
  const raw = entry ? (entry as unknown as Record<string, unknown>)[field.name] : undefined
  const defaultValue = raw === null || raw === undefined ? "" : String(raw)
  const invalid = Boolean(errors?.length)
  const id = `catalog-field-${field.name}`

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span className="text-destructive">*</span> : null}
      </Label>

      {field.type === "make" ? (
        <Select
          id={id}
          name={field.name}
          defaultValue={defaultValue}
          required={field.required}
          aria-invalid={invalid}
        >
          <option value="">Selecciona una marca</option>
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
        />
      )}

      {field.helpText ? (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      ) : null}
      {errors?.map((error) => (
        <p key={error} className="text-xs text-destructive">
          {error}
        </p>
      ))}
    </div>
  )
}
