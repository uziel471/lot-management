"use client"

import { useState, useTransition } from "react"

import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { listActiveModelsByMakeAction } from "../actions"
import type { CatalogOption } from "../types"

/**
 * Par de desplegables dependientes marca → modelo. Lo estrena esta
 * fase y lo consume el alta de vehículos (Fase 3), que es donde el
 * par se captura de verdad.
 *
 * Dos reglas viven aquí: el modelo elegido se limpia al cambiar de
 * marca —si no, quedaría enviado un modelo de otra marca— y la lista
 * de modelos se pide al servidor, que es quien sabe cuáles están
 * activos y si la marca sigue estándolo.
 */
export function MakeModelSelect({
  makes,
  makeFieldName = "makeId",
  modelFieldName = "modelId",
  defaultMakeId = "",
  defaultModelId = "",
  initialModels = [],
  required = true,
  disabled = false,
}: {
  makes: CatalogOption[]
  makeFieldName?: string
  modelFieldName?: string
  defaultMakeId?: string
  defaultModelId?: string
  /** Modelos de `defaultMakeId`, resueltos en el servidor: así el par abre ya poblado. */
  initialModels?: CatalogOption[]
  required?: boolean
  disabled?: boolean
}) {
  const [makeId, setMakeId] = useState(defaultMakeId)
  const [modelId, setModelId] = useState(defaultModelId)
  const [models, setModels] = useState<CatalogOption[]>(initialModels)
  const [pending, startTransition] = useTransition()

  function handleMakeChange(value: string) {
    setMakeId(value)
    // Cambiar de marca invalida el modelo elegido.
    setModelId("")

    if (!value) {
      setModels([])
      return
    }
    startTransition(async () => {
      setModels(await listActiveModelsByMakeAction(value))
    })
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <Label htmlFor="make-select">Marca</Label>
        <Select
          id="make-select"
          name={makeFieldName}
          value={makeId}
          required={required}
          disabled={disabled}
          onChange={(event) => handleMakeChange(event.target.value)}
        >
          <option value="">Selecciona una marca</option>
          {makes.map((make) => (
            <option key={make.id} value={make.id}>
              {make.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <Label htmlFor="model-select">Modelo</Label>
        <Select
          id="model-select"
          name={modelFieldName}
          value={modelId}
          required={required}
          disabled={disabled || !makeId || pending}
          onChange={(event) => setModelId(event.target.value)}
        >
          <option value="">
            {!makeId
              ? "Elige primero una marca"
              : pending
                ? "Cargando…"
                : models.length === 0
                  ? "Esta marca no tiene modelos activos"
                  : "Selecciona un modelo"}
          </option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}
