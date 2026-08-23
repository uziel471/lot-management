## Why

La ficha del vehículo hoy describe datos administrativos y financieros, pero no conserva evidencia visual de la unidad. Para operación diaria del lote hace falta adjuntar fotos del exterior, interior, VIN, tablero o documentos visuales, consultarlas desde la ficha y retirar imágenes incorrectas sin borrar el vehículo.

## What Changes

- Agregar carga de imágenes asociadas a un vehículo vigente desde la ficha o flujo de edición del vehículo.
- Mostrar una galería de imágenes en el detalle del vehículo, con miniaturas, vista ampliada y datos básicos de cada imagen.
- Permitir eliminar imágenes asociadas a un vehículo sin eliminar el vehículo ni afectar sus transacciones.
- Validar tipo, tamaño y cantidad de imágenes para evitar archivos no soportados o cargas excesivas.
- Conservar trazabilidad mínima de cada imagen: vehículo, autor, fecha de carga, nombre original, tipo MIME, tamaño y referencia de almacenamiento.
- Excluir del alcance la edición avanzada de imágenes, ordenamiento manual, imagen principal obligatoria y asociación de imágenes a compras, reparaciones, ventas o pagos.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vehicles`: agrega administración de imágenes asociadas al vehículo, incluyendo alta, visualización y eliminación.

## Impact

- **Base de datos:** nuevo modelo o subdocumento para metadatos de imágenes de vehículo, con referencia al vehículo y al objeto almacenado.
- **Almacenamiento:** uso de la integración Supabase existente para guardar y borrar objetos de imagen, sin exponer credenciales privilegiadas al navegador.
- **Código existente que se toca:** consultas, acciones, esquema, tipos y componentes de `features/vehicles`; detalle de `app/(app)/vehiculos/[code]/page.tsx`; permisos si se requiere distinguir lectura, carga y eliminación.
- **UI:** galería en la ficha del vehículo y control de carga/eliminación usando los patrones compartidos de formularios, estados vacíos, diálogos de confirmación y botones de envío.
- **Pruebas:** validaciones de archivo, autorización, alta de metadatos, exclusión de imágenes eliminadas, eliminación idempotente y recorrido de detalle.
