import { describe, expect, it } from "vitest"
import { buildAdminReport } from "./admin-reports"
import { buildExpenseReport } from "./expense-reports"
import { buildFinancialReport } from "./financial-reports"
import { buildPayablesReport } from "./payables-reports"
import type { ReportDataset } from "./common"
import type { ReportResolvedFilters } from "../types"

const baseFilters: ReportResolvedFilters = {
  preset: "thisMonth",
  includeVoided: false,
  start: new Date("2026-08-01T00:00:00.000Z"),
  end: new Date("2026-08-31T23:59:59.999Z"),
}

function buildDataset(): ReportDataset {
  const soldVehicle = {
    id: "veh-sold",
    code: "VEH-1",
    description: "2020 Test Car",
    statusId: "status-1",
    statusName: "Disponible",
    vin: "VIN123",
    stockNumber: "STK1",
    titleNumber: "TT1",
    titleInHand: true,
    dateReceived: "2026-08-01T00:00:00.000Z",
    askingPriceUsd: 900000,
    daysInInventory: 20,
    isVoided: false,
  }
  const inventoryVehicle = {
    id: "veh-open",
    code: "VEH-2",
    description: "2021 Inventory Unit",
    statusId: "status-1",
    statusName: "Disponible",
    vin: "VIN456",
    stockNumber: "STK2",
    titleNumber: "TT2",
    titleInHand: true,
    dateReceived: "2026-07-10T00:00:00.000Z",
    askingPriceUsd: 1100000,
    daysInInventory: 44,
    isVoided: false,
  }

  const dataset: ReportDataset = {
    generatedAt: "2026-08-23T00:00:00.000Z",
    vehicles: [soldVehicle, inventoryVehicle],
    activeVehicles: [inventoryVehicle],
    sales: [
      {
        _id: "sale-1",
        code: "SAL-0001",
        vehicleId: "veh-sold",
        saleDate: new Date("2026-08-10T00:00:00.000Z"),
        buyerName: "Cliente Activo",
        salePriceUsd: 800000,
        acquisitionCostUsd: 500000,
        repairCostUsd: 50000,
        vehicleExpenseCostUsd: 25000,
        totalCostUsd: 575000,
        profitUsd: 225000,
        voidedAt: null,
        referenceNumber: "REF-1",
      },
      {
        _id: "sale-2",
        code: "SAL-0002",
        vehicleId: "veh-sold",
        saleDate: new Date("2026-08-12T00:00:00.000Z"),
        buyerName: "Cliente Anulado",
        salePriceUsd: 999999,
        acquisitionCostUsd: 1,
        repairCostUsd: 1,
        vehicleExpenseCostUsd: 1,
        totalCostUsd: 3,
        profitUsd: 999996,
        voidedAt: new Date("2026-08-13T00:00:00.000Z"),
        referenceNumber: "VOID-1",
      },
    ],
    activeSales: [
      {
        _id: "sale-1",
        code: "SAL-0001",
        vehicleId: "veh-sold",
        saleDate: new Date("2026-08-10T00:00:00.000Z"),
        buyerName: "Cliente Activo",
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
    purchases: [],
    repairs: [],
    expenses: [
      {
        _id: "exp-1",
        code: "EXP-1",
        vehicleId: "veh-open",
        vendorId: "vendor-1",
        category: "fuel",
        expenseDate: new Date("2026-08-03T00:00:00.000Z"),
        currency: "USD",
        exchangeRate: "1",
        amount: 25000,
        tax: 0,
        fees: 0,
        discount: 0,
        adjustment: 0,
        paymentMethod: null,
        voidedAt: null,
      },
      {
        _id: "exp-2",
        code: "EXP-2",
        vehicleId: null,
        vendorId: null,
        category: "administrative",
        expenseDate: new Date("2026-08-05T00:00:00.000Z"),
        currency: "USD",
        exchangeRate: "1",
        amount: 30000,
        tax: 0,
        fees: 0,
        discount: 0,
        adjustment: 0,
        paymentMethod: null,
        voidedAt: null,
      },
      {
        _id: "exp-3",
        code: "EXP-3",
        vehicleId: null,
        vendorId: null,
        category: "administrative",
        expenseDate: new Date("2026-08-07T00:00:00.000Z"),
        currency: "USD",
        exchangeRate: "1",
        amount: 999999,
        tax: 0,
        fees: 0,
        discount: 0,
        adjustment: 0,
        paymentMethod: null,
        voidedAt: new Date("2026-08-08T00:00:00.000Z"),
      },
    ],
    payments: [
      {
        _id: "pay-1",
        code: "PAY-1",
        paymentDate: new Date("2026-08-09T00:00:00.000Z"),
        providerId: "vendor-1",
        currency: "USD",
        exchangeRate: "1",
        amount: 40000,
        method: "wire",
        applications: [],
        voidedAt: null,
      },
      {
        _id: "pay-2",
        code: "PAY-2",
        paymentDate: new Date("2026-08-10T00:00:00.000Z"),
        providerId: "vendor-1",
        currency: "USD",
        exchangeRate: "1",
        amount: 10000,
        method: "wire",
        applications: [],
        voidedAt: new Date("2026-08-11T00:00:00.000Z"),
      },
    ],
    vendorNames: new Map([["vendor-1", "Proveedor Uno"]]),
    vehicleById: new Map([
      ["veh-sold", soldVehicle],
      ["veh-open", inventoryVehicle],
    ]),
    saleByVehicleId: new Map(),
    acquisitionByVehicleId: new Map([["veh-open", { totalUsd: 500000, components: {} }]]),
    repairByVehicleId: new Map([["veh-open", { totalUsd: 80000, activeTotalUsd: 50000 }]]),
    expenseByVehicleId: new Map([["veh-open", { totalUsd: 25000, activeTotalUsd: 25000 }]]),
    payables: [
      {
        id: "purchase-1",
        type: "purchase",
        code: "PUR-1",
        date: new Date("2026-08-04T00:00:00.000Z"),
        vehicleId: "veh-open",
        vehicleCode: "VEH-2",
        vehicleDescription: "2021 Inventory Unit",
        providerId: "vendor-1",
        providerName: "Proveedor Uno",
        originalUsd: 100000,
        paidUsd: 40000,
        pendingUsd: 60000,
        status: "partial",
        sourceLabel: "Compra",
        href: "/compras/PUR-1",
      },
    ],
  } as unknown as ReportDataset

  dataset.saleByVehicleId.set("veh-sold", dataset.sales[0]!)
  return dataset
}

describe("report builders", () => {
  it("excludes voided rows and keeps sale snapshot profitability values", () => {
    const report = buildFinancialReport("sales-profitability", buildDataset(), baseFilters)

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.values.code).toBe("SAL-0001")
    expect((report.rows[0]?.values.totalCostUsd as { amount: number }).amount).toBe(575000)
    expect((report.rows[0]?.values.grossProfitUsd as { amount: number }).amount).toBe(225000)
  })

  it("builds current inventory value from active acquisition, repair, and vehicle expense totals", () => {
    const report = buildFinancialReport("inventory-value", buildDataset(), baseFilters)

    expect(report.rows).toHaveLength(1)
    expect((report.rows[0]?.values.acquisitionUsd as { amount: number }).amount).toBe(500000)
    expect((report.rows[0]?.values.repairUsd as { amount: number }).amount).toBe(50000)
    expect((report.rows[0]?.values.vehicleExpenseUsd as { amount: number }).amount).toBe(25000)
    expect((report.rows[0]?.values.totalCostUsd as { amount: number }).amount).toBe(575000)
  })

  it("reports payable balances from active obligations and non-voided payment totals", () => {
    const report = buildPayablesReport("accounts-payable", buildDataset(), baseFilters)

    expect(report.rows).toHaveLength(1)
    expect((report.rows[0]?.values.originalUsd as { amount: number }).amount).toBe(100000)
    expect((report.rows[0]?.values.paidUsd as { amount: number }).amount).toBe(40000)
    expect((report.rows[0]?.values.pendingUsd as { amount: number }).amount).toBe(60000)
  })

  it("groups expenses by category without counting voided entries", () => {
    const report = buildExpenseReport("expenses-by-category", buildDataset(), baseFilters)
    const rowsByCategory = new Map(report.rows.map((row) => [String(row.values.category), row]))

    expect(rowsByCategory.get("Combustible")?.values.sourceCount).toBe(1)
    expect((rowsByCategory.get("Combustible")?.values.totalUsd as { amount: number }).amount).toBe(25000)
    expect(rowsByCategory.get("Administrativo")?.values.sourceCount).toBe(1)
    expect((rowsByCategory.get("Administrativo")?.values.totalUsd as { amount: number }).amount).toBe(30000)
  })

  it("marks uncaptured sales tax fields as unavailable in tax preparation output", () => {
    const report = buildAdminReport("sales-tax-preparation", buildDataset(), baseFilters)
    const noteKeys = report.availabilityNotes.map((note) => note.code)

    expect(noteKeys).toContain("uncapturedSalesTax")
    expect(noteKeys).toContain("uncapturedJurisdiction")
    expect(noteKeys).toContain("uncapturedExemptionStatus")
    expect(noteKeys).toContain("uncapturedFilingTreatment")
    expect(report.rows[0]?.values.salesTaxCollected).toBeNull()
    expect(report.rows[0]?.values.jurisdiction).toBeNull()
    expect(report.rows[0]?.values.exemptionStatus).toBeNull()
    expect(report.rows[0]?.values.filingTreatment).toBeNull()
  })
})
