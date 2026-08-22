import { addMoney, convertToUsd } from "@/lib/money"
import type { Currency, Money } from "@/types/money"
import {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_COMPONENT_KEYS,
  type ExpenseCategory,
  type ExpenseComponents,
} from "./enums"

export function expenseTotalOriginal(components: ExpenseComponents, currency: Currency): Money {
  return {
    amount:
      (components.amount ?? 0) +
      (components.tax ?? 0) +
      (components.fees ?? 0) -
      (components.discount ?? 0) -
      (components.adjustment ?? 0),
    currency,
  }
}

export function expenseTotalUsd(
  components: ExpenseComponents,
  currency: Currency,
  exchangeRate: string,
): Money {
  return convertToUsd(expenseTotalOriginal(components, currency), exchangeRate)
}

export function hasPositiveExpenseTotal(components: ExpenseComponents): boolean {
  return expenseTotalOriginal(components, "USD").amount > 0
}

export function hasInvalidNegativeExpenseComponent(components: ExpenseComponents): boolean {
  return EXPENSE_COMPONENT_KEYS.some((key) => (components[key] ?? 0) < 0)
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORY_VALUES as readonly string[]).includes(value)
}

export type AccumulableExpense = {
  category: ExpenseCategory
  currency: Currency
  exchangeRate: string
  components: ExpenseComponents
  voidedAt: Date | null | string
}

export type VehicleExpenseCategorySummary = {
  category: ExpenseCategory
  totalUsd: Money
  count: number
}

export type VehicleExpenseAccumulation = {
  totalUsd: Money
  categories: VehicleExpenseCategorySummary[]
}

export function accumulateActiveExpenseTotal(expenses: readonly AccumulableExpense[]): Money {
  const activeTotals = expenses
    .filter((expense) => !expense.voidedAt)
    .map((expense) => expenseTotalUsd(expense.components, expense.currency, expense.exchangeRate))

  if (activeTotals.length === 0) {
    return { amount: 0, currency: "USD" }
  }

  return activeTotals.reduce((sum, amount) => addMoney(sum, amount))
}

export function summarizeVehicleExpenses(
  expenses: readonly AccumulableExpense[],
): VehicleExpenseAccumulation {
  const activeExpenses = expenses.filter((expense) => !expense.voidedAt)
  const categoryMap = new Map<ExpenseCategory, VehicleExpenseCategorySummary>()

  for (const expense of activeExpenses) {
    const totalUsd = expenseTotalUsd(expense.components, expense.currency, expense.exchangeRate)
    const current = categoryMap.get(expense.category)
    if (!current) {
      categoryMap.set(expense.category, { category: expense.category, totalUsd, count: 1 })
      continue
    }
    categoryMap.set(expense.category, {
      category: expense.category,
      totalUsd: addMoney(current.totalUsd, totalUsd),
      count: current.count + 1,
    })
  }

  return {
    totalUsd: accumulateActiveExpenseTotal(expenses),
    categories: Array.from(categoryMap.values()),
  }
}
