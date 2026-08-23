import { describe, expect, it } from "vitest"
import { buildFinancialReport } from "./builders/financial-reports"
import { listReportCatalogItems } from "./registry"
import type { ReportDataset } from "./builders/common"

describe("reports registry", () => {
  it("lists catalog items with exports and key categories", () => {
    const items = listReportCatalogItems()
    expect(items.some((item) => item.id === "profit-loss")).toBe(true)
    expect(items.some((item) => item.id === "sales-tax-preparation" && item.availability === "partial")).toBe(true)
    expect(items.every((item) => item.exportDescriptors.length >= 1)).toBe(true)
  })

  it("builds financial report rows from sale snapshots", () => {
    const dataset = {
      generatedAt: "2026-08-23T00:00:00.000Z",
      vehicles: [
        {
          id: "veh-1",
          code: "VEH-1",
          description: "2020 Test Car",
          statusId: "status-1",
          statusName: "Disponible",
          vin: "VIN123",
          stockNumber: "STK1",
          titleNumber: "TT1",
          titleInHand: true,
          dateReceived: "2026-08-01T00:00:00.000Z",
          askingPriceUsd: 500000,
          daysInInventory: 20,
          isVoided: false,
        },
      ],
      activeVehicles: [],
      sales: [
        {
          _id: "sale-1",
          code: "SALE-1",
          vehicleId: "veh-1",
          saleDate: new Date("2026-08-10T00:00:00.000Z"),
          buyerName: "Cliente",
          salePriceUsd: 800000,
          acquisitionCostUsd: 500000,
          repairCostUsd: 50000,
          vehicleExpenseCostUsd: 25000,
          totalCostUsd: 575000,
          profitUsd: 225000,
          voidedAt: null,
          referenceNumber: "REF-1",
        },
      ],
      activeSales: [],
      purchases: [],
      repairs: [],
      expenses: [],
      payments: [],
      vendorNames: new Map(),
      vehicleById: new Map(),
      saleByVehicleId: new Map(),
      acquisitionByVehicleId: new Map(),
      repairByVehicleId: new Map(),
      expenseByVehicleId: new Map(),
      payables: [],
    } as unknown as ReportDataset
    dataset.vehicleById.set("veh-1", dataset.vehicles[0]!)

    const report = buildFinancialReport("sales-profitability", dataset, {
      preset: "thisMonth",
      includeVoided: false,
      start: null,
      end: null,
    })

    expect(report.rows).toHaveLength(1)
    expect((report.rows[0]?.values.grossProfitUsd as { amount: number }).amount).toBe(225000)
    expect((report.rows[0]?.values.totalCostUsd as { amount: number }).amount).toBe(575000)
  })
})
