import type {
  DashboardBarPointDTO,
  DashboardChartGrouping,
  DashboardPeriodInput,
  DashboardPeriodPreset,
  DashboardTimeSeriesPointDTO,
  DashboardUnavailableNoteDTO,
  ExecutiveDashboardPeriodDTO,
} from "./types"

const MS_PER_DAY = 24 * 60 * 60 * 1000
const ELEVATED_COST_MULTIPLIER = 1.25
const LOW_MARGIN_THRESHOLD_PCT = 10

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function endOfUtcMonth(date: Date) {
  return endOfUtcDay(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)))
}

function startOfUtcYear(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function differenceInDaysInclusive(start: Date, end: Date) {
  return Math.floor((startOfUtcDay(end).getTime() - startOfUtcDay(start).getTime()) / MS_PER_DAY) + 1
}

export function chartGroupingForRange(rangeDays: number): DashboardChartGrouping {
  if (rangeDays <= 31) return "day"
  if (rangeDays <= 180) return "week"
  return "month"
}

export function resolveDashboardPeriod(
  input: DashboardPeriodInput = {},
  today: Date = new Date(),
): ExecutiveDashboardPeriodDTO & { start: Date; end: Date } {
  const normalizedToday = startOfUtcDay(today)
  const preset = (input.preset ?? "thisMonth") as DashboardPeriodPreset

  let normalizedPreset: DashboardPeriodPreset = preset
  let start = startOfUtcMonth(normalizedToday)
  let end = endOfUtcDay(normalizedToday)
  let label = "Este mes"

  if (preset === "lastMonth") {
    const anchor = new Date(Date.UTC(normalizedToday.getUTCFullYear(), normalizedToday.getUTCMonth() - 1, 1))
    start = startOfUtcMonth(anchor)
    end = endOfUtcMonth(anchor)
    label = "Mes pasado"
  } else if (preset === "yearToDate") {
    start = startOfUtcYear(normalizedToday)
    end = endOfUtcDay(normalizedToday)
    label = "Año a la fecha"
  } else if (preset === "last12Months") {
    start = startOfUtcDay(new Date(Date.UTC(normalizedToday.getUTCFullYear() - 1, normalizedToday.getUTCMonth(), normalizedToday.getUTCDate() + 1)))
    end = endOfUtcDay(normalizedToday)
    label = "Últimos 12 meses"
  } else if (preset === "custom") {
    const customStart = parseDateInput(input.startDate)
    const customEnd = parseDateInput(input.endDate)
    if (customStart && customEnd && customStart.getTime() <= customEnd.getTime()) {
      start = startOfUtcDay(customStart)
      end = endOfUtcDay(customEnd)
      label = "Rango personalizado"
    } else {
      normalizedPreset = "thisMonth"
    }
  }

  const rangeDays = differenceInDaysInclusive(start, end)
  return {
    preset: normalizedPreset,
    label,
    startDate: isoDate(start),
    endDate: isoDate(end),
    grouping: chartGroupingForRange(rangeDays),
    rangeDays,
    isCustom: normalizedPreset === "custom",
    start,
    end,
  }
}

function startOfUtcWeek(date: Date) {
  const day = date.getUTCDay()
  const offset = day === 0 ? -6 : 1 - day
  return startOfUtcDay(addUtcDays(date, offset))
}

function startOfBucket(date: Date, grouping: DashboardChartGrouping) {
  if (grouping === "day") return startOfUtcDay(date)
  if (grouping === "week") return startOfUtcWeek(date)
  return startOfUtcMonth(date)
}

function nextBucketStart(date: Date, grouping: DashboardChartGrouping) {
  if (grouping === "day") return addUtcDays(date, 1)
  if (grouping === "week") return addUtcDays(date, 7)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

function endOfBucket(date: Date, grouping: DashboardChartGrouping) {
  return endOfUtcDay(addUtcDays(nextBucketStart(date, grouping), -1))
}

function formatBucketLabel(start: Date, end: Date, grouping: DashboardChartGrouping) {
  if (grouping === "day") return isoDate(start)
  if (grouping === "month") {
    return new Intl.DateTimeFormat("es-MX", { month: "short", year: "numeric", timeZone: "UTC" }).format(start)
  }
  const short = new Intl.DateTimeFormat("es-MX", { month: "short", day: "numeric", timeZone: "UTC" })
  return `${short.format(start)} – ${short.format(end)}`
}

export function buildTimeSeriesBuckets(
  start: Date,
  end: Date,
  grouping: DashboardChartGrouping,
): DashboardTimeSeriesPointDTO[] {
  const points: DashboardTimeSeriesPointDTO[] = []
  let cursor = startOfBucket(start, grouping)
  const finalBucket = startOfBucket(end, grouping)

  while (cursor.getTime() <= finalBucket.getTime()) {
    const bucketEnd = endOfBucket(cursor, grouping)
    points.push({
      key: isoDate(cursor),
      label: formatBucketLabel(cursor, bucketEnd, grouping),
      bucketStart: isoDate(cursor),
      bucketEnd: isoDate(bucketEnd),
      revenueUsd: { amount: 0, currency: "USD" },
      grossProfitUsd: { amount: 0, currency: "USD" },
      vehiclesSold: 0,
    })
    cursor = nextBucketStart(cursor, grouping)
  }

  return points
}

export function grossMarginPct(grossProfitAmount: number, revenueAmount: number): number | null {
  if (revenueAmount <= 0) return null
  return Math.round((grossProfitAmount / revenueAmount) * 10_000) / 100
}

export function averageNumber(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
}

export function unavailable(reason: string): DashboardUnavailableNoteDTO {
  return { reason }
}

export function averageMoneyAmount(amount: number, count: number): number | null {
  if (count <= 0) return null
  return Math.round(amount / count)
}

export function inventoryAgingBucket(daysInInventory: number): DashboardBarPointDTO["key"] {
  if (daysInInventory <= 30) return "0-30"
  if (daysInInventory <= 60) return "31-60"
  if (daysInInventory <= 90) return "61-90"
  return ">90"
}

export function inventoryAgingDistribution(days: readonly number[]): DashboardBarPointDTO[] {
  const buckets = new Map<string, number>([
    ["0-30", 0],
    ["31-60", 0],
    ["61-90", 0],
    [">90", 0],
  ])

  for (const value of days) {
    const key = inventoryAgingBucket(value)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return [
    { key: "0-30", label: "0-30 días", value: buckets.get("0-30") ?? 0 },
    { key: "31-60", label: "31-60 días", value: buckets.get("31-60") ?? 0 },
    { key: "61-90", label: "61-90 días", value: buckets.get("61-90") ?? 0 },
    { key: ">90", label: "Más de 90 días", value: buckets.get(">90") ?? 0 },
  ]
}

export function isElevatedCost(currentCostAmount: number, averageCostAmount: number | null): boolean {
  return averageCostAmount !== null && averageCostAmount > 0 && currentCostAmount >= averageCostAmount * ELEVATED_COST_MULTIPLIER
}

export function elevatedCostPct(currentCostAmount: number, averageCostAmount: number): number {
  return Math.round((currentCostAmount / averageCostAmount) * 10_000) / 100
}

export function isLowMarginSale(grossProfitAmount: number, salePriceAmount: number): boolean {
  if (grossProfitAmount < 0) return true
  const margin = grossMarginPct(grossProfitAmount, salePriceAmount)
  return margin !== null && margin < LOW_MARGIN_THRESHOLD_PCT
}
