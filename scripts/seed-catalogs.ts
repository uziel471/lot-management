/**
 * Carga entradas de catálogo desde un archivo JSON o CSV, pasando por
 * las mismas reglas de dominio que la Server Action: normaliza el
 * nombre, verifica el duplicado, respeta el `code` del archivo si
 * viene y lo emite si no, y firma la autoría con un administrador.
 *
 * Es idempotente por `nameKey`: correrlo dos veces no duplica nada y
 * reporta lo que ya existía.
 *
 * Uso:
 *   pnpm seed:catalogs --catalog=marcas --file=./data/makes.json --author=admin@lote.com
 *
 *   --catalog  clave de ruta (marcas | modelos | estatus | proveedores)
 *   --file     JSON (arreglo de objetos) o CSV con encabezado
 *   --author   correo del usuario que queda como autor de las altas
 *   --dry-run  solo informa; no escribe nada
 *
 * Formato de cada entrada (las columnas propias de cada catálogo):
 *   marcas       name, [code]
 *   modelos      name, make | makeCode, [code]
 *   estatus      name, sortOrder, [description], [code]
 *   proveedores  name, [phone], [email], [city], [notes], [code]
 *
 * Después de cargar, correr `pnpm seed:counters`.
 */
import "dotenv/config"
import { readFileSync } from "node:fs"
import mongoose, { Types } from "mongoose"
import { dbConnect } from "../src/lib/db/client"
import { nextCode } from "../src/lib/db/counters"
import { normalizeName } from "../src/features/catalogs/domain"
import {
  catalogKeyFromRoute,
  getCatalog,
  type CatalogDefinition,
} from "../src/features/catalogs/registry"
import { isCatalogKey, type CatalogKey } from "../src/features/catalogs/types"

type RawEntry = Record<string, string | number | null | undefined>

function readArgs() {
  const args = new Map<string, string>()
  for (const argument of process.argv.slice(2)) {
    const [key, ...rest] = argument.replace(/^--/, "").split("=")
    args.set(key, rest.join("=") || "true")
  }
  return args
}

/** CSV mínimo: encabezado en la primera línea, comillas dobles opcionales. */
function parseCsv(content: string): RawEntry[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < content.length; index++) {
    const char = content[index]

    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char !== "\r") {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [header, ...body] = rows.filter((line) => line.some((cell) => cell.trim() !== ""))
  if (!header) return []

  return body.map((line) => {
    const entry: RawEntry = {}
    header.forEach((column, index) => {
      entry[column.trim()] = (line[index] ?? "").trim()
    })
    return entry
  })
}

function readEntries(file: string): RawEntry[] {
  const content = readFileSync(file, "utf8")
  if (file.toLowerCase().endsWith(".csv")) {
    return parseCsv(content)
  }
  const parsed: unknown = JSON.parse(content)
  if (!Array.isArray(parsed)) {
    throw new Error("El JSON debe ser un arreglo de objetos.")
  }
  return parsed as RawEntry[]
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed === "" ? null : trimmed
}

/** Campos propios de cada catálogo, tomados del archivo. */
function ownFields(definition: CatalogDefinition, entry: RawEntry): Record<string, unknown> {
  switch (definition.key) {
    case "vehicleStatuses": {
      const sortOrder = Number.parseInt(String(entry.sortOrder ?? ""), 10)
      if (!Number.isFinite(sortOrder)) {
        throw new Error(`«${entry.name}» no trae un sortOrder entero.`)
      }
      return { sortOrder, description: text(entry.description) }
    }
    case "vendors":
      return {
        phone: text(entry.phone),
        email: text(entry.email),
        city: text(entry.city),
        notes: text(entry.notes),
      }
    default:
      return {}
  }
}

/** Resuelve la marca de un modelo por código o por nombre normalizado. */
async function resolveMake(entry: RawEntry): Promise<Types.ObjectId> {
  const makes = getCatalog("makes")
  const code = text(entry.makeCode)
  const name = text(entry.make) ?? text(entry.makeName)

  const found = code
    ? ((await makes.model.findOne({ code }).select({ _id: 1, isActive: 1 }).lean()) as unknown as {
        _id: Types.ObjectId
        isActive: boolean
      } | null)
    : name
      ? ((await makes.model
          .findOne({ nameKey: normalizeName(name) })
          .select({ _id: 1, isActive: 1 })
          .lean()) as unknown as { _id: Types.ObjectId; isActive: boolean } | null)
      : null

  if (!found) {
    throw new Error(
      `No se encontró la marca de «${entry.name}». Carga primero las marcas (columna make o makeCode).`,
    )
  }
  if (!found.isActive) {
    throw new Error(`La marca de «${entry.name}» está desactivada.`)
  }
  return found._id
}

export type SeedReport = {
  created: number
  existing: number
  failed: number
  lines: string[]
}

/**
 * Carga un conjunto de entradas en un catálogo pasando por las reglas
 * de dominio. Se exporta —y el script se limita a leer el archivo y
 * resolver el autor— para que la carga se pueda probar sin CLI.
 */
export async function seedCatalogEntries({
  catalogKey,
  entries,
  authorId,
  dryRun = false,
  log = () => {},
}: {
  catalogKey: CatalogKey
  entries: RawEntry[]
  authorId: Types.ObjectId
  dryRun?: boolean
  log?: (line: string) => void
}): Promise<SeedReport> {
  const definition = getCatalog(catalogKey)
  const report: SeedReport = { created: 0, existing: 0, failed: 0, lines: [] }

  const record = (line: string) => {
    report.lines.push(line)
    log(line)
  }

  await dbConnect()

  for (const entry of entries) {
    const name = text(entry.name)
    if (!name) {
      record("! entrada sin nombre, se omite")
      report.failed++
      continue
    }

    const nameKey = normalizeName(name)

    try {
      const payload: Record<string, unknown> = {
        name,
        nameKey,
        isActive: true,
        createdBy: authorId,
        updatedBy: authorId,
        deactivatedAt: null,
        deactivatedBy: null,
        ...ownFields(definition, entry),
      }

      if (definition.key === "models") {
        payload.makeId = await resolveMake(entry)
      }

      const duplicateFilter: Record<string, unknown> = { nameKey }
      if (payload.makeId) duplicateFilter.makeId = payload.makeId

      const already = (await definition.model
        .findOne(duplicateFilter)
        .select({ code: 1 })
        .lean()) as unknown as { code: string } | null

      if (already) {
        record(`= ya existía: ${name} (${already.code})`)
        report.existing++
        continue
      }

      if (dryRun) {
        record(`+ se crearía: ${name} (${text(entry.code) ?? "código por emitir"})`)
        report.created++
        continue
      }

      // El código del archivo manda; si no viene, se emite con la
      // misma secuencia que usa la aplicación.
      const code = text(entry.code) ?? (await nextCode(definition.codePrefix))

      await definition.model.create({ ...payload, code } as never)
      record(`+ creado: ${name} (${code})`)
      report.created++
    } catch (error) {
      report.failed++
      record(`! error en «${name}»: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return report
}

async function main() {
  const args = readArgs()
  const catalogArg = args.get("catalog")
  const file = args.get("file")
  const authorEmail = args.get("author") ?? process.env.SEED_AUTHOR_EMAIL
  const dryRun = args.get("dry-run") === "true"

  if (!catalogArg || !file || !authorEmail) {
    console.error(
      "Uso: pnpm seed:catalogs --catalog=marcas --file=./data/makes.json --author=admin@lote.com [--dry-run]",
    )
    process.exitCode = 1
    return
  }

  const catalogKey = isCatalogKey(catalogArg) ? catalogArg : catalogKeyFromRoute(catalogArg)
  if (!catalogKey) {
    console.error(`Catálogo desconocido: ${catalogArg}. Usa marcas, modelos, estatus o proveedores.`)
    process.exitCode = 1
    return
  }

  const entries = readEntries(file)
  await dbConnect()

  // El autor se busca directo en la colección de Better Auth: este es
  // un script de arranque y no hay sesión que consultar.
  const author = await mongoose.connection
    .collection("user")
    .findOne({ email: authorEmail.toLowerCase() })

  if (!author) {
    console.error(`No existe un usuario con el correo ${authorEmail}. Corre antes pnpm seed:admin.`)
    await mongoose.disconnect()
    process.exitCode = 1
    return
  }
  if (author.role !== "admin") {
    console.error(`El usuario ${authorEmail} no es administrador.`)
    await mongoose.disconnect()
    process.exitCode = 1
    return
  }

  const report = await seedCatalogEntries({
    catalogKey,
    entries,
    authorId: author._id,
    dryRun,
    log: (line) => console.log(line),
  })

  const definition = getCatalog(catalogKey)
  console.log(
    `\n${definition.plural}: ${report.created} ${dryRun ? "por crear" : "creados"}, ${report.existing} ya existían, ${report.failed} con error.`,
  )
  if (!dryRun && report.created > 0) {
    console.log("Recuerda correr `pnpm seed:counters` antes de dar de alta nada por la interfaz.")
  }

  await mongoose.disconnect()
  if (report.failed > 0) process.exitCode = 1
}

// Solo se ejecuta cuando se invoca el script; importarlo desde un
// test no dispara nada.
if (process.argv[1]?.includes("seed-catalogs")) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
