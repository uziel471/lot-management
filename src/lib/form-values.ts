type FormValue = FormDataEntryValue | string | number | boolean | null | undefined

function scalarValue(value: FormDataEntryValue): string {
  return typeof value === "string" ? value : value.name
}

export function formDataToValues(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    values[key] = scalarValue(value)
  }
  return values
}

export function formDataToValuesWithIndexedGroups(
  formData: FormData,
  groupNames: string[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  const groups = new Map<string, Array<Record<string, unknown>>>(
    groupNames.map((groupName) => [groupName, []]),
  )

  for (const [key, value] of formData.entries()) {
    let grouped = false

    for (const groupName of groupNames) {
      const match = key.match(new RegExp(`^${groupName}\\.(\\d+)\\.(.+)$`))
      if (!match) continue

      const index = Number(match[1])
      const groupValues = groups.get(groupName)!
      groupValues[index] ??= {}
      groupValues[index][match[2]] = scalarValue(value)
      grouped = true
      break
    }

    if (!grouped) values[key] = scalarValue(value)
  }

  for (const [groupName, groupValues] of groups.entries()) {
    values[groupName] = groupValues.filter((entry) => Object.keys(entry).length > 0)
  }

  return values
}

export function objectToFormValues(input: Record<string, unknown>): Record<string, unknown> {
  return { ...input }
}

export function valueAsString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return fallback
}

export function valueAsNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function valueAsBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value
  if (value === "on" || value === "true") return true
  if (value === "false" || value === "" || value === null || value === undefined) return false
  return fallback
}

export function normalizeUsdExchangeRate<T extends Record<string, unknown>>(input: T): T {
  if (input.currency === "USD") {
    return { ...input, exchangeRate: "1" }
  }
  return input
}

export function formValue(value: FormValue): string {
  if (value === null || value === undefined) return ""
  return String(value)
}
