import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/money"
import type {
  DashboardPeriodPreset,
  DashboardUnavailableNoteDTO,
  ExecutiveDashboardDTO,
} from "../types"

function formatCount(value: number) {
  return new Intl.NumberFormat("es-MX").format(value)
}

function formatPercent(value: number | null, digits = 2) {
  return value === null ? "No disponible" : `${value.toFixed(digits)}%`
}

function formatDays(value: number | null) {
  return value === null ? "No disponible" : `${value.toFixed(0)} días`
}

function MetricValue({
  value,
  note,
}: {
  value: string
  note?: DashboardUnavailableNoteDTO | null
}) {
  return (
    <div className="space-y-1">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note.reason}</p> : null}
    </div>
  )
}

function KpiCard({
  title,
  help,
  children,
}: {
  title: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {help ? <CardDescription>{help}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ChartPanel({
  title,
  description,
  items,
  emptyTitle,
  renderValue,
  highlightKey,
}: {
  title: string
  description: string
  items: { key: string; label: string; value: number }[]
  emptyTitle: string
  renderValue: (value: number) => string
  highlightKey?: (key: string) => boolean
}) {
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {max === 0 ? (
          <EmptyState title={emptyTitle} description="No hay datos que graficar para esta sección." className="py-8" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="font-medium tabular-nums">{renderValue(item.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={
                      item.value < 0
                        ? "h-2 rounded-full bg-destructive"
                        : highlightKey?.(item.key)
                          ? "h-2 rounded-full bg-amber-500"
                          : "h-2 rounded-full bg-primary"
                    }
                    style={{ width: `${Math.max(8, (Math.abs(item.value) / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PeriodControls({
  currentPreset,
  startDate,
  endDate,
}: {
  currentPreset: DashboardPeriodPreset
  startDate: string
  endDate: string
}) {
  const presets: { key: DashboardPeriodPreset; label: string }[] = [
    { key: "thisMonth", label: "Este mes" },
    { key: "lastMonth", label: "Mes pasado" },
    { key: "yearToDate", label: "Año a la fecha" },
    { key: "last12Months", label: "Últimos 12 meses" },
  ]

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Link
            key={preset.key}
            href={`/dashboard?preset=${preset.key}`}
            className={
              preset.key === currentPreset
                ? "inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                : "inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
            }
          >
            {preset.label}
          </Link>
        ))}
      </div>
      <form action="/dashboard" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="preset" value="custom" />
        <label className="flex min-w-40 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Inicio
          <input
            type="date"
            name="startDate"
            defaultValue={currentPreset === "custom" ? startDate : ""}
            className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
          />
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Fin
          <input
            type="date"
            name="endDate"
            defaultValue={currentPreset === "custom" ? endDate : ""}
            className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
        >
          Aplicar rango
        </button>
      </form>
    </div>
  )
}

function SalesSeriesCards({ dashboard }: { dashboard: ExecutiveDashboardDTO }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartPanel
        title="Ventas por periodo"
        description="Ingreso bruto de ventas activas agrupado según el rango seleccionado."
        items={dashboard.charts.sales.map((point) => ({
          key: point.key,
          label: point.label,
          value: point.revenueUsd.amount,
        }))}
        emptyTitle="Sin ventas en el periodo"
        renderValue={(value) => formatMoney({ amount: value, currency: "USD" })}
      />
      <ChartPanel
        title="Gross profit por periodo"
        description="Profit congelado en el snapshot de cada venta activa."
        items={dashboard.charts.sales.map((point) => ({
          key: point.key,
          label: point.label,
          value: point.grossProfitUsd.amount,
        }))}
        emptyTitle="Sin gross profit en el periodo"
        renderValue={(value) => formatMoney({ amount: value, currency: "USD" })}
      />
      <ChartPanel
        title="Unidades vendidas"
        description="Conteo de ventas activas agrupado por día, semana o mes."
        items={dashboard.charts.sales.map((point) => ({
          key: point.key,
          label: point.label,
          value: point.vehiclesSold,
        }))}
        emptyTitle="Sin unidades vendidas"
        renderValue={(value) => formatCount(value)}
      />
    </div>
  )
}

function InventorySummary({ dashboard }: { dashboard: ExecutiveDashboardDTO }) {
  const summary = dashboard.inventory

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventario actual</CardTitle>
        <CardDescription>
          Métricas de estado actual. No reconstruyen inventario histórico al cambiar el periodo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
            <p className="text-xl font-semibold">{formatCount(summary.totalAvailable)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor actual</p>
            <p className="text-xl font-semibold">{formatMoney(summary.currentInventoryValueUsd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Costo promedio</p>
            <p className="text-xl font-semibold">
              {summary.averageInventoryCostUsd ? formatMoney(summary.averageInventoryCostUsd) : "No disponible"}
            </p>
            {summary.averageInventoryCostNote ? (
              <p className="text-xs text-muted-foreground">{summary.averageInventoryCostNote.reason}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Días promedio</p>
            <p className="text-xl font-semibold">{formatDays(summary.averageDaysInInventory)}</p>
            {summary.averageDaysInInventoryNote ? (
              <p className="text-xs text-muted-foreground">{summary.averageDaysInInventoryNote.reason}</p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Más de 30 días</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{formatCount(summary.over30Count)}</p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Más de 60 días</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{formatCount(summary.over60Count)}</p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Más de 90 días</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{formatCount(summary.over90Count)}</p>
              </CardContent>
            </Card>
          </div>
          <ChartPanel
            title="Aging del inventario"
            description="Distribución actual por días en inventario."
            items={dashboard.charts.inventoryAging}
            emptyTitle="Sin inventario vigente"
            renderValue={(value) => formatCount(value)}
            highlightKey={(key) => key === ">90"}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ActionItems({ dashboard }: { dashboard: ExecutiveDashboardDTO }) {
  const hasActions =
    dashboard.actionItems.agedVehicles.length > 0 ||
    dashboard.actionItems.elevatedCostVehicles.length > 0 ||
    dashboard.actionItems.lowMarginSales.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguimiento accionable</CardTitle>
        <CardDescription>
          Vehículos envejecidos, costos elevados en inventario vigente y ventas con margen bajo o pérdida.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActions ? (
          <EmptyState
            title="Sin pendientes accionables"
            description="No se detectaron unidades envejecidas, costos elevados ni ventas con margen bajo para este corte."
            className="py-8"
          />
        ) : (
          <div className="space-y-6">
            {dashboard.actionItems.agedVehicles.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Vehículos con aging alto</h3>
                  <StatusBadge tone="warning">{dashboard.actionItems.agedVehicles.length}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {dashboard.actionItems.agedVehicles.map((item) => (
                    <div key={`aged-${item.vehicleId}`} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link href={item.vehicleHref} className="font-mono text-sm font-medium hover:underline">
                          {item.vehicleCode}
                        </Link>
                        <p className="text-sm">{item.vehicleDescription}</p>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                      <div className="text-sm sm:text-right">
                        <p>{item.daysInInventory} días</p>
                        <p className="text-muted-foreground">{formatMoney(item.currentCostUsd)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {dashboard.actionItems.elevatedCostVehicles.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Vehículos con costo elevado</h3>
                  <StatusBadge tone="warning">{dashboard.actionItems.elevatedCostVehicles.length}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {dashboard.actionItems.elevatedCostVehicles.map((item) => (
                    <div key={`cost-${item.vehicleId}`} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link href={item.vehicleHref} className="font-mono text-sm font-medium hover:underline">
                          {item.vehicleCode}
                        </Link>
                        <p className="text-sm">{item.vehicleDescription}</p>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                      <div className="text-sm sm:text-right">
                        <p>{formatMoney(item.currentCostUsd)}</p>
                        <p className="text-muted-foreground">{item.costVsAveragePct.toFixed(2)}% del promedio</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {dashboard.actionItems.lowMarginSales.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Ventas con margen bajo o pérdida</h3>
                  <StatusBadge tone="destructive">{dashboard.actionItems.lowMarginSales.length}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {dashboard.actionItems.lowMarginSales.map((item) => (
                    <div key={item.saleId} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link href={item.saleHref} className="font-mono text-sm font-medium hover:underline">
                          {item.saleCode}
                        </Link>
                        <p className="text-sm">
                          {item.vehicleCode} · {item.vehicleDescription}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                      <div className="text-sm sm:text-right">
                        <p>{formatMoney(item.grossProfitUsd)}</p>
                        <p className="text-muted-foreground">{formatPercent(item.grossMarginPct)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ExecutiveDashboard({ dashboard }: { dashboard: ExecutiveDashboardDTO }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard Ejecutivo"
        description={`KPIs financieros y operativos para ${dashboard.period.label.toLowerCase()}, con inventario siempre calculado como estado actual.`}
      />

      <PeriodControls
        currentPreset={dashboard.period.preset}
        startDate={dashboard.period.startDate}
        endDate={dashboard.period.endDate}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Inventario actual" help="Vehículos vigentes no anulados y sin venta activa.">
          <MetricValue value={formatCount(dashboard.kpis.currentInventoryCount)} />
        </KpiCard>
        <KpiCard title="Valor de inventario" help="Suma actual de compra, reparaciones activas y gastos relacionados por unidad vigente.">
          <MetricValue value={formatMoney(dashboard.kpis.currentInventoryValueUsd)} />
        </KpiCard>
        <KpiCard title="Unidades vendidas">
          <MetricValue value={formatCount(dashboard.kpis.vehiclesSold)} />
        </KpiCard>
        <KpiCard title="Ingresos por ventas">
          <MetricValue value={formatMoney(dashboard.kpis.salesRevenueUsd)} />
        </KpiCard>
        <KpiCard title="Costo vendido">
          <MetricValue value={formatMoney(dashboard.kpis.soldVehicleCostUsd)} />
        </KpiCard>
        <KpiCard title="Gross profit">
          <MetricValue value={formatMoney(dashboard.kpis.grossProfitUsd)} />
        </KpiCard>
        <KpiCard title="Margen bruto promedio" help="Gross profit del periodo dividido entre ingresos de ventas del mismo periodo.">
          <MetricValue
            value={formatPercent(dashboard.kpis.averageGrossMarginPct)}
            note={dashboard.kpis.averageGrossMarginNote}
          />
        </KpiCard>
        <KpiCard title="Precio promedio de venta">
          <MetricValue
            value={dashboard.kpis.averageSalePriceUsd ? formatMoney(dashboard.kpis.averageSalePriceUsd) : "No disponible"}
            note={dashboard.kpis.averageSalePriceNote}
          />
        </KpiCard>
        <KpiCard title="Días promedio en inventario" help="Promedio actual de días transcurridos desde `dateReceived` en las unidades vigentes.">
          <MetricValue
            value={formatDays(dashboard.kpis.averageDaysInInventory)}
            note={dashboard.kpis.averageDaysInInventoryNote}
          />
        </KpiCard>
        <KpiCard title="Gastos generales" help="Solo gastos vigentes sin vehículo asociado dentro del periodo seleccionado.">
          <MetricValue value={formatMoney(dashboard.kpis.generalExpensesUsd)} />
        </KpiCard>
      </div>

      <SalesSeriesCards dashboard={dashboard} />
      <InventorySummary dashboard={dashboard} />
      <ActionItems dashboard={dashboard} />
    </div>
  )
}
