import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { PageContainer } from "@/components/shared/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCell, REPORT_CATEGORY_LABELS } from "@/features/reports/domain"
import type { ReportFilterOptions, ReportResult } from "@/features/reports/types"

function FilterField({
  label,
  name,
  children,
}: {
  label: string
  name: string
  children: React.ReactNode
}) {
  return (
    <label className="flex min-w-40 flex-col gap-1 text-xs font-medium text-muted-foreground" htmlFor={name}>
      {label}
      {children}
    </label>
  )
}

function supports(result: ReportResult, key: string) {
  return result.metadata.supportedFilters.includes(key as never)
}

export function ReportView({
  result,
  filterOptions,
  error,
}: {
  result: ReportResult
  filterOptions: ReportFilterOptions
  error: string | null
}) {
  return (
    <PageContainer>
      <PageHeader
        title={result.metadata.title}
        description={`${REPORT_CATEGORY_LABELS[result.metadata.category]} · ${result.metadata.description}`}
      >
        {result.metadata.supportedExports.map((format) => (
          <Link
            key={format}
            href={`/reportes/${result.metadata.id}/export?${new URLSearchParams({
              ...(result.selectedFilters.preset ? { preset: result.selectedFilters.preset } : {}),
              ...(result.selectedFilters.startDate ? { startDate: result.selectedFilters.startDate } : {}),
              ...(result.selectedFilters.endDate ? { endDate: result.selectedFilters.endDate } : {}),
              ...(result.selectedFilters.vehicleId ? { vehicleId: result.selectedFilters.vehicleId } : {}),
              ...(result.selectedFilters.vehicleStatusId ? { vehicleStatusId: result.selectedFilters.vehicleStatusId } : {}),
              ...(result.selectedFilters.providerId ? { providerId: result.selectedFilters.providerId } : {}),
              ...(result.selectedFilters.buyer ? { buyer: result.selectedFilters.buyer } : {}),
              ...(result.selectedFilters.paymentMethod ? { paymentMethod: result.selectedFilters.paymentMethod } : {}),
              ...(result.selectedFilters.category ? { category: result.selectedFilters.category } : {}),
              ...(result.selectedFilters.reportStatus ? { reportStatus: result.selectedFilters.reportStatus } : {}),
              ...(result.selectedFilters.search ? { search: result.selectedFilters.search } : {}),
              ...(result.selectedFilters.missingField ? { missingField: result.selectedFilters.missingField } : {}),
              ...(result.selectedFilters.includeVoided ? { includeVoided: "1" } : {}),
              format,
            }).toString()}`}
            className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted"
          >
            Exportar {format.toUpperCase()}
          </Link>
        ))}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Base de fecha: {result.metadata.dateBasis}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-5" action={`/reportes/${result.metadata.id}`}>
            {supports(result, "preset") ? (
              <FilterField label="Periodo" name="preset">
                <Select id="preset" name="preset" defaultValue={result.selectedFilters.preset}>
                  <option value="thisMonth">Este mes</option>
                  <option value="lastMonth">Mes pasado</option>
                  <option value="yearToDate">Ano a la fecha</option>
                  <option value="last12Months">Ultimos 12 meses</option>
                  <option value="allTime">Todo</option>
                  <option value="custom">Personalizado</option>
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "startDate") ? (
              <FilterField label="Inicio" name="startDate">
                <input id="startDate" name="startDate" type="date" defaultValue={result.selectedFilters.startDate} className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground" />
              </FilterField>
            ) : null}
            {supports(result, "endDate") ? (
              <FilterField label="Fin" name="endDate">
                <input id="endDate" name="endDate" type="date" defaultValue={result.selectedFilters.endDate} className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground" />
              </FilterField>
            ) : null}
            {supports(result, "vehicleId") ? (
              <FilterField label="Vehiculo" name="vehicleId">
                <Select id="vehicleId" name="vehicleId" defaultValue={result.selectedFilters.vehicleId ?? ""}>
                  <option value="">Todos</option>
                  {filterOptions.vehicles.map((vehicle) => (
                    <option key={vehicle.value} value={vehicle.value}>{vehicle.label}</option>
                  ))}
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "vehicleStatusId") ? (
              <FilterField label="Estatus vehiculo" name="vehicleStatusId">
                <Select id="vehicleStatusId" name="vehicleStatusId" defaultValue={result.selectedFilters.vehicleStatusId ?? ""}>
                  <option value="">Todos</option>
                  {filterOptions.statuses.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "providerId") ? (
              <FilterField label="Proveedor" name="providerId">
                <Select id="providerId" name="providerId" defaultValue={result.selectedFilters.providerId ?? ""}>
                  <option value="">Todos</option>
                  {filterOptions.providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "paymentMethod") ? (
              <FilterField label="Metodo" name="paymentMethod">
                <Select id="paymentMethod" name="paymentMethod" defaultValue={result.selectedFilters.paymentMethod ?? ""}>
                  <option value="">Todos</option>
                  {filterOptions.paymentMethods.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "category") ? (
              <FilterField label="Categoria" name="category">
                <Select id="category" name="category" defaultValue={result.selectedFilters.category ?? ""}>
                  <option value="">Todas</option>
                  {filterOptions.categories.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "missingField") ? (
              <FilterField label="Campo faltante" name="missingField">
                <Select id="missingField" name="missingField" defaultValue={result.selectedFilters.missingField ?? ""}>
                  <option value="">Todos</option>
                  {filterOptions.missingFields.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "buyer") ? (
              <FilterField label="Comprador" name="buyer">
                <input id="buyer" name="buyer" type="text" defaultValue={result.selectedFilters.buyer} className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground" />
              </FilterField>
            ) : null}
            {supports(result, "search") ? (
              <FilterField label="Buscar" name="search">
                <input id="search" name="search" type="text" defaultValue={result.selectedFilters.search} className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground" />
              </FilterField>
            ) : null}
            {supports(result, "reportStatus") ? (
              <FilterField label="Estatus" name="reportStatus">
                <Select id="reportStatus" name="reportStatus" defaultValue={result.selectedFilters.reportStatus ?? ""}>
                  <option value="">Todos</option>
                  <option value="unpaid">Sin pagar</option>
                  <option value="partial">Parcial</option>
                  <option value="paid">Pagado</option>
                </Select>
              </FilterField>
            ) : null}
            {supports(result, "includeVoided") ? (
              <label className="flex items-center gap-2 self-end text-sm text-muted-foreground">
                <input type="checkbox" name="includeVoided" value="1" defaultChecked={result.selectedFilters.includeVoided} />
                Incluir anulados
              </label>
            ) : null}
            <div className="flex items-end">
              <button type="submit" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-muted">
                Aplicar
              </button>
            </div>
          </form>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {result.summaries.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {result.summaries.map((summary) => (
            <Card key={summary.key} size="sm">
              <CardHeader>
                <CardTitle className="text-sm">{summary.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{formatCell(summary.value, summary.kind)}</p>
                {summary.note ? <p className="text-xs text-muted-foreground">{summary.note.reason}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {result.availabilityNotes.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Disponibilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {result.availabilityNotes.map((note, index) => (
                <li key={`${note.code}-${index}`}>{note.reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {result.formulas.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Formulas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {result.formulas.map((formula) => (
                <li key={formula}>{formula}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {result.rows.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="El filtro actual no encontro filas para este reporte."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>{result.rows.length} filas</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {result.columns.map((column) => (
                    <th key={column.key} className={`px-2 py-2 ${column.align === "right" ? "text-right" : ""}`}>
                      {column.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="border-b align-top last:border-0">
                    {result.columns.map((column) => (
                      <td key={column.key} className={`px-2 py-2 ${column.align === "right" ? "text-right" : ""}`}>
                        {formatCell(row.values[column.key], column.kind)}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.actions.map((action) => (
                          <Link key={action.href + action.label} href={action.href} className="text-sm text-primary hover:underline">
                            {action.label}
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
