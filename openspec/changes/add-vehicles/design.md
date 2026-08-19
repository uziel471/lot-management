# Diseño técnico — Vehículos

## Context

La Fase 2 dejó los cuatro catálogos, la feature genérica que los administra y la capa de UI compartida —`PageHeader`, `DataTable`, `EmptyState`, `ConfirmDialog`, `SubmitButton`—. La Fase 0+1 dejó la emisión de códigos, la aritmética del dinero en unidades menores, el contrato `ActionResult` y la autorización pegada a los datos.

Esta fase es la primera que enfrenta un formulario grande. Veintitrés campos de captura no son un problema de código sino de diseño de interacción: la decisión de qué es obligatorio y qué no determina si el sistema se usa. También es la primera entidad con historial, y la primera donde una lista de valores puede modelarse de dos maneras defendibles.

El contexto arquitectónico está en `ARCHITECTURE.md`; la motivación, en `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Que un vehículo pueda entrar al sistema el día que llega al lote, con la información que se tiene ese día, y completarse después sin fricción.
- Que el historial de estatus quede desde el primer vehículo, porque es información que no se puede reconstruir hacia atrás.
- Que las validaciones que protegen la identidad del vehículo —VIN, número de inventario, pertenencia del modelo a la marca— estén respaldadas por índices, no solo por la capa de aplicación.

**Non-Goals:**

- Costo acumulado y su desglose. Depende de módulos que no existen; llega en la Fase 4.
- Fotos y documentos adjuntos. Requieren decidir almacenamiento de archivos, que es una decisión de infraestructura propia.
- Fecha de venta y congelamiento de los días en inventario. Los define ventas.
- Importación masiva de vehículos. Los datos históricos entran por la base, como los catálogos.

## Decisions

### Cinco campos obligatorios, no veintitrés

El sistema anterior tenía veintitrés columnas de captura, y en la práctica la mayoría se llenaban en momentos distintos: el VIN cuando llegaba la unidad físicamente, el número de título cuando llegaba el título, el precio cuando se decidía publicarla. Un formulario que exige todo de golpe obliga al capturista a inventar valores o a posponer el alta, y ambas cosas terminan en datos peores que los que se querían asegurar.

Obligatorios: marca, modelo, año, estatus y fecha de recepción. Son los cinco sin los cuales el registro no significa nada —no se puede listar, ni ordenar, ni contar días en inventario—. Todo lo demás es opcional y editable después.

La consecuencia es que la validación de completitud no vive en el esquema sino en la vista: el detalle del vehículo señala qué falta por capturar, y el inventario puede filtrar por "sin VIN" o "sin título en mano". Es información accionable en lugar de una barrera en el alta.

### Enumeraciones en código para las cinco listas cerradas

`bodyStyle`, `transmission`, `fuelType`, `drivetrain` y `titleStatus` son listas que no cambian y que no necesitan nada de lo que un catálogo aporta: no llevan código legible, no se retiran, no tienen autoría, nadie consulta cuándo se creó "Automatic". Modelarlas como catálogos serían cinco colecciones, cinco secciones de UI y cinco oportunidades de que alguien dé de alta "Automatica" junto a "Automatic".

Viven en `src/features/vehicles/enums.ts`, con el valor almacenado en inglés y la etiqueta de UI en español, conforme a la convención de idioma. El esquema Zod las valida con `z.enum`, y el tipo de TypeScript sale de ahí.

La regla de evolución es la que hace esto seguro: **un valor ya usado nunca se renombra ni se elimina, solo se agregan valores nuevos.** Renombrar `"Automatic"` a `"AUTO"` deja huérfanos todos los vehículos capturados. La etiqueta en español sí puede cambiar libremente, porque no está en la base.

*Alternativa considerada:* los cinco como catálogos, reutilizando el registro de la Fase 2. Es casi gratis de implementar y da flexibilidad, pero paga esa flexibilidad con cinco secciones más en una pantalla de administración que nadie va a abrir, y con la posibilidad de duplicados semánticos que ningún índice detecta.

### El historial de estatus va embebido en el vehículo

Un vehículo pasa por diez estatus como máximo, y el historial se lee siempre junto al vehículo —nunca "todos los cambios de estatus del sistema"—. Es el caso de libro de un arreglo embebido: acotado, siempre leído con su padre, nunca consultado por separado.

Cada entrada guarda el estatus anterior, el nuevo, el usuario y la marca de tiempo del servidor. La entrada inicial se crea en el mismo `create` del vehículo, con el estatus anterior en nulo, para que el historial no empiece con un hueco. Guardar el mismo estatus que ya tenía no agrega entrada: evita que un guardado del formulario completo ensucie el historial con ruido.

*Alternativa considerada:* una colección `vehicleStatusHistory` aparte. Es lo correcto si algún día hace falta un reporte transversal de tiempos por estatus —cuánto tarda en promedio pasar de "Received" a "Ready for Sale"—. Ese reporte se puede construir igual con un `$unwind` sobre el arreglo embebido, así que la separación no aporta hoy. Si el arreglo dejara de estar acotado, la señal sería un vehículo con cientos de cambios, y ahí se extrae.

### VIN: formato estricto, dígito verificador advertido

El VIN se normaliza a mayúsculas y sin espacios antes de validar y de guardar, y se exige 17 caracteres alfanuméricos sin `I`, `O` ni `Q` —las tres letras que el estándar excluye justamente porque se confunden con `1` y `0`—. El índice es único disperso: varios vehículos sin VIN conviven, dos con el mismo no.

El dígito verificador (posición 9) sí se calcula, pero solo para advertir. Es la mejor defensa contra un error de tecleo, y a la vez hay unidades legítimas —importadas, de mercados que no siguen el estándar norteamericano— cuyo VIN no lo cumple. Bloquear por él convierte un chequeo útil en un obstáculo que se resuelve inventando un VIN falso, que es peor que un VIN con un dígito raro.

### El kilometraje lleva unidad

Es la única decisión de este diseño que no estaba en el sistema anterior. La columna `mileage` de la hoja era un número sin unidad, y en un lote de Tijuana eso es ambiguo por construcción: las unidades compradas en subasta en Estados Unidos vienen en millas y las del mercado local en kilómetros, y 84,000 de una cosa no es 84,000 de la otra.

Se guarda el valor tal como se capturó más la unidad, sin convertir. Convertir al guardar pierde el dato original y arrastra un redondeo; convertir al mostrar es trivial si algún día hace falta comparar. La unidad se muestra siempre que se muestre el número.

### El precio de lista es USD y no lleva tipo de cambio

El principio bimoneda existe para las transacciones: una compra ocurrió a un tipo de cambio concreto y ese tipo se congela porque describe un hecho pasado. El precio de lista no es un hecho pasado sino una intención presente, que va a cambiar varias veces antes de que haya una venta. Congelarle un tipo de cambio sería congelar el de un día que no significa nada.

Se guarda en centavos de dólar, reutilizando `Money` de `lib/money.ts`. Si hace falta mostrarlo en pesos, se convierte al tipo de cambio del día en el momento de mostrarlo, y eso queda claro en la interfaz. Cada cambio de precio se registra con autor y fecha, igual que el estatus, porque bajar el precio es una decisión de negocio que alguien va a querer rastrear.

### El orden de los estatus ordena, no restringe

El catálogo de estatus trae un orden explícito (10 a 90) que refleja el avance natural de una unidad. Ese orden gobierna cómo se presentan los estatus en desplegables y filtros, y nada más: cualquier estatus puede seguir a cualquiera.

Restringir las transiciones parece más riguroso y en la práctica es peor. Las ventas se caen y hay que volver de "Sale Pending" a "Listed". Los títulos se atoran y hay que ir de "Ready for Sale" a "On Hold" —que precisamente por eso lleva el orden 45, intercalado—. Y los errores de captura hay que poder deshacerlos. Una máquina de estados obligaría a modelar todas esas excepciones, y el historial ya deja constancia de cualquier movimiento raro, que es la garantía que de verdad importa.

### El formulario se agrupa en secciones, no en pasos

Veintitrés campos en una sola columna son ilegibles; repartidos en un asistente de cuatro pasos obligan a navegar para corregir un dato. Se agrupan en cinco secciones dentro de una misma página —Identificación, Ficha técnica, Título, Inventario y ubicación, Precio y notas—, con la sección de identificación abierta y las demás plegadas por omisión en el alta, y todas abiertas en la edición.

El detalle del vehículo, en cambio, no es un formulario: es una ficha de lectura con acciones puntuales para cambiar estatus y precio, que son las dos cosas que cambian a menudo. Editar el resto abre el formulario completo.

## Risks / Trade-offs

- **Un formulario con cinco obligatorios permite vehículos muy incompletos** → el detalle señala lo que falta y el inventario puede filtrar por ello. Es un problema de seguimiento operativo, visible y accionable, en lugar de un problema de captura, invisible porque el capturista inventó un valor para poder guardar.
- **Renombrar un valor de enumeración rompe los vehículos capturados** → la regla es explícita: se agregan valores, no se renombran ni se eliminan. Un test verifica que los valores almacenados en la base pertenecen a la lista vigente, de modo que un renombrado accidental falla en CI y no en producción.
- **El historial embebido crece sin límite teórico** → acotado en la práctica a decenas de entradas. La señal de alarma es un vehículo con cientos de cambios de estatus, y la salida es extraerlo a su colección sin cambiar la interfaz de lectura.
- **El dígito verificador advertido puede normalizarse como ruido** → la advertencia aparece en el detalle del vehículo, no solo como un mensaje que se cierra al guardar, para que siga siendo visible mientras el VIN sea sospechoso.
- **El precio de lista sin tipo de cambio complica un reporte de inventario valorizado en pesos** → se resuelve con un tipo de cambio del día, explícito en el reporte. Es la respuesta correcta: un inventario valorizado hoy debe usar el tipo de cambio de hoy.

## Migration Plan

La colección nace vacía y sus índices se crean con el modelo de Mongoose. No hay datos previos: el sistema anterior tiene la hoja `VEHICLES` completa pero sin registros.

Si en algún momento se cargan vehículos directamente a la base, aplica lo mismo que a los catálogos: el `code` debe respetar la secuencia, el contador `VEH` debe realinearse con `scripts/seed-counters.ts`, y el historial de estatus debe traer al menos su entrada inicial. Conviene extender ese script para que cubra también `vehicles`.

La reversión es vaciar la colección y el contador `VEH`, mientras no existan compras que referencien vehículos.

## Open Questions

- **¿`lotLocation` es texto libre o una lista?** Depende de si el lote tiene posiciones nombradas y estables. Empieza como texto libre; si se descubre que son ocho valores repetidos, se convierte en enumeración o catálogo sin cambiar los datos.
- **¿La fecha de recepción puede ser anterior a la fecha de compra?** Hoy no hay compras, así que no hay nada que comparar. Cuando existan, la relación entre `dateReceived` y `purchaseDate` puede querer una validación —o no, si el lote registra la recepción de unidades que compró meses antes. Se decide en la Fase 4.
- **¿Un vehículo puede anularse si ya tiene transacciones?** La respuesta razonable es que no, y que primero deben anularse sus compras. La regla no se puede escribir todavía porque no hay transacciones; se agrega como requisito modificado en la Fase 4.
