import { describe, expect, it } from "vitest"
import {
  averageMoneyAmount,
  averageNumber,
  buildTimeSeriesBuckets,
  chartGroupingForRange,
  elevatedCostPct,
  grossMarginPct,
  inventoryAgingBucket,
  inventoryAgingDistribution,
  isElevatedCost,
  isLowMarginSale,
  resolveDashboardPeriod,
} from "./domain"

describe("resolveDashboardPeriod", () => {
  const today = new Date("2026-08-22T15:00:00.000Z")

  it("resuelve este mes", () => {
    const result = resolveDashboardPeriod({ preset: "thisMonth" }, today)
    expect(result.startDate).toBe("2026-08-01")
    expect(result.endDate).toBe("2026-08-22")
    expect(result.grouping).toBe("day")
  })

  it("resuelve mes pasado", () => {
    const result = resolveDashboardPeriod({ preset: "lastMonth" }, today)
    expect(result.startDate).toBe("2026-07-01")
    expect(result.endDate).toBe("2026-07-31")
    expect(result.grouping).toBe("day")
  })

  it("resuelve año a la fecha", () => {
    const result = resolveDashboardPeriod({ preset: "yearToDate" }, today)
    expect(result.startDate).toBe("2026-01-01")
    expect(result.endDate).toBe("2026-08-22")
    expect(result.grouping).toBe("month")
  })

  it("resuelve últimos 12 meses", () => {
    const result = resolveDashboardPeriod({ preset: "last12Months" }, today)
    expect(result.startDate).toBe("2025-08-23")
    expect(result.endDate).toBe("2026-08-22")
    expect(result.grouping).toBe("month")
  })

  it("resuelve rango personalizado válido", () => {
    const result = resolveDashboardPeriod(
      { preset: "custom", startDate: "2026-06-10", endDate: "2026-07-15" },
      today,
    )
    expect(result.startDate).toBe("2026-06-10")
    expect(result.endDate).toBe("2026-07-15")
    expect(result.grouping).toBe("week")
    expect(result.isCustom).toBe(true)
  })

  it("revierte a este mes si el rango personalizado es inválido", () => {
    const result = resolveDashboardPeriod(
      { preset: "custom", startDate: "2026-08-15", endDate: "2026-08-10" },
      today,
    )
    expect(result.preset).toBe("thisMonth")
    expect(result.startDate).toBe("2026-08-01")
    expect(result.endDate).toBe("2026-08-22")
  })
})

describe("chart grouping and buckets", () => {
  it("elige los umbrales de agrupación", () => {
    expect(chartGroupingForRange(31)).toBe("day")
    expect(chartGroupingForRange(32)).toBe("week")
    expect(chartGroupingForRange(180)).toBe("week")
    expect(chartGroupingForRange(181)).toBe("month")
  })

  it("genera buckets semanales y rellena cero", () => {
    const buckets = buildTimeSeriesBuckets(
      new Date("2026-06-10T00:00:00.000Z"),
      new Date("2026-06-25T23:59:59.999Z"),
      "week",
    )
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
    ])
    expect(buckets.every((bucket) => bucket.revenueUsd.amount === 0 && bucket.vehiclesSold === 0)).toBe(true)
  })
})

describe("dashboard formulas", () => {
  it("protege margen contra división entre cero", () => {
    expect(grossMarginPct(10_000, 0)).toBeNull()
    expect(grossMarginPct(50_000, 200_000)).toBe(25)
  })

  it("calcula promedios y promedios monetarios", () => {
    expect(averageNumber([])).toBeNull()
    expect(averageNumber([10, 11, 12])).toBe(11)
    expect(averageMoneyAmount(1_000_001, 3)).toBe(333_334)
  })

  it("ubica buckets de aging", () => {
    expect(inventoryAgingBucket(30)).toBe("0-30")
    expect(inventoryAgingBucket(31)).toBe("31-60")
    expect(inventoryAgingBucket(61)).toBe("61-90")
    expect(inventoryAgingBucket(91)).toBe(">90")
    expect(inventoryAgingDistribution([10, 35, 80, 120]).map((bucket) => bucket.value)).toEqual([1, 1, 1, 1])
  })

  it("detecta costos elevados y ventas con margen bajo", () => {
    expect(isElevatedCost(126_000, 100_000)).toBe(true)
    expect(isElevatedCost(124_999, 100_000)).toBe(false)
    expect(elevatedCostPct(150_000, 100_000)).toBe(150)
    expect(isLowMarginSale(-1, 100_000)).toBe(true)
    expect(isLowMarginSale(5_000, 100_000)).toBe(true)
    expect(isLowMarginSale(15_000, 100_000)).toBe(false)
  })
})
