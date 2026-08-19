# Borradores de specs

Specs redactados por adelantado que **todavía no son contrato**. No los lee OpenSpec.

Cada uno se mueve a `openspec/changes/<fase>/specs/<capacidad>/spec.md` —convirtiendo `## Requirements` en `## ADDED Requirements`— cuando arranca su fase, y de ahí pasa a `openspec/specs/` al archivarla.

| Archivo | Fase | Estado |
|---|---|---|
| `project.md` | 0+1 | Ya movido a `openspec/changes/add-foundation-and-auth/`. Se conserva aquí la versión completa, con las reglas de anulación, control de signo y frontera de costos que llegan en la Fase 4. |
| `authentication.md` | 1 | Ya movido a `openspec/changes/add-foundation-and-auth/`. |
| `users.md` | 1 | Ya movido a `openspec/changes/add-foundation-and-auth/`. |
| `catalogs.md` | 2 | Ya movido a `openspec/changes/add-catalogs/`. El delta amplía este borrador con los datos de contacto del proveedor, el orden y la descripción de los estatus, el efecto de desactivar una marca sobre sus modelos, la autorización por rol y la trazabilidad. |
| `vehicles.md` | 3 | Ya movido a `openspec/changes/add-vehicles/`. El delta amplía este borrador con las veintitrés columnas reales, los cinco campos obligatorios, las enumeraciones en código, el kilometraje con unidad, el número de inventario, el precio de lista en USD y la anulación. El costo acumulado por vehículo, que este borrador incluía, se movió a la Fase 4: depende de compras, reparaciones y gastos. |
| `purchases.md` | 4 | Pendiente. **Desbloqueado**: los ocho componentes de costo de adquisición ya están fijados —precio del vehículo, comisiones de subasta, transporte de adquisición, trámites de título, impuesto de compra, aranceles de importación, honorarios de agente aduanal y otros—. Falta agregarle el costo acumulado por vehículo, que llega con este módulo. |
