import { addMoney, convertToUsd, sumMoney } from "@/lib/money"
import type { Currency, Money } from "@/types/money"
import {
  REPAIR_ACTIVE_STATUS_VALUES,
  REPAIR_COST_COMPONENT_KEYS,
  REPAIR_TERMINAL_STATUS_VALUES,
  type RepairCostComponentKey,
  type RepairCostComponents,
  type RepairStatus,
} from "./enums"

function componentsAsMoney(components: RepairCostComponents, currency: Currency): Money[] {
  return REPAIR_COST_COMPONENT_KEYS.map((key) => ({ amount: components[key] ?? 0, currency }))
}

export function repairTotalOriginal(components: RepairCostComponents, currency: Currency): Money {
  return sumMoney(componentsAsMoney(components, currency))
}

export function repairTotalUsd(
  components: RepairCostComponents,
  currency: Currency,
  exchangeRate: string,
): Money {
  return convertToUsd(repairTotalOriginal(components, currency), exchangeRate)
}

export function hasPositiveRepairAmount(components: RepairCostComponents): boolean {
  return REPAIR_COST_COMPONENT_KEYS.some((key) => (components[key] ?? 0) > 0)
}

export function isTerminalRepairStatus(status: RepairStatus): boolean {
  return (REPAIR_TERMINAL_STATUS_VALUES as readonly string[]).includes(status)
}

export function isActiveRepairStatus(status: RepairStatus): boolean {
  return (REPAIR_ACTIVE_STATUS_VALUES as readonly string[]).includes(status)
}

export type RepairStatusHistoryEntry = {
  previousStatus: RepairStatus | null
  nextStatus: RepairStatus
  note?: string | null
}

export function transitionRepairStatus(
  currentStatus: RepairStatus,
  nextStatus: Extract<RepairStatus, "requested" | "quoted" | "inProgress">,
  note?: string | null,
): RepairStatusHistoryEntry {
  if (currentStatus === nextStatus) {
    throw new Error("La reparación ya está en ese estatus.")
  }
  if (isTerminalRepairStatus(currentStatus)) {
    throw new Error("La reparación ya es un registro terminal y no admite cambios de estatus.")
  }

  return {
    previousStatus: currentStatus,
    nextStatus,
    note: note?.trim() || null,
  }
}

export function completeRepair(
  currentStatus: RepairStatus,
  openedAt: Date,
  completedAt: Date,
  note?: string | null,
): RepairStatusHistoryEntry {
  if (isTerminalRepairStatus(currentStatus)) {
    throw new Error("La reparación ya no admite marcarse como completada.")
  }
  if (completedAt.getTime() < openedAt.getTime()) {
    throw new Error("La fecha de conclusión no puede ser anterior a la fecha de apertura.")
  }

  return {
    previousStatus: currentStatus,
    nextStatus: "completed",
    note: note?.trim() || null,
  }
}

export function cancelRepair(currentStatus: RepairStatus, reason: string): RepairStatusHistoryEntry {
  if (currentStatus === "completed") {
    throw new Error("Una reparación completada no puede cancelarse.")
  }
  if (currentStatus === "cancelled") {
    throw new Error("La reparación ya está cancelada.")
  }
  if (currentStatus === "voided") {
    throw new Error("La reparación anulada no puede cancelarse.")
  }
  if (!reason.trim()) {
    throw new Error("El motivo de cancelación es obligatorio.")
  }

  return {
    previousStatus: currentStatus,
    nextStatus: "cancelled",
    note: reason.trim(),
  }
}

export function voidRepair(currentStatus: RepairStatus, reason: string): RepairStatusHistoryEntry {
  if (currentStatus === "voided") {
    throw new Error("La reparación ya está anulada.")
  }
  if (!reason.trim()) {
    throw new Error("El motivo de anulación es obligatorio.")
  }

  return {
    previousStatus: currentStatus,
    nextStatus: "voided",
    note: reason.trim(),
  }
}

export type AccumulableRepair = {
  currency: Currency
  exchangeRate: string
  components: RepairCostComponents
  status: RepairStatus
  voidedAt: Date | null | string
}

export type RepairCostAccumulation = {
  total: Money
  components: Record<RepairCostComponentKey, Money>
}

export function accumulateActiveRepairCost(
  repairs: readonly AccumulableRepair[],
): RepairCostAccumulation {
  const activeRepairs = repairs.filter((repair) => !repair.voidedAt && isActiveRepairStatus(repair.status))

  const componentTotals = Object.fromEntries(
    REPAIR_COST_COMPONENT_KEYS.map((key) => {
      const amounts = activeRepairs.map((repair) =>
        convertToUsd({ amount: repair.components[key] ?? 0, currency: repair.currency }, repair.exchangeRate),
      )
      const total =
        amounts.length > 0
          ? amounts.reduce((a, b) => addMoney(a, b))
          : { amount: 0, currency: "USD" as const }
      return [key, total]
    }),
  ) as Record<RepairCostComponentKey, Money>

  const total =
    activeRepairs.length > 0
      ? REPAIR_COST_COMPONENT_KEYS.map((key) => componentTotals[key]).reduce((a, b) => addMoney(a, b))
      : ({ amount: 0, currency: "USD" as const } satisfies Money)

  return { total, components: componentTotals }
}
