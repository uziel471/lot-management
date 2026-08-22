"use client"

import { useActionState, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { formatMoney } from "@/lib/money"
import { savePaymentAction } from "../actions"
import { paymentTotalUsd } from "../domain"
import { PAYMENT_EVIDENCE_TYPE_LABELS, PAYMENT_EVIDENCE_TYPE_OPTIONS, PAYMENT_METHOD_OPTIONS, PAYMENT_SOURCE_TYPE_LABELS } from "../enums"
import type { PaymentDetailDTO, SourcePayableOptionDTO } from "../types"

type FormResult = { ok: true; data: PaymentDetailDTO } | { ok: false; error: string; fieldErrors?: Record<string, string[]> } | null

type DraftApplication = {
  sourceType: SourcePayableOptionDTO["type"]
  sourceId: string
  appliedAmount: number
}

export function PaymentForm({
  vendors,
  payableSources,
  cancelHref,
}: {
  vendors: CatalogOption[]
  payableSources: SourcePayableOptionDTO[]
  cancelHref: string
}) {
  const router = useRouter()
  const [submissionToken, setSubmissionToken] = useState(() => crypto.randomUUID())
  const [currency, setCurrency] = useState<"USD" | "MXN">("USD")
  const [exchangeRate, setExchangeRate] = useState("1")
  const [amount, setAmount] = useState(0)
  const [applications, setApplications] = useState<DraftApplication[]>([])
  const [sourceSearch, setSourceSearch] = useState("")
  const [sourceType, setSourceType] = useState("")
  const [sourceProvider, setSourceProvider] = useState("")
  const [sourceVehicle, setSourceVehicle] = useState("")

  const [state, formAction] = useActionState<FormResult, FormData>(async (_prev, formData) => {
    const result = await savePaymentAction(null, formData)
    if (result.ok) {
      toastManager.add({ title: "Pago registrado", description: result.data.code })
      setSubmissionToken(crypto.randomUUID())
      router.push(`/pagos/${result.data.code}`)
    } else {
      setSubmissionToken(crypto.randomUUID())
      toastManager.add({ title: "No se pudo registrar", description: result.error })
    }
    return result
  }, null)

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  const selectedKeys = new Set(applications.map((application) => `${application.sourceType}:${application.sourceId}`))

  const availableSources = useMemo(() => {
    return payableSources.filter((source) => {
      if (selectedKeys.has(`${source.type}:${source.id}`)) return false
      if (sourceType && source.type !== sourceType) return false
      if (sourceProvider && source.providerId !== sourceProvider) return false
      if (sourceVehicle && source.vehicleId !== sourceVehicle) return false
      if (sourceSearch) {
        const haystack = [source.code, source.label, source.providerName ?? "", source.vehicleCode ?? "", source.vehicleDescription ?? ""]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(sourceSearch.trim().toLowerCase())) return false
      }
      return true
    })
  }, [payableSources, selectedKeys, sourceType, sourceProvider, sourceVehicle, sourceSearch])

  const selectedSources = useMemo(() => {
    return applications.map((application) => ({
      application,
      source: payableSources.find((source) => source.type === application.sourceType && source.id === application.sourceId)!,
    }))
  }, [applications, payableSources])

  const applicationsTotal = useMemo(
    () => applications.reduce((total, application) => total + application.appliedAmount, 0),
    [applications],
  )

  function handleCurrencyChange(value: string) {
    const nextCurrency = value as "USD" | "MXN"
    setCurrency(nextCurrency)
    if (nextCurrency === "USD") setExchangeRate("1")
  }

  function addSource(source: SourcePayableOptionDTO) {
    setApplications((current) => [
      ...current,
      { sourceType: source.type, sourceId: source.id, appliedAmount: source.pendingUsd.currency === "USD" && currency === "USD" ? source.pendingUsd.amount : 0 },
    ])
  }

  function removeSource(index: number) {
    setApplications((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function updateApplicationAmount(index: number, cents: number) {
    setApplications((current) => current.map((application, currentIndex) => (
      currentIndex === index ? { ...application, appliedAmount: cents } : application
    )))
  }

  function settlePending(index: number) {
    const source = selectedSources[index]?.source
    if (!source) return
    if (currency === "USD") {
      updateApplicationAmount(index, source.pendingUsd.amount)
      return
    }
    const estimated = Math.round(source.pendingUsd.amount * Number(exchangeRate || "0"))
    updateApplicationAmount(index, estimated)
  }

  return (
    <form action={formAction} className="flex max-w-6xl flex-col gap-6">
      <input type="hidden" name="submissionToken" value={submissionToken} />

      <FormSection title="Datos del pago" description="Fecha, método y proveedor operativo cuando aplica.">
        <Field label="Fecha de pago" required error={fieldErrors.paymentDate}>
          <Input name="paymentDate" type="date" required />
        </Field>

        <Field label="Método" required error={fieldErrors.method}>
          <Select name="method" defaultValue="" required>
            <option value="">Selecciona un método</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Proveedor" error={fieldErrors.providerId}>
          <Select name="providerId" defaultValue="">
            <option value="">Sin proveedor explícito</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Moneda e importe" description="El tipo de cambio se congela al guardar y el USD se calcula en vivo.">
        <Field label="Moneda" required error={fieldErrors.currency}>
          <Select name="currency" value={currency} onChange={(event) => handleCurrencyChange(event.target.value)} required>
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
          </Select>
        </Field>

        <Field label="Tipo de cambio" required error={fieldErrors.exchangeRate}>
          <Input
            name="exchangeRate"
            value={exchangeRate}
            onChange={(event) => setExchangeRate(event.target.value)}
            disabled={currency === "USD"}
            required
          />
        </Field>

        <Field label="Monto del pago" required error={fieldErrors.amount}>
          <MoneyInput name="amount" onChangeCents={setAmount} />
        </Field>

        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Equivalente USD</p>
          <p className="mt-1 text-base font-semibold">
            {(() => {
              try {
                return formatMoney(paymentTotalUsd(amount, currency, exchangeRate || "0"))
              } catch {
                return "—"
              }
            })()}
          </p>
        </div>
      </FormSection>

      <FormSection title="Aplicaciones" description="Selecciona obligaciones pagables y distribuye el importe del pago.">
        <div className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-1">
            <Label htmlFor="source-search" className="text-xs text-muted-foreground">Buscar</Label>
            <Input id="source-search" value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Código, proveedor o vehículo" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="source-type" className="text-xs text-muted-foreground">Documento</Label>
            <Select id="source-type" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(PAYMENT_SOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="source-provider" className="text-xs text-muted-foreground">Proveedor</Label>
            <Select id="source-provider" value={sourceProvider} onChange={(event) => setSourceProvider(event.target.value)}>
              <option value="">Todos</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="source-vehicle" className="text-xs text-muted-foreground">Vehículo</Label>
            <Select id="source-vehicle" value={sourceVehicle} onChange={(event) => setSourceVehicle(event.target.value)}>
              <option value="">Todos</option>
              {Array.from(new Map(payableSources.filter((source) => source.vehicleId).map((source) => [
                source.vehicleId!,
                { code: source.vehicleCode!, description: source.vehicleDescription! },
              ])).entries()).map(([vehicleId, vehicle]) => (
                <option key={vehicleId} value={vehicleId}>{vehicle.code} · {vehicle.description}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">Documentos pagables</p>
            </div>
            <div className="max-h-80 overflow-auto">
              {availableSources.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No hay documentos disponibles con esos filtros.</p>
              ) : (
                <div className="divide-y">
                  {availableSources.map((source) => (
                    <div key={`${source.type}:${source.id}`} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{source.code}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.providerName ?? "Sin proveedor"} · {source.vehicleCode ?? "Sin vehículo"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pendiente: {formatMoney(source.pendingUsd)} de {formatMoney(source.totalUsd)}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => addSource(source)}>
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">Aplicaciones del pago</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Documento</th>
                    <th className="px-4 py-2 text-right">Pendiente USD</th>
                    <th className="px-4 py-2 text-right">Importe</th>
                    <th className="px-4 py-2 text-right">USD</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Agrega al menos un documento para distribuir el pago.
                      </td>
                    </tr>
                  ) : (
                    selectedSources.map(({ source, application }, index) => {
                      const usd = (() => {
                        try {
                          return paymentTotalUsd(application.appliedAmount, currency, exchangeRate || "0")
                        } catch {
                          return { amount: 0, currency: "USD" as const }
                        }
                      })()
                      return (
                        <tr key={`${application.sourceType}:${application.sourceId}`} className="border-b align-top last:border-0">
                          <td className="px-4 py-3">
                            <input type="hidden" name={`applications.${index}.sourceType`} value={application.sourceType} />
                            <input type="hidden" name={`applications.${index}.sourceId`} value={application.sourceId} />
                            <p className="font-medium">{source.code}</p>
                            <p className="text-xs text-muted-foreground">{source.providerName ?? "Sin proveedor"} · {source.vehicleCode ?? "Sin vehículo"}</p>
                          </td>
                          <td className="px-4 py-3 text-right">{formatMoney(source.pendingUsd)}</td>
                          <td className="px-4 py-3">
                            <div className="min-w-28">
                              <MoneyInput
                                name={`applications.${index}.appliedAmount`}
                                defaultValueCents={application.appliedAmount}
                                onChangeCents={(cents) => updateApplicationAmount(index, cents)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">{formatMoney(usd)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => settlePending(index)}>
                                Liquidar
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeSource(index)}>
                                Quitar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">Aplicado: {formatMoney({ amount: applicationsTotal, currency })}</p>
              <p className={applicationsTotal === amount ? "font-medium" : "font-medium text-destructive"}>
                Capturado: {formatMoney({ amount, currency })}
              </p>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Referencias, evidencia y notas" description="Metadatos consultables del pago, sin adjuntos binarios.">
        <Field label="Referencia" error={fieldErrors.referenceNumber}>
          <Input name="referenceNumber" />
        </Field>
        <Field label="Cuenta o etiqueta" error={fieldErrors.accountLabel}>
          <Input name="accountLabel" />
        </Field>
        <Field label="Tipo de evidencia">
          <Select name="evidence.0.type" defaultValue="">
            <option value="">Sin evidencia</option>
            {PAYMENT_EVIDENCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {PAYMENT_EVIDENCE_TYPE_LABELS[option.value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Etiqueta de evidencia">
          <Input name="evidence.0.label" />
        </Field>
        <Field label="Liga de evidencia">
          <Input name="evidence.0.url" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notas" error={fieldErrors.notes}>
            <Textarea name="notes" rows={4} />
          </Field>
        </div>
      </FormSection>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Registrar pago</SubmitButton>
        <Button type="button" variant="outline" render={<Link href={cancelHref} />}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string[]
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
      {error?.length ? <p className="text-xs text-destructive">{error[0]}</p> : null}
    </div>
  )
}
