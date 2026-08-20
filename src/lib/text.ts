/**
 * Normalización de texto para claves de unicidad, compartida entre
 * dominios. Nace en `features/catalogs/domain.ts` como el cuerpo de
 * `normalizeName` y sube aquí cuando `features/purchases` la necesita
 * para el número de referencia de un comprobante (ver design.md de
 * `add-purchases`, "Unicidad del comprobante por referencia
 * normalizada"): duplicarla habría garantizado que las dos copias se
 * separaran con el tiempo.
 *
 * Recorta los extremos, colapsa los espacios internos consecutivos en
 * uno solo, normaliza a NFD y quita los diacríticos. MUST NOT cambiar
 * mayúsculas/minúsculas: cada dominio decide su propio caso —
 * catálogos usa minúsculas (`nameKey`), compras usa mayúsculas
 * (`referenceKey`)— porque cambiar el de catálogos alteraría las
 * claves ya calculadas sin que nadie lo haya pedido.
 */
export function stripAccentsAndCollapseSpaces(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}
