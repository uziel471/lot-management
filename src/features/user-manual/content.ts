export type ManualSection = {
  id: string
  title: string
  purpose: string
  actions: string[]
  results: string[]
}

export type UserManual = {
  appName: string
  title: string
  publicationDate: string
  revision: string
  audience: string
  sections: ManualSection[]
}

export const USER_MANUAL: UserManual = {
  appName: "LOTE VEHICULOS",
  title: "Manual de usuario",
  publicationDate: "2026-09-01",
  revision: "2026.09",
  audience: "Personal autorizado del lote vehicular.",
  sections: [
    {
      id: "acceso",
      title: "Acceso e inicio de sesion",
      purpose: "Entrar al sistema con una cuenta activa y trabajar solo dentro de los permisos asignados.",
      actions: [
        "Abre la aplicacion y captura tu correo y contrasena en la pantalla de inicio de sesion.",
        "Si los datos son correctos, el sistema abre el panel privado. Si no, muestra un mensaje para corregir las credenciales.",
        "Cierra sesion desde Mi cuenta o desde el menu movil cuando termines de usar un equipo compartido.",
      ],
      results: [
        "La sesion activa identifica tu nombre, correo y rol.",
        "Un usuario sin sesion no puede consultar modulos internos ni descargar este manual.",
      ],
    },
    {
      id: "navegacion",
      title: "Navegacion principal",
      purpose: "Moverse entre los modulos disponibles desde el menu lateral o el menu movil.",
      actions: [
        "Usa Dashboard, Reportes, Vehiculos, Compras, Ventas, Pagos, Reparaciones, Gastos, Catalogos, Usuarios, Manual y Mi cuenta segun aparezcan para tu rol.",
        "En telefono o pantalla pequena, abre el boton de menu para ver las mismas opciones de navegacion.",
        "Selecciona el nombre del modulo para abrir listados, filtros, detalles o formularios relacionados.",
      ],
      results: [
        "La opcion activa queda marcada para ubicarte dentro de la aplicacion.",
        "Los enlaces visibles respetan las reglas de acceso del sistema.",
      ],
    },
    {
      id: "dashboard",
      title: "Dashboard",
      purpose: "Consultar indicadores ejecutivos del lote para revisar inventario, ventas, costos y actividad reciente.",
      actions: [
        "Abre Dashboard desde la navegacion principal.",
        "Ajusta los filtros de periodo cuando esten disponibles para revisar rangos especificos.",
        "Usa los indicadores como apoyo para seguimiento operativo; no sustituyen la revision de los registros fuente.",
      ],
      results: [
        "El tablero muestra informacion consolidada para roles con acceso de consulta ejecutiva.",
        "Si tu rol no tiene permiso, el sistema bloquea la vista.",
      ],
    },
    {
      id: "vehiculos",
      title: "Vehiculos",
      purpose: "Administrar el inventario del lote desde el alta de unidades hasta su seguimiento operativo.",
      actions: [
        "Consulta el listado para buscar por codigo, VIN, numero de inventario o datos de la unidad.",
        "Registra un Nuevo vehiculo cuando una unidad entra al lote y completa los campos conocidos.",
        "Abre el detalle de un vehiculo para revisar datos, imagenes, compras, reparaciones, gastos, ventas y pagos relacionados.",
        "Edita datos permitidos cuando exista informacion nueva, como VIN, titulo, precio de lista o estado.",
      ],
      results: [
        "Cada unidad conserva un codigo interno para seguimiento.",
        "Los cambios operativos quedan reflejados en los modulos relacionados.",
      ],
    },
    {
      id: "compras",
      title: "Compras",
      purpose: "Registrar el costo de adquisicion de cada unidad y consultar obligaciones pendientes con proveedores.",
      actions: [
        "Abre Compras para consultar compras registradas, incluyendo anuladas cuando el listado lo permita.",
        "Usa Registrar compra para capturar vehiculo, proveedor, fecha, origen, moneda, tipo de cambio e importe.",
        "Revisa los pagos aplicados desde el detalle de la compra o desde el modulo Pagos.",
        "Si una compra se capturo mal, solicita o realiza la anulacion segun tu rol y captura el registro correcto.",
      ],
      results: [
        "Una compra guardada no se edita como registro abierto.",
        "El sistema usa compras activas para reportes, saldos y pagos por aplicar.",
      ],
    },
    {
      id: "reparaciones",
      title: "Reparaciones",
      purpose: "Dar seguimiento a trabajos mecanicos, esteticos o de preparacion de una unidad.",
      actions: [
        "Abre Reparaciones para revisar trabajos por vehiculo, proveedor, estatus o fecha.",
        "Registra una reparacion con vehiculo, proveedor, descripcion, costo estimado y datos operativos solicitados.",
        "Actualiza el ciclo de vida de la reparacion con las acciones disponibles, como iniciar, completar, cancelar o anular.",
        "Consulta el detalle para revisar costos, estado actual y relacion con la unidad.",
      ],
      results: [
        "Las reparaciones activas alimentan el costo y seguimiento de cada vehiculo.",
        "Las reparaciones anuladas se conservan para auditoria y no deben tratarse como trabajo vigente.",
      ],
    },
    {
      id: "gastos",
      title: "Gastos",
      purpose: "Registrar gastos generales o asociados a vehiculos que afectan el control financiero del lote.",
      actions: [
        "Abre Gastos para consultar registros por categoria, proveedor, vehiculo o periodo.",
        "Usa Nuevo gasto para capturar fecha, categoria, proveedor, moneda, tipo de cambio, importe y descripcion.",
        "Asocia el gasto a un vehiculo cuando corresponda para que se considere en el costo de la unidad.",
        "Anula un gasto incorrecto y captura uno nuevo cuando necesites corregir informacion.",
      ],
      results: [
        "Los gastos guardados son inmutables fuera de la anulacion.",
        "Los reportes financieros reflejan gastos activos y excluyen los anulados cuando corresponde.",
      ],
    },
    {
      id: "ventas",
      title: "Ventas",
      purpose: "Registrar la venta de unidades y consultar el resultado comercial de cada operacion.",
      actions: [
        "Abre Ventas para revisar operaciones registradas y sus datos principales.",
        "Usa Registrar venta para seleccionar vehiculo, fecha, comprador, moneda, tipo de cambio y precio.",
        "Verifica que el vehiculo y los importes sean correctos antes de guardar.",
        "Anula una venta solo cuando exista una correccion operativa autorizada.",
      ],
      results: [
        "La venta activa cambia la situacion comercial de la unidad.",
        "Los reportes de utilidad usan ventas activas junto con compras, reparaciones y gastos relacionados.",
      ],
    },
    {
      id: "pagos",
      title: "Pagos",
      purpose: "Registrar salidas de dinero y aplicarlas a compras, reparaciones, gastos u otras obligaciones.",
      actions: [
        "Abre Pagos para consultar pagos por proveedor, fecha, metodo o documento fuente.",
        "Usa Nuevo pago para capturar fecha, proveedor, moneda, tipo de cambio, importe y metodo.",
        "Aplica el pago a los documentos pendientes y revisa que la suma aplicada coincida con el importe capturado.",
        "Anula un pago equivocado en lugar de editarlo, para conservar la trazabilidad.",
      ],
      results: [
        "Los saldos pendientes disminuyen solo con pagos activos correctamente aplicados.",
        "Los pagos anulados no deben contarse como dinero aplicado.",
      ],
    },
    {
      id: "reportes",
      title: "Reportes",
      purpose: "Consultar y exportar informacion operativa y financiera para revision del negocio.",
      actions: [
        "Abre Reportes y selecciona el reporte que necesitas revisar.",
        "Configura filtros como periodo, vehiculo, proveedor, categoria, estatus o busqueda cuando el reporte los ofrezca.",
        "Usa las opciones de exportacion CSV o PDF si tu rol tiene permiso.",
        "Revisa los filtros aplicados antes de compartir una exportacion.",
      ],
      results: [
        "Los reportes se generan con informacion vigente del sistema.",
        "Las exportaciones no cambian registros de negocio.",
      ],
    },
    {
      id: "catalogos",
      title: "Catalogos",
      purpose: "Mantener listas base usadas por los formularios, como marcas, modelos, estatus y proveedores.",
      actions: [
        "Abre Catalogos y selecciona el catalogo que necesitas consultar.",
        "Crea o actualiza registros cuando tu rol lo permita.",
        "Desactiva registros que ya no deban elegirse en operaciones nuevas, en lugar de borrarlos.",
        "Verifica ortografia y duplicados antes de guardar para mantener listados limpios.",
      ],
      results: [
        "Los catalogos activos aparecen en formularios y filtros.",
        "Los registros inactivos se conservan para entender operaciones historicas.",
      ],
    },
    {
      id: "usuarios",
      title: "Usuarios",
      purpose: "Administrar cuentas y roles cuando se cuenta con permiso de administrador.",
      actions: [
        "Abre Usuarios para crear cuentas, revisar usuarios existentes y gestionar accesos.",
        "Asigna el rol minimo necesario: administrador, capturista o lectura.",
        "Revoca o ajusta accesos cuando una persona ya no deba operar el sistema.",
        "Usa contrasenas temporales con cuidado y solicita que el usuario las cambie al ingresar.",
      ],
      results: [
        "Solo administradores pueden gestionar usuarios.",
        "Los roles determinan que modulos y acciones aparecen o quedan bloqueados.",
      ],
    },
    {
      id: "cuenta",
      title: "Mi cuenta",
      purpose: "Consultar datos de acceso, cambiar tu propia contrasena y cerrar la sesion actual.",
      actions: [
        "Abre Mi cuenta para revisar nombre, correo, rol y estado de tu sesion.",
        "Cambia tu contrasena capturando la contrasena actual y la nueva.",
        "Cierra sesion al terminar, especialmente en equipos compartidos.",
      ],
      results: [
        "El cambio de contrasena revoca otras sesiones activas.",
        "Tus datos de perfil no administran otros usuarios.",
      ],
    },
    {
      id: "errores-validacion",
      title: "Errores de validacion",
      purpose: "Corregir formularios cuando el sistema indica que falta informacion o algun dato no cumple el formato esperado.",
      actions: [
        "Lee el mensaje mostrado junto al campo o al inicio del formulario.",
        "Corrige los campos solicitados y vuelve a guardar.",
        "Cuando el sistema puede hacerlo de forma segura, los formularios recuperables conservan los valores capturados para que no tengas que repetir todo.",
        "Si un error persiste, revisa permisos, datos obligatorios, importes, fechas y relaciones como vehiculo o proveedor.",
      ],
      results: [
        "Los mensajes de validacion explican que informacion requiere correccion.",
        "Un formulario con errores no crea ni cambia registros hasta que se guarde correctamente.",
      ],
    },
    {
      id: "anulados-inactivos",
      title: "Registros anulados o inactivos",
      purpose: "Entender como tratar registros que se conservan para historial pero no deben usarse como operaciones vigentes.",
      actions: [
        "Usa anular para corregir operaciones registradas con error cuando el modulo y tu rol lo permitan.",
        "No reutilices un registro anulado como si estuviera activo; captura uno nuevo con la informacion correcta.",
        "Desactiva catalogos que ya no deben elegirse en nuevos registros, pero mantenlos para operaciones anteriores.",
        "Consulta listados y reportes verificando si incluyen o excluyen anulados segun el contexto.",
      ],
      results: [
        "La anulacion preserva trazabilidad sin borrar historial.",
        "Los registros inactivos dejan de estar disponibles para nuevas capturas, pero siguen explicando datos historicos.",
      ],
    },
  ],
}

export const REQUIRED_MANUAL_SECTION_TITLES = [
  "Acceso e inicio de sesion",
  "Navegacion principal",
  "Dashboard",
  "Vehiculos",
  "Compras",
  "Reparaciones",
  "Gastos",
  "Ventas",
  "Pagos",
  "Reportes",
  "Catalogos",
  "Usuarios",
  "Mi cuenta",
  "Errores de validacion",
  "Registros anulados o inactivos",
] as const

export function manualTextForValidation(manual: UserManual = USER_MANUAL) {
  return [
    manual.appName,
    manual.title,
    manual.publicationDate,
    manual.revision,
    manual.audience,
    ...manual.sections.flatMap((section) => [
      section.title,
      section.purpose,
      ...section.actions,
      ...section.results,
    ]),
  ].join("\n")
}
