## 1. Preparación

- [x] 1.1 Leer la guía relevante de Next.js 16 en `node_modules/next/dist/docs/` antes de tocar Server Actions, carga de archivos o rutas del App Router
- [x] 1.2 Revisar la implementación existente de `supabase-integration` y confirmar las variables de entorno disponibles para cliente y servidor
- [x] 1.3 Definir los permisos de imagen de vehículo usando los patrones existentes de `src/lib/auth/permissions.ts`: lectura incluida en detalle de vehículo, carga y eliminación solo para roles con escritura de vehículos
- [x] 1.4 Definir constantes de dominio para imágenes de vehículo: MIME types permitidos, tamaño máximo por archivo, máximo de imágenes activas por vehículo y nombre del bucket

## 2. Modelo y almacenamiento

- [x] 2.1 Crear el modelo `vehicleImage` en `src/lib/db/models/` con `vehicleId`, `storageBucket`, `storagePath`, `originalFileName`, `mimeType`, `byteSize`, `createdBy`, `deletedAt`, `deletedBy` y `deleteError`
- [x] 2.2 Agregar índices para consultar imágenes activas por vehículo y evitar búsquedas completas de la colección
- [x] 2.3 Implementar un adaptador server-only de storage para subir, eliminar y generar URL renderizable desde `storageBucket` y `storagePath`
- [x] 2.4 Asegurar que el adaptador no exponga service-role keys ni credenciales privilegiadas al browser
- [x] 2.5 Documentar o agregar la configuración requerida para el bucket de imágenes de vehículos en los ejemplos de entorno del proyecto

## 3. Dominio, esquemas y tipos

- [x] 3.1 Implementar validadores puros para tipo MIME, tamaño de archivo, extensión derivada y límite de imágenes activas
- [x] 3.2 Agregar esquemas Zod para subir imagen y eliminar imagen, separando validación de entrada de la validación del objeto `File`
- [x] 3.3 Definir DTOs serializables para imágenes de vehículo, incluyendo metadata, estado activo y URL renderizable
- [x] 3.4 Agregar tests unitarios para validación de tipo, tamaño, extensión y límite de imágenes activas

## 4. Lecturas

- [x] 4.1 Implementar `listVehicleImages(vehicleId)` en `src/features/vehicles/queries.ts` o módulo server-only equivalente, filtrando imágenes eliminadas por omisión
- [x] 4.2 Integrar las imágenes activas al DTO de detalle de vehículo o a la composición de `app/(app)/vehiculos/[code]/page.tsx`
- [x] 4.3 Generar URLs renderizables en la capa de lectura a partir de `storagePath`, sin guardar URLs permanentes en MongoDB
- [x] 4.4 Verificar que un vehículo sin imágenes devuelva una lista vacía y no rompa el detalle existente

## 5. Escrituras

- [x] 5.1 Implementar `uploadVehicleImage` como Server Action con el orden `requireRole` -> validación -> verificación de vehículo vigente -> verificación de límite -> upload storage -> escritura metadata -> `revalidatePath`
- [x] 5.2 Rechazar cargas para vehículos anulados sin subir el archivo ni crear metadata
- [x] 5.3 Rechazar archivos con tipo o tamaño no soportado con mensajes de campo comprensibles
- [x] 5.4 Implementar compensación best-effort: si falla la escritura de metadata después de subir el objeto, intentar borrar el objeto y devolver error
- [x] 5.5 Implementar `deleteVehicleImage` como Server Action con el orden `requireRole` -> validación -> marcar metadata como eliminada -> intentar borrar objeto -> `revalidatePath`
- [x] 5.6 Guardar `deleteError` cuando el borrado del objeto falle después de marcar la imagen como eliminada
- [x] 5.7 Asegurar que eliminar una imagen no modifique el vehículo, compras, reparaciones, gastos, pagos ni ventas

## 6. Interfaz

- [x] 6.1 Crear `VehicleImagesSection` en `src/features/vehicles/components/` con estado vacío, grid de miniaturas y layout responsive estable
- [x] 6.2 Agregar control de carga de imágenes con `accept` acorde a las reglas de dominio, estado pending y errores de action
- [x] 6.3 Agregar vista ampliada de imagen desde la galería sin navegar fuera del detalle del vehículo
- [x] 6.4 Agregar diálogo de confirmación para eliminar una imagen y ocultar la acción a usuarios sin permiso de escritura
- [x] 6.5 Integrar la sección en `app/(app)/vehiculos/[code]/page.tsx` sin desplazar ni mezclar los bloques financieros existentes
- [x] 6.6 Verificar comportamiento responsive en mobile y desktop, especialmente que miniaturas, botones y metadatos no se encimen

## 7. Pruebas de integración

- [x] 7.1 Probar alta válida de imagen para vehículo activo: crea metadata, llama al storage adapter y aparece en el detalle
- [x] 7.2 Probar que archivo no soportado o demasiado grande se rechaza sin crear metadata
- [x] 7.3 Probar que superar el máximo de imágenes activas rechaza la carga y conserva las imágenes existentes
- [x] 7.4 Probar que un vehículo anulado rechaza carga de imagen
- [x] 7.5 Probar eliminación: marca metadata como eliminada, excluye la imagen del detalle y no modifica el vehículo
- [x] 7.6 Probar fallo de borrado de storage: la imagen queda excluida del detalle y `deleteError` queda registrado
- [x] 7.7 Probar autorización: usuario sin permiso de escritura no puede subir ni eliminar imágenes

## 8. Verificación

- [x] 8.1 Correr los tests unitarios y de integración agregados para imágenes de vehículo
- [x] 8.2 Correr `pnpm exec tsc --noEmit`
- [x] 8.3 Correr `pnpm test`
- [x] 8.4 Correr `pnpm build`
- [x] 8.5 Correr `pnpm spec:validate` y confirmar que `add-vehicle-images` valida en modo estricto
- [x] 8.6 Recorrido manual: subir una imagen válida, verla en la galería, abrirla ampliada, eliminarla y confirmar que desaparece sin alterar la ficha ni las transacciones del vehículo
