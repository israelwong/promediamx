
// --- Tipo Ultra-Simplificado para Datos de Entrada de Crear Tarea ---
export type CrearTareaBasicaInput = Pick<Tarea, 'nombre' | 'categoriaTareaId'> & {
    canalConversacionalId: string; // Canal principal sigue siendo requerido
};

export interface TareaFuncionParametroRequerido {
    tareaFuncionId: string;
    parametroRequeridoId: string;
    esObligatorio: boolean; // Indica si el parámetro estándar es obligatorio para esta función

    // Relaciones (opcionales según la consulta)
    tareaFuncion?: TareaFuncion;
    parametroRequerido?: ParametroRequerido;
}

// --- Tipo para Actualizar Tarea (Datos del Formulario + IDs de Relaciones) ---
// Define los campos editables de Tarea más los arrays de IDs para canales y etiquetas
export type ActualizarTareaConRelacionesInput = Partial<Pick<Tarea,
    'nombre' |
    'descripcion' |
    'instruccion' |
    'trigger' |
    'precio' |
    'rol' |
    'personalidad' |
    'version' |
    'status' |
    'categoriaTareaId' |
    'tareaFuncionId' |
    'iconoUrl'
>> & {
    // Arrays opcionales de IDs para manejar las relaciones M-N
    canalIds?: string[];
    etiquetaIds?: string[];
};

export type TareaParaEditar = Tarea & {
    _count?: { AsistenteTareaSuscripcion?: number };
    tareaFuncion?: Pick<TareaFuncion, 'id' | 'nombreVisible'> | null;
    // Incluir arrays de relaciones con los IDs necesarios para inicializar checkboxes
    canalesSoportados?: (TareaCanal & { canalConversacional: Pick<CanalConversacional, 'id'> })[];
    etiquetas?: (TareaEtiqueta & { etiquetaTarea: Pick<EtiquetaTarea, 'id'> })[];
};

// --- Crear Función y Asociar Parámetros ---
export interface CrearFuncionData extends Pick<TareaFuncion, 'nombreInterno' | 'nombreVisible' | 'descripcion'> {
    status?: string; // Add status explicitly if it's not part of TareaFuncion
    parametros?: { parametroRequeridoId: string; esObligatorio: boolean }[]; // Array de parámetros a asociar
}

// --- Editar Función y Asociar/Desasociar Parámetros ---
export interface EditarFuncionData extends Partial<Pick<TareaFuncion, 'nombreVisible' | 'descripcion'>> {
    status?: string; // Add status explicitly if it's not part of TareaFuncion
    // NO permitir editar nombreInterno
    parametros?: { parametroRequeridoId: string; esObligatorio: boolean }[]; // Lista COMPLETA de parámetros deseados
}

// Interfaz extendida para vistas específicas (como la lista de negocios)
export interface NegocioConDetalles extends Omit<Negocio, 'AsistenteVirtual'> {
    _count?: {
        AsistenteVirtual?: number;
        Catalogo?: number;
        itemsCatalogo?: number; // Añadir si se necesita
    };
    AsistenteVirtual?: (Pick<AsistenteVirtual, 'id' | 'precioBase' | 'status'> & {
        AsistenteTareaSuscripcion?: Pick<AsistenteTareaSuscripcion, 'montoSuscripcion' | 'status'>[];
    })[];
}

// --- Tipo para el estado del Formulario de Nueva Tarea ---
// Similar a CrearTareaData pero puede tener todos los campos opcionales inicialmente
export type TareaNuevaFormData = Partial<Omit<Tarea, 'id' | 'orden' | 'createdAt' | 'updatedAt' | 'version' | 'status' | 'CategoriaTarea' | 'tareaFuncion' | 'etiquetas' | 'canalesSoportados' | 'camposPersonalizadosRequeridos' | 'AsistenteTareaSuscripcion' | 'TareaEjecutada' | '_count'>> & {
    canalConversacionalId?: string; // Para el select de canal
    etiquetaIds?: string[]; // Para el multi-select de etiquetas
    // No incluimos campos de relaciones complejas aquí
};

export type TareaConDetalles = Tarea & {
    CategoriaTarea: Pick<CategoriaTarea, 'nombre'> | null;
    tareaFuncion: Pick<TareaFuncion, 'id' | 'nombreVisible'> | null;
    etiquetas: {
        etiquetaTarea: Pick<EtiquetaTarea, 'id' | 'nombre'> | null;
    }[];
    canalesSoportados: {
        canalConversacional: Pick<CanalConversacional, 'id' | 'nombre' | 'icono'> | null;
    }[];
    _count?: {
        AsistenteTareaSuscripcion?: number;
        TareaGaleria?: number; // <-- AÑADIR ESTA LÍNEA
        TareaEjecutada?: number; // <-- AÑADIR ESTA LÍNEA
    };
};

export interface SugerenciasTarea {
    sugerencia_descripcion?: string | '';
    sugerencia_rol?: string | '';
    sugerencia_personalidad?: string | '';
    sugerencia_instruccion?: string | '';
}


//! *****************************************************
//! *****************************************************


//! USUARIO
export interface Usuario {
    id: string;
    rolId: string | null; // Relación opcional
    rol?: Rol;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    username: string;
    email: string;
    telefono: string;
    token?: string;
    password?: string;
}

export interface Rol {
    id: string;
    nombre: string;
    descripcion?: string | null;
    createdAt: Date;
    updatedAt: Date;
    usuarios: Usuario[];
}

export interface Sesion {
    id: string;
    usuarioId: string;
    usuario: Usuario;
    token: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

//! CLIENTE
export interface Cliente {
    id: string; // ID es requerido
    nombre?: string;
    email?: string | null; // Hacer opcional y único
    telefono?: string | null; // Hacer opcional
    password?: string | null; // Opcional y debería ser solo para creación/actualización
    rfc?: string | null;
    curp?: string | null;
    razonSocial?: string | null;
    status?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    stripeCustomerId?: string | null; // ID de Cliente en Stripe
    negocio?: (Negocio & { // Ajusta el tipo Negocio si es necesario
        AsistenteVirtual?: (AsistenteVirtual & { // Ajusta el tipo AsistenteVirtual
            precioBase?: number | null; // Añadir si no existe
            AsistenteTareaSuscripcion?: AsistenteTareaSuscripcion[];
        })[];
    })[];

    // Relaciones (opcionales según la consulta)
    contrato?: Contrato[];//!
    Factura?: Factura[]; // Relación con la tabla de facturas
    Notificacion?: Notificacion[]; // Relación opcional con notificaciones
}

export interface ClienteConDetalles extends Cliente {
    _count?: {
        Negocio?: number; // Conteo de negocios
        // negocio?: number; // Conteo de negocios
        Factura?: number; // Conteo de facturas//!
        Notificacion?: number; // Conteo de notificaciones//!
    };
    // Incluir negocios con datos anidados para cálculos
    Negocio?: (Negocio & { // Usar Negocio, no negocio
        _count?: {
            AsistenteVirtual?: number; // Conteo opcional de asistentes por negocio
            Catalogo?: number; // Conteo opcional de catálogos por negocio
        };
        AsistenteVirtual?: (Pick<AsistenteVirtual, 'id' | 'precioBase' | 'status'> & {
            AsistenteTareaSuscripcion?: Pick<AsistenteTareaSuscripcion, 'montoSuscripcion' | 'status'>[];
        })[];
    })[];
}

//! CONTRATO
export interface Contrato {
    id?: string;
    clienteId?: string;
    cliente?: Cliente;
    cotizacionId?: string;
    // cotizacion?: Cotizacion;
    fechaInicio?: Date;
    fechaFin?: Date;
    status?: string;
    suscripcion?: boolean;
    recurrencia?: string;
    monto?: number;
    createdAt?: Date;
    updatedAt?: Date;
    // Pago: Pago[];
    AsistenteVirtual: AsistenteVirtual[];
}

//! ASISTENTE
export interface AsistenteVirtual {
    id: string;
    clienteId?: string | null;
    cliente?: Cliente | null;//! para asociar a cliente 
    negocioId?: string | null;
    negocio?: Negocio | null;
    urlImagen?: string | null;
    nombre: string;
    descripcion?: string | null; // texto libre
    origen?: string | null; // sistema, cliente
    whatsappBusiness?: string | null; // Teléfono de WhatsApp Business.
    phoneNumberId?: string | null; // API de WhatsApp Business.
    token?: string | null; // Identificador de acceso a la API de WhatsApp Business.
    nombreHITL?: string | null; // Nombre responsable del Human in the loop.
    whatsappHITL?: string | null; // Teléfono para consultas human in the loop.
    emailHITL?: string | null; // Email asociado al asistente virtual.
    emailCalendario?: string | null; // Email para agendar citas.
    precioBase?: number | null; // Precio base del asistente virtual.
    version?: number | null; // Version del asistente virtual.
    status?: string | null; // Default: "activo".
    createdAt?: Date | null; // Default: now().
    updatedAt?: Date | null; // Automatically updated.

    // Relaciones
    AsistenteTareaSuscripcion?: AsistenteTareaSuscripcion[];
    TareaEjecutada?: TareaEjecutada[];
    Conversacion?: Conversacion[];
    FacturaItem?: FacturaItem[]; // Relación inversa opcional
    //CRM?: CRM | null; // Added opposite relation field.
}

export interface AsistenteTareaSuscripcion {
    id: string;
    asistenteVirtualId: string;
    asistenteVirtual?: AsistenteVirtual; // Relation to AsistenteVirtual
    tareaId: string;
    tarea?: Tarea; // Relation to Tarea
    fechaSuscripcion: Date; // Default: now()
    fechaDesuscripcion?: Date | null;
    montoSuscripcion?: number | null;
    status?: string; // Default: "activo" (Activo, Inactivo, Cancelado)
    createdAt?: Date | null; // Default: now()
    updatedAt?: Date | null; // Automatically updated
    // Opcional: Link a los items de factura donde se cobró esta suscripción
    FacturaItem?: FacturaItem[];
}

//! CanalConversacional ---
export interface CanalConversacional {
    id: string; // Identificador único
    nombre: string; // Ej: "WhatsApp", "Web Chat", "Facebook Messenger"
    icono?: string | null; // Opcional: Nombre o clase de icono para UI
    descripcion?: string | null; // Descripción opcional
    status: string; // Default: "activo" (activo, inactivo, beta)
    createdAt: Date; // Fecha de creación
    updatedAt: Date; // Fecha de última actualización
    orden?: number | null; // Orden opcional para mostrar canales en un orden específico

    // Relación inversa con la tabla de unión
    tareasSoportadas?: TareaCanal[]; // Relación con las tareas soportadas
}


//! TAREAS
export interface Tarea {
    id: string; // Requerido
    categoriaTareaId?: string;
    CategoriaTarea?: CategoriaTarea | null; // Relación opcional
    orden?: number | null;
    nombre: string;
    descripcion?: string | null;
    instruccion?: string | null;
    trigger?: string | null;

    tareaFuncionId?: string | null; // ID de la función de automatización asociada
    tareaFuncion?: TareaFuncion | null; // Relación con TareaFuncion (opcional)

    precio?: number | null; // Float? -> number | null
    rol?: string | null;
    personalidad?: string | null;
    version: number; // Float -> number
    status: string; // No opcional en schema
    createdAt: Date; // No opcional en schema
    updatedAt: Date; // No opcional en schema

    // Relaciones
    AsistenteTareaSuscripcion?: AsistenteTareaSuscripcion[];
    TareaEjecutada?: TareaEjecutada[];

    // Relaciones M-N (incluir tipos completos o parciales según la acción)
    etiquetas?: TareaEtiqueta[]
    canalesSoportados?: TareaCanal[];

    // --- NUEVO: Relación con campos personalizados requeridos para esta tarea ---
    // camposPersonalizadosRequeridos?: TareaCampoPersonalizado[]; // Relación opcional con campos personalizados requeridos
    camposPersonalizadosRequeridos?: TareaCampoPersonalizado[]; // Si aplica
    _count?: { // Conteo opcional
        AsistenteTareaSuscripcion?: number;
    };

    iconoUrl?: string; // URL para el ícono principal de la tarea
    TareaGaleria?: TareaGaleria[]; // Relación a la galería

    //!!!! sabe
    automatizacion?: string; // Opcional: Descripción de la automatización
}

//! Galería
export interface TareaGaleria {
    id: string;
    tareaId: string;
    tarea?: Tarea; // Relación con la tarea
    imageUrl: string; // URL de la imagen (ej: en Supabase Storage)
    altText?: string; // Texto alternativo para accesibilidad
    descripcion?: string; // Descripción opcional de la imagen
    orden?: number; // Para ordenar las imágenes en la galería
    tamañoBytes?: number; // Opcional: Tamaño en bytes
    createdAt: Date; // Fecha de creación
}

// Datos necesarios después de subir la imagen a Supabase
export type CrearImagenGaleriaInput = Pick<TareaGaleria,
    'tareaId' |
    'imageUrl'
> & Partial<Pick<TareaGaleria, // Campos opcionales
    'altText' |
    'descripcion' |
    'tamañoBytes' |
    'orden'
>>;

export interface CategoriaTarea {
    id: string;
    orden?: number | null;
    nombre?: string;
    descripcion?: string | null;
    createdAt?: Date; // Default: now()
    updatedAt?: Date; // Automatically updated

    // Relaciones (opcionales según la consulta)
    Tarea?: Tarea[];
}

// --- NUEVO Modelo: EtiquetaTarea ---
// Interfaces for EtiquetaTarea
export interface EtiquetaTarea {
    id: string;
    nombre: string;
    descripcion?: string | null;
    orden?: number | null;
    // color?: string | null; // No está en schema
    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    tareas?: TareaEtiqueta[];
}

// Interfaces for TareaEtiqueta (Tabla de Unión)
export interface TareaEtiqueta {
    tareaId: string;
    etiquetaTareaId: string;
    asignadoEn: Date;
    orden?: number | null; // Orden opcional para mostrar etiquetas en un orden específico

    // Relaciones (opcionales según la consulta)
    tarea?: Tarea;
    etiquetaTarea?: EtiquetaTarea;
}

export interface TareaCanal {
    tareaId: string; // ID de la tarea
    tarea?: Tarea; // Relación con la tarea
    canalConversacionalId: string; // ID del canal conversacional
    canalConversacional: CanalConversacional; // Relación con el canal conversacional
    createdAt: Date; // Fecha de creación
    updatedAt: Date; // Fecha de última actualización
}

//! TareaFuncion
export interface TareaFuncion {
    id: string;
    nombreInterno: string;
    nombreVisible: string;
    descripcion?: string | null;
    orden?: number | null; // <-- AÑADIR ESTA LÍNEA

    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    parametrosRequeridos?: TareaFuncionParametroRequerido[];
    tareas?: Tarea[];
}

export interface ParametroRequerido {
    id: string;
    nombreVisible: string; // Nuevo campo
    nombreInterno: string; // Antes 'nombre'
    tipoDato: string;
    descripcion?: string | null;
    orden?: number | null; // Mantenemos 'orden'
    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    funciones?: TareaFuncionParametroRequerido[];

    // Añadir _count si lo usas en las consultas
    _count?: {
        funciones?: number;
    };
}

export interface TareaCampoPersonalizado {
    tareaId: string; // ID de la tarea
    crmCampoPersonalizadoId: string; // ID del campo personalizado
    esRequerido: boolean; // Indica si este campo personalizado es obligatorio para la tarea

    // Relaciones (opcionales según la consulta)
    tarea?: Tarea; // Relación con la tarea
    crmCampoPersonalizado?: CRMCampoPersonalizado; // Relación con el campo personalizado
}

//! TAREAS
export interface TareaEjecutada {
    id: string;
    asistenteVirtualId: string;
    tareaId: string;
    tarea: Tarea; // Relation to Tarea
    fechaEjecutada: Date;
    metadata?: string; // JSON con la metadata de la tarea ejecutada
    createdAt: Date; // Default: now()
}


//! FACTURA
export interface Factura {
    id: string;
    clienteId: string; // Cliente al que se factura
    cliente: Cliente; // Relación con el cliente
    fechaEmision: Date; // Cuando se genera
    fechaVencimiento: Date; // Cuando se debe pagar (ej: día 1 del ciclo)
    periodoInicio: Date; // Inicio del ciclo cubierto (ej: 1 del mes)
    periodoFin: Date; // Fin del ciclo cubierto (ej: fin de mes)
    montoTotal: number; // Suma de los items
    status: string; // pendiente, pagada, vencida, fallida, cancelada
    stripeInvoiceId?: string | null; // ID de la Invoice en Stripe
    stripePaymentIntentId?: string | null; // ID del Payment Intent en Stripe (si aplica)
    createdAt: Date; // Fecha de creación
    updatedAt: Date; // Fecha de última actualización
    items?: FacturaItem[]; // Items incluidos en esta factura
}

export interface FacturaItem {
    id: string;
    facturaId: string; // Relación con la factura
    factura?: Factura; // Relación inversa con la factura
    descripcion: string; // Descripción clara del concepto (ej: "Asistente 'X' - Base", "Tarea 'Y'", "Prorrateo Tarea 'Z'")
    monto: number; // Monto de este item específico
    cantidad: number; // Cantidad del item
    periodoInicio?: Date; // Periodo específico si es prorrateo
    periodoFin?: Date; // Periodo específico si es prorrateo

    // Links al origen del cobro para trazabilidad
    asistenteVirtualId?: string; // Si es el cobro base del asistente
    asistenteVirtual?: AsistenteVirtual; // Relación con AsistenteVirtual
    asistenteTareaSuscripcionId?: string; // Si es el cobro de una tarea suscrita
    asistenteTareaSuscripcion?: AsistenteTareaSuscripcion; // Relación con AsistenteTareaSuscripcion
    // createdAt: Date; // Fecha de creación
    // updatedAt: Date; // Fecha de última actualización
}


//! NEGOCIO
export interface Negocio {
    id: string;
    clienteId?: string | null;
    cliente?: Cliente | null;
    logo?: string | null; // Logo, Imagen de Portada, Imágenes de Productos/Servicios.
    nombre: string;
    descripcion?: string | null; // Resumen Ejecutivo, Misión, Visión, Filosofía, Valores, Antecedentes.
    telefonoLlamadas?: string | null;
    telefonoWhatsapp?: string | null;
    email?: string | null;
    direccion?: string | null;
    googleMaps?: string | null;
    paginaWeb?: string | null;
    redesSociales?: string | null; // Facebook, Instagram, Twitter, LinkedIn, TikTok, Pinterest, YouTube.
    horarioAtencion?: string | null;
    garantias?: string | null; // Garantías.
    politicas?: string | null; // Políticas de Privacidad, Términos y Condiciones, Políticas de Devolución, Políticas de Reembolso, Políticas de Cancelación.
    avisoPrivacidad?: string | null; // Aviso de Privacidad, Aviso de Cookies, Aviso de Seguridad.
    compentencia?: string | null; // Competencia, Análisis FODA, Análisis PESTEL, Análisis de Mercado.
    clienteIdeal?: string | null; // Rango de Edad, Rango de Ingresos, Distribución de Género, Distribución Geográfica, Nivel Educativo, Ocupación, Sector, Motivaciones Principales, Factores de Influencia, Personalidad, Intereses, Lenguaje, Tono de Comunicación Preferido, Canal de Comunicación Preferido.
    terminologia?: string | null; // Terminología del Negocio, Glosario de Términos, Jerga del Sector.
    preguntasFrecuentes?: string | null; // Preguntas Frecuentes, Preguntas Comunes, Preguntas Recurrentes.
    objeciones?: string | null; // Respuestas a Objeciones, Respuestas a Preguntas Frecuentes, Respuestas a Preguntas Comunes.
    suscripcionStatus?: 'activa' | 'inactiva' | 'prueba' | 'cancelada' | null;
    estadoPago?: 'pagado' | 'pendiente' | 'vencido' | null;
    fechaProximoPago?: Date | null;
    createdAt?: Date | null; // Default: now().
    updatedAt?: Date | null; // Automatically updated.
    status?: string | null; // Default: "activo".
    almacenamientoUsadoBytes?: bigint | null; // Contador total

    // Relaciones (opcionales según la consulta)
    Catalogo?: Catalogo[] | null; // Added opposite relation field.
    categorias?: NegocioCategoria[]
    etiquetas?: NegocioEtiqueta[]
    Promocion?: Promocion[] | null;
    Descuento?: Descuento[] | null;
    AsistenteVirtual?: (AsistenteVirtual & {
        precioBase?: number | null;
        AsistenteTareaSuscripcion?: AsistenteTareaSuscripcion[];
    })[];
    CRM?: CRM | null; // Added opposite relation field.
    ItemCatalogo?: ItemCatalogo[] | null; // Relación con los items del catálogo
    Notificacion?: Notificacion[]; // Relación opcional con notificaciones

    _count?: {
        AsistenteVirtual?: number;
        Catalogo?: number;
        categorias?: number;
        etiquetas?: number;
        Promocion?: number;
        Descuento?: number;
        itemsCatalogo?: number;
        Notificacion?: number;
    };

}


export interface NegocioCategoria {
    id: string;
    negocioId: string;
    negocio?: Negocio;
    nombre: string;
    descripcion?: string | null;
    orden?: number | null; //!
    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    ItemCatalogo?: ItemCatalogo[]; // Added opposite relation field
}

// --- Etiqueta del Catálogo --- //
export interface NegocioEtiqueta {
    id: string;
    negocioId: string;
    negocio?: Negocio | null;
    nombre: string;
    descripcion?: string | null;
    orden?: number | null; //!
    status: string;
    createdAt: Date;
    updatedAt: Date;

    itemEtiquetas?: ItemCatalogoEtiqueta[] | null; // Added opposite relation field
}

//! CATÁLOGO
export interface Catalogo {
    id: string;
    negocioId: string;
    negocio?: Negocio;
    nombre: string;
    descripcion?: string | null;
    precio?: number | null;
    status: string; // Default: "activo"
    createdAt?: Date; // Default: now()
    updatedAt?: Date; // Automatically updated

    ItemCatalogo?: ItemCatalogo[] | null; // Added opposite relation field
    // **Añadir _count si lo usas**
    _count?: {
        ItemCatalogo: number;
    };
}

// --- Item del Catálogo --- //
export interface ItemCatalogo {
    id: string;
    catalogoId: string;
    catalogo?: Catalogo; // Added relation to Catalogo
    categoriaId?: string | null; // Renamed field
    categoria?: NegocioCategoria | null; // Renamed type and relation
    negocioId?: string | null; // Added opposite relation field
    negocio?: Negocio | null; // Added opposite relation
    nombre: string;
    descripcion?: string | null;
    precio: number; // Changed type to Float equivalent
    imagen?: string | null;
    linkPago?: string | null;
    funcionPrincipal?: string | null;
    promocionActiva?: string | null;
    AquienVaDirigido?: string | null;
    nivelDePopularidad?: string | null;
    video?: string | null;
    orden?: number | null;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;

    // Relaciones M-N
    ItemCatalogoPromocion?: ItemCatalogoPromocion[];
    ItemCatalogoDescuento?: ItemCatalogoDescuento[];
    itemEtiquetas?: ItemCatalogoEtiqueta[];//
    galeria?: ItemCatalogoGaleria[]; // Relación con galería
}

export interface ItemCatalogoGaleria {
    id: string;
    itemCatalogoId: string;
    itemCatalogo: ItemCatalogo; // Relation to ItemCatalogo
    imageUrl: string; // URL en Supabase Storage
    altText?: string; // Texto alternativo para la imagen
    descripcion?: string; // Descripción de la imagen
    orden?: number; // Orden de la imagen
    tamañoBytes?: number; // Tamaño en bytes, guardado al subir
    createdAt: Date; // Fecha de creación
}

// --- Tabla Intermedia Item-Etiqueta (Muchos-a-Muchos) --- //
export interface ItemCatalogoEtiqueta {
    id: string;
    itemCatalogoId: string;
    itemCatalogo?: ItemCatalogo;
    etiquetaId: string;
    etiqueta?: NegocioEtiqueta;
}

export interface Promocion {
    id?: string;
    negocioId?: string | null;
    negocio?: Negocio | null;
    nombre?: string | null;
    descripcion?: string | null;
    fechaInicio?: Date | null;
    fechaFin?: Date | null;
    status?: string | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    ItemCatalogoPromocion?: ItemCatalogoPromocion[] | null;
}

export interface Descuento {
    id: string;
    negocioId: string;
    negocio?: Negocio | null;
    nombre: string;
    descripcion?: string | null;
    porcentaje?: number | null;
    monto?: number | null;
    fechaInicio: Date | null;
    fechaFin: Date | null;
    status: string;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    ItemCatalogoDescuento?: ItemCatalogoDescuento[] | null;
}

export interface ItemCatalogoPromocion {
    id: string;
    itemCatalogoId: string;
    itemCatalogo: ItemCatalogo;
    promocionId: string;
    promocion: Promocion;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ItemCatalogoDescuento {
    id: string;
    itemCatalogoId: string;
    itemCatalogo: ItemCatalogo;
    descuentoId: string;
    descuento: Descuento;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

//! CRM
export interface CRM {
    id: string;
    negocioId?: string; // Es unique en el schema
    negocio?: Negocio; // Relación inversa (opcional cargarla)
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;

    // Relaciones (opcionales según la consulta)
    Lead?: Lead[];
    Agente?: Agente[];
    Etiqueta?: EtiquetaCRM[];
    Pipeline?: PipelineCRM[];
    Canal?: CanalCRM[];
    CampoPersonalizado?: CRMCampoPersonalizado[];

    // **Añadir _count**
    _count?: {
        Lead?: number;
        Agente?: number;
        Etiqueta?: number;
        Pipeline?: number;
        Canal?: number;
        CampoPersonalizado?: number;
    };
}

export interface CRMCampoPersonalizado {
    id: string;
    crmId: string;
    crm?: CRM; // Relación con CRM
    nombre: string; // Nombre visible
    nombreCampo: string; // Nombre interno (unique)
    tipo: string; // texto, numero, fecha, booleano, seleccion_unica, seleccion_multiple
    opciones?: JSON | null; // Prisma Json -> any o un tipo más específico si se conoce la estructura. Ejemplo: string[] | { value: string; label: string }[] | null;
    requerido: boolean;
    orden?: number | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;

    // --- NUEVO: Relación inversa con las tareas que lo usan ---
    tareasQueLoRequieren?: TareaCampoPersonalizado[];
}

// Interfaces for CanalCRM
export interface CanalCRM {
    id: string;
    crmId: string;
    crm?: CRM; // Relación con CRM
    orden?: number | null;
    nombre: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    Lead?: Lead[];
}

// Interfaces for PipelineCRM
export interface PipelineCRM {
    id: string;
    crmId: string;
    crm?: CRM; // Relación con CRM
    orden?: number | null;
    nombre: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    Lead?: Lead[];
}


export interface EtiquetaCRM {
    id: string;
    crmId: string;
    crm?: CRM | null; // Relación inversa opcional
    orden?: number | null;
    nombre: string;
    color?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Leads?: LeadEtiqueta[]; // Relación con tabla intermedia
}

//! LEAD
export interface Lead {
    id: string;
    crmId: string; // Hecho requerido según sugerencia
    crm?: CRM | null; // Relación inversa opcional
    agenteId?: string | null;
    agente?: Agente | null; // Relación opcional
    canalId?: string | null;
    Canal?: CanalCRM | null; // Relación opcional (usar nombre consistente)
    pipelineId?: string | null; // Corregido typo
    Pipeline?: PipelineCRM | null; // Relación opcional (usar nombre consistente)
    nombre: string;
    email?: string | null; // Hecho opcional
    telefono?: string | null; // Hecho opcional
    jsonParams?: JSON | null; // Usar si se importa
    valorEstimado?: number | null; // Float? -> number | null
    status: string; // No opcional en schema
    createdAt: Date; // No opcional en schema
    updatedAt: Date; // No opcional en schema

    // Relaciones
    Etiquetas?: LeadEtiqueta[]; // Relación con tabla intermedia
    Conversacion?: Conversacion[]; // Relación inversa
    Bitacora?: Bitacora[]; // Relación inversa
    Agenda?: Agenda[]; // Relación inversa
    // Cotizacion?: Cotizacion[]; // Relación inversa (si existe modelo)
}

export interface LeadEtiqueta { // Tabla intermedia
    leadId: string;
    lead?: Lead | null; // Relación inversa opcional
    etiquetaId: string;
    etiqueta?: EtiquetaCRM | null; // Relación opcional (usar nombre consistente)
    asignadoEn: Date; // No opcional en schema
    // No tiene id propio, usa clave compuesta
}

//! AGENTE
export interface Agente {
    id: string;
    crmId: string;
    crm?: CRM | null; // Relación inversa opcional
    userId?: string | null;
    nombre?: string | null;
    email: string; // Requerido y único
    telefono?: string | null;
    password?: string | null; // Debería ser solo para creación/actualización
    rol?: string | null;
    status: string; // No opcional en schema
    createdAt: Date; // No opcional en schema
    updatedAt: Date; // No opcional en schema

    // Relaciones
    Lead?: Lead[];
    Bitacora?: Bitacora[];
    Agenda?: Agenda[];
    Notificacion?: Notificacion[]; // Relación opcional con notificaciones
}

export interface Bitacora {
    id: string;
    agenteId?: string | null;
    agente?: Agente | null; // Relación opcional
    leadId: string;
    lead?: Lead | null; // Relación inversa opcional
    tipoAccion: string;
    descripcion: string;
    metadata?: JSON | null; // Usar JsonValue si se importa
    createdAt: Date; // No opcional en schema
    updatedAt: Date; // No opcional en schema
}

//! AGENDA
export interface Agenda {
    id: string;
    agenteId: string;
    agente?: Agente | null; // Relación inversa opcional
    leadId: string;
    lead?: Lead | null; // Relación inversa opcional
    fecha: Date;
    tipo: string;
    asunto: string;
    descripcion?: string | null;
    status: string; // No opcional en schema
    createdAt: Date; // No opcional en schema
    updatedAt: Date; // No opcional en schema
}

//! CONVERSACIÓN
export interface Conversacion {
    id: string;
    whatsappId?: string | null;
    phoneNumberId?: string | null;
    asistenteVirtualId?: string | null;
    asistenteVirtual?: AsistenteVirtual | null; // Relación opcional
    leadId?: string | null; // Vínculo con Lead
    lead?: Lead | null; // Relación opcional
    status?: string | ''; // No opcional en schema
    intencion?: string | null;
    interes?: string | null;
    createdAt?: Date | null; // No opcional en schema
    updatedAt?: Date | null; // No opcional en schema

    Interaccion?: Interaccion[]; // Relación inversa opcional
}

export interface Interaccion {
    id: string;
    conversacionId: string;
    conversacion?: Conversacion | null; // Relación inversa opcional
    messageId?: string | null;
    role: string; // No opcional en schema
    mensaje?: string | null; // Text? -> string | null
    intencion?: string | null;
    entidad?: string | null;
    interes?: string | null;
    sentimiento?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    createdAt: Date; // No opcional en schema
}

//! NOTIFICACIONES
export interface Notificacion {
    id: string;
    clienteId: string; // A quién pertenece la notificación (el dueño de la cuenta)
    cliente: Cliente; // Relación con Cliente
    negocioId?: string | null; // Opcional: Si la notificación es específica de un negocio
    negocio?: Negocio | null; // Relación con Negocio
    agenteId?: string | null; // No está en schema
    agente?: Agente | null; // No está en schema
    tipo: string; // Ej: 'facturacion', 'lead_nuevo', 'tarea_completada', 'sistema', 'hitl_requerido'
    mensaje: string; // El texto de la notificación
    leida: boolean; // Para marcar si el usuario la vio
    fechaLeida?: Date | null; // Cuándo se marcó como leída
    urlDestino?: string | null; // Opcional: Link para llevar al usuario a la sección relevante
    createdAt: Date; // Fecha de creación
}
