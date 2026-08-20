# Diseño técnico — Compras

## Context

Las fases anteriores dejaron todo lo que esta necesita y no había usado nunca de verdad: `nextCode` atómico, `lib/money.ts` con aritmética en centavos y conversión bimoneda con redondeo documentado, el contrato `ActionResult`, `requireRole` pegado a los datos, los cuatro catálogos y el inventario de vehículos con `listVehicleOptions` esperando precisamente a este módulo.

Compras es la primera capacidad transaccional. Las diferencias respecto a vehículos no son de tamaño sino de naturaleza: aquí hay dinero, hay dos monedas, hay un tipo que gobierna qué está permitido, y hay un registro que una vez escrito no se toca. Un vehículo mal capturado se edita; una compra mal capturada se anula y se vuelve a capturar. Esa asimetría es la que ordena casi todas las decisiones de abajo.

El contexto arquitectónico está en `ARCHITECTURE.md`; la motivación, en `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Que ningún código se consuma sin que exista una compra, que es la deuda que originó todo el proyecto.
- Que la aritmética del dinero pase siempre por `lib/money.ts` y nunca por el motor de base de datos ni por punto flotante.
- Que las reglas que protegen la integridad del costo —una sola compra inicial, un comprobante una sola vez, un envío una sola compra— estén respaldadas por índices y no solo por validación de aplicación.
- Que la ficha del vehículo responda cuánto lleva metido el lote en esa unidad, sin que `features/vehicles` sepa que existen las compras.

**Non-Goals:**

- Reparaciones, gastos y el costo total del vehículo. Esta fase entrega el costo de adquisición y lo nombra así en todas partes.
- El flujo asistido de corrección —anular y precargar el formulario— y el buscador transversal. Fase 5.
- Adjuntar el comprobante escaneado. Requiere decidir almacenamiento de archivos, que es una decisión de infraestructura propia.
- Un libro de auditoría transversal (`auditLogs` de `ARCHITECTURE.md` §4.3). La autoría por documento ya cubre lo que esta fase necesita.

## Decisions

### Los ocho componentes son campos con nombre, no un arreglo

`ARCHITECTURE.md` §4.3 los anotó como `components[8]`. Al construirlo conviene apartarse de esa anotación: un arreglo posicional es un contrato implícito donde la posición 4 significa "impuesto de compra" solo porque alguien lo recordó. Reordenarlo o insertar un componente en medio corrompe todo lo capturado sin que nada falle.

Van como ocho campos con nombre en el documento —`purchasePrice`, `auctionFees`, `acquisitionTransportCost`, `titleDocFees`, `purchaseTax`, `importDuties`, `customsBrokerFees`, `otherAcquisitionCosts`—, cada uno entero de centavos con valor por omisión cero. El documento se lee sin diccionario, un componente nuevo es un campo nuevo con omisión cero que no toca lo existente, y el desglose acumulado por componente sale de un `$group` directo.

El costo es la verbosidad: ocho campos en el esquema, ocho en el DTO, ocho en el formulario. Se paga una vez, y una constante `COST_COMPONENTS` con su etiqueta en español recorre el formulario, la tabla de desglose y los tests, de modo que agregar un componente sea un solo cambio.

### Los totales no se guardan y no los calcula MongoDB

Los totales no se almacenan —eso ya estaba decidido en `ARCHITECTURE.md` §4.4— pero falta la mitad menos obvia: tampoco los calcula el motor de base de datos.

La suma de los ocho componentes sí puede hacerla un `$add` sobre enteros sin riesgo. La división entre el tipo de cambio no: implicaría replicar en el pipeline la regla de redondeo *half away from zero* que vive en `money.ts`, y tener dos implementaciones del redondeo del dinero es exactamente la clase de segunda verdad que este proyecto viene evitando desde la hoja de cálculo.

Regla: **la conversión a USD siempre pasa por `convertToUsd` de `lib/money.ts`.** Las consultas traen los componentes y el tipo de cambio; la conversión ocurre en JavaScript al proyectar el DTO. Para el costo acumulado de un vehículo eso significa traer sus compras vigentes —unidades, no miles— y sumar en código. Para el listado de compras, agrupar por vehículo en una sola consulta y convertir después, en un solo recorrido.

Si algún día un reporte necesita agregar millones de filas en el motor, la salida es guardar el equivalente en USD como campo derivado, escrito por la misma función de dominio y verificado por un test que lo recalcule. No es el problema de hoy y no vale la pena pagarlo por adelantado.

### El tipo de cambio se guarda como `Decimal128` y viaja como cadena

`convertToUsd` recibe el tipo de cambio como cadena decimal exacta y la descompone en una fracción de enteros. Ese contrato ya existe y es el correcto: `18.50` como `number` es un binario aproximado desde el momento en que se parsea.

En Mongo se guarda como `Decimal128`, que es lo que preserva el valor capturado. Al leer se convierte a cadena con `.toString()` y se pasa tal cual a `money.ts`; en el DTO viaja como cadena. En ningún punto del camino el tipo de cambio es un `number` de JavaScript.

### Una sola compra inicial vigente, garantizada por índice

La validación en la acción es necesaria para dar un mensaje decente, pero no basta: dos envíos simultáneos la pasan los dos. La garantía real es un índice único parcial:

```
{ vehicleId: 1 } unique
  partialFilterExpression: { txType: "Initial", voidedAt: null }
```

Un índice parcial cubre exactamente el enunciado del requisito —a lo sumo una `Initial` vigente por vehículo— y libera el espacio en cuanto la compra se anula, que es justo lo que hace posible corregir una compra inicial mal capturada.

De ahí se desprende el resto de la regla de tipos. `Adjustment` y `Related` exigen que el vehículo ya tenga al menos una compra vigente: un ajuste sobre un costo que no existe es un dato huérfano. `Correction` no lo exige —porque el caso típico es corregir la `Initial`, que quedó anulada y dejó al vehículo sin nada vigente— pero a cambio exige señalar la compra que corrige, que debe pertenecer al mismo vehículo y estar anulada. Esa referencia (`correctsPurchaseId`) es lo que convierte "anular y volver a capturar" en un rastro legible en lugar de dos filas sueltas que solo un humano sabe relacionar.

*Alternativa considerada:* permitir varias `Initial` con advertencia. Es más flexible ante la unidad comprada en dos operaciones, pero ese caso ya tiene nombre —`Related`— y la flexibilidad se paga aceptando el error más caro del sistema: capturar dos veces la compra de la misma unidad y duplicar su costo.

### La compra es inmutable

Una compra no se edita. Ni sus importes, ni su moneda, ni sus notas. La única operación posterior es anularla.

Podría argumentarse una excepción para las notas, que no son parte del importe. Se descarta porque una regla con una excepción se convierte en una regla que hay que consultar, y porque en un registro de costos la nota es parte del registro: "pagado en efectivo al vendedor en la subasta de Otay" es información contable, no un recordatorio. El resultado es que el recurso `purchase` no tiene acción `update` en `permissions.ts` —no existe una operación que ocultar— y que el detalle de una compra no tiene botón de editar.

Lo que sí se sacrifica es la comodidad: corregir un dedazo en una nota obliga a anular y recapturar. Es un costo real y aceptable en un módulo donde el histórico es el producto.

### Unicidad del comprobante por referencia normalizada

La misma idea que `nameKey` en catálogos, aplicada al número de referencia: se deriva `referenceKey` —recortado, con espacios internos colapsados, sin acentos, en mayúsculas— y el índice va sobre él.

```
{ vendorId: 1, referenceKey: 1 } unique
  partialFilterExpression: { referenceKey: { $type: "string" }, voidedAt: null }
```

Parcial por dos razones: la referencia es opcional y varias compras sin referencia deben convivir, y una compra anulada debe liberar su comprobante para que la corrección pueda usar el mismo número —que es el caso normal, porque el comprobante físico es el mismo papel.

La función de normalización se comparte con catálogos: la que hoy vive en `features/catalogs/domain.ts` como `toNameKey` describe una operación genérica de normalización de texto y sube a `lib/text.ts` como `normalizeKey`, con `toNameKey` delegando en ella. Es la primera vez que un segundo dominio la necesita; duplicarla sería garantizar que las dos se separen.

### El guardado doble se resuelve con un token de envío

Deshabilitar el botón en `pending` es lo primero y no es suficiente: no cubre un reintento de red ni un cliente que se adelantó. La defensa del servidor es un `submissionToken` —un UUID que el formulario genera al montarse y renueva tras un guardado exitoso— con índice único disperso.

La acción consulta el token antes de escribir; si ya existe una compra con él, devuelve esa compra como éxito en lugar de crear otra. Si dos envíos verdaderamente simultáneos pasan la consulta, el índice rechaza al segundo con un error 11000 sobre `submissionToken`, que la acción traduce releyendo la compra ganadora y devolviéndola.

Ese segundo camino consume un código que no llega a usarse, porque `nextCode` ya se pidió cuando la colisión aparece. Es un hueco en la secuencia, no un identificador duplicado ni una compra fantasma —justo lo contrario del problema que tenía la hoja, donde los códigos se consumían *sin* que nadie intentara capturar nada—. Se acepta y se documenta; evitarlo requeriría una fase de reserva previa cuyo costo no compensa un caso que solo ocurre con dos envíos en el mismo milisegundo.

### El costo acumulado se compone en la página, no en la feature

La ficha del vehículo debe mostrar su costo de adquisición, pero `features/vehicles` no puede importar `features/purchases`: compras ya depende de vehículos —consume `listVehicleOptions`— y la dependencia inversa cerraría un ciclo entre features, justo lo que prohíbe la regla de dirección de `ARCHITECTURE.md` §2.2.

La composición ocurre una capa arriba. `app/(app)/vehiculos/[code]/page.tsx` consulta `getVehicleByCode` de una feature y `getVehicleAcquisitionCost` de la otra, y pasa el resultado a un componente de compras que se renderiza dentro de la ficha. `app/` puede importar de ambas: es su trabajo, y es la razón por la que las páginas se mantienen delgadas.

Este patrón es el que van a seguir reparaciones, gastos y ventas cuando lleguen. Vale la pena establecerlo bien la primera vez, porque la alternativa —un módulo de "costos" que conozca todas las categorías— se convierte en el nudo donde todo el sistema termina importándose entre sí.

### `sourceType`, `paymentMethod` y `txType` son enumeraciones en código

Misma decisión y misma regla que las cinco listas cerradas del vehículo: valor almacenado en inglés, etiqueta de UI en español, `z.enum` como validación, y la regla de evolución de que un valor ya usado nunca se renombra ni se elimina.

`txType` merece una nota: es una enumeración pero también es la que gobierna el signo, la unicidad de la inicial y la exigencia de una compra base. Esa lógica vive en `domain.ts` como funciones puras sobre el tipo —`allowsNegativeAmounts(txType)`, `requiresExistingPurchase(txType)`, `requiresCorrectionTarget(txType)`—, no dispersa en condicionales dentro de la acción. Es lo que hace que las reglas se puedan probar sin base de datos.

### El formulario agrupa por decisión, no por columna

Cinco secciones que corresponden a decisiones distintas del capturista: Identificación (vehículo, proveedor, fecha, origen, tipo), Moneda (moneda y tipo de cambio, con el tipo de cambio fijado en `1` y bloqueado al elegir USD), Componentes del costo (los ocho, con el total en vivo), Pago y referencias (forma de pago, número de referencia, número de lote) y Notas.

El total en vivo se calcula en el cliente con las mismas funciones de `lib/money.ts` que usa el servidor —son puras y no tocan la base—, de modo que lo que el capturista ve antes de guardar es exactamente lo que se guardará. Es la traducción directa de la tarea 2.4 de la Fase 2 del plan v2, y la razón por la que aquella fase pedía un formulario en primer lugar.

La frontera de costos se enuncia donde se decide: encima de los ocho componentes, no en un manual. Es la única defensa contra registrar una reparación como compra mientras no exista `repairs`.

## Risks / Trade-offs

- **Calcular la conversión en JavaScript no escala a agregaciones grandes** → hoy son decenas de compras por vehículo y cientos en total; el recorrido es irrelevante. La señal de alarma sería un listado que tarde en pintar, y la salida está descrita arriba: un campo derivado escrito por la misma función de dominio, con un test que lo recalcule.
- **La inmutabilidad total obliga a anular y recapturar por un dedazo en una nota** → es el costo de no tener excepciones en un registro contable. Si en la operación diaria resulta insoportable, la salida no es abrir la edición sino agregar comentarios posteriores como entradas aparte, con su propia autoría, que no alteran el registro original.
- **El índice único parcial sobre la compra inicial depende de que la anulación deje `voidedAt` no nulo** → un `voidedAt` mal escrito no rompería nada visible pero dejaría el índice sin efecto. Un test de integración cubre exactamente eso: anular la inicial, registrar la corrección, comprobar que una segunda inicial sigue rechazada.
- **El hueco en la secuencia de códigos por colisión de token** → documentado arriba. Se prefiere un hueco a una compra duplicada, y un test verifica que el segundo envío devuelve la misma compra.
- **`Related` queda con reglas más laxas que los demás tipos y puede convertirse en el cajón de sastre** → hoy solo exige compra base y signo positivo. Conviene vigilar en qué se usa realmente durante los primeros meses; si termina siendo la etiqueta que se elige cuando no se sabe cuál elegir, la respuesta es acotar su definición en el spec, no agregar validaciones.
- **Bloquear la anulación de un vehículo con compras vigentes puede dejar a un `admin` atorado** → el mensaje nombra las compras que lo impiden y enlaza a ellas, de modo que el camino de salida sea evidente. Es preferible a un borrado en cascada, que destruiría registros de costo por una decisión tomada sobre otra entidad.
- **El desglose acumulado por componente es la primera consulta que suma a través de compras con tipos de cambio distintos** → cada compra se convierte con el suyo y luego se suman los USD; nunca se suman importes en monedas distintas ni se promedian tipos de cambio. Un test cubre el vehículo con una compra en USD y otra en MXN.

## Migration Plan

La colección nace vacía. El contador `PUR` arranca en cero: los seis códigos consumidos en la hoja no corresponden a compras reales y no hay importador que los traiga —decisión ya cerrada en `ARCHITECTURE.md` §8—. La primera compra registrada desde la interfaz es `PUR-0001`, que es exactamente el criterio de salida que la Fase 0 del plan v2 nunca alcanzó.

`scripts/seed-counters.ts` se extiende para cubrir `PUR`, con la misma lógica que ya aplica a los otros prefijos: realinear el contador con el código más alto realmente presente.

Si algún día se cargan compras históricas directamente a la base, aplican las mismas condiciones que a los catálogos y los vehículos: `code` respetando la secuencia, contador realineado, `referenceKey` derivado por la función de dominio y no escrito a mano, y a lo sumo una `Initial` vigente por vehículo, porque el índice la va a exigir.

La reversión es vaciar la colección `purchases` y el contador `PUR`, y revertir el bloqueo de anulación en `features/vehicles`. Nada de lo que esta fase agrega modifica documentos existentes de otras colecciones.

## Open Questions

- **¿Qué pasa con `Related` cuando llegue `repairs`?** Un costo relacionado con la adquisición que aparece semanas después —una multa de almacenaje en el patio de la subasta, por ejemplo— puede ser una compra `Related` o un gasto. La frontera se decide en la Fase 6, junto con la de reparaciones, y puede implicar acotar `Related` o retirarlo.
- **¿El costo de adquisición debe poder consultarse por proveedor y por periodo, no solo por vehículo?** Es una pregunta de reporte, no de captura: los datos ya quedan para responderla. Se resuelve en la Fase 5 con el resto de las consultas transversales.
- **¿Debe advertirse cuando el costo de adquisición supera el precio de lista del vehículo?** Es la primera señal de una unidad que va a dar pérdida y el dato está disponible en la ficha. No se implementa aquí porque el precio de lista es una intención cambiante y una advertencia prematura se vuelve ruido; se evalúa cuando exista el módulo de ventas y haya con qué comparar.
