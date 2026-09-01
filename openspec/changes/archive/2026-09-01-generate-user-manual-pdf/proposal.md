## Why

Los usuarios necesitan una guia operativa descargable que explique como usar el sistema sin depender de capacitacion verbal o soporte directo. Un manual en PDF permite consultar instrucciones consistentes, imprimirlas o compartirlas con personal autorizado.

## What Changes

- Agregar un manual de usuario en PDF con explicaciones claras para operar los modulos principales del sistema.
- Exponer una forma visible y protegida para descargar el manual desde la aplicacion.
- Mantener el contenido del manual alineado con los flujos existentes: inicio de sesion, dashboard, vehiculos, compras, reparaciones, gastos, ventas, pagos, reportes, catalogos, usuarios y cuenta.
- Generar el PDF desde una fuente mantenible en el repositorio para evitar editar binarios manualmente.
- No introducir cambios en datos de negocio, permisos existentes ni logica transaccional.

## Capabilities

### New Capabilities

- `user-manual`: Cubre la disponibilidad, contenido, descarga y mantenimiento del manual de usuario en PDF.

### Modified Capabilities

- None.

## Impact

- Affected areas: app navigation/help surface, a protected route or endpoint for downloading the PDF, and a source document/template for the manual.
- Dependencies: may require a PDF generation library or build-time generation approach if the project does not already have one.
- Systems: authentication and authorization must continue protecting access to internal operational documentation.
