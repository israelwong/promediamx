// Tipo para los datos completos de un Lead para edición
// Incluye relaciones necesarias para mostrar y pre-seleccionar
export type LeadDetallesEditar = Pick<
    Lead,
    'id' | 'nombre' | 'email' | 'telefono' | 'valorEstimado' | 'status' | // Incluir status
    'pipelineId' | 'canalId' | 'agenteId' | 'createdAt' | 'updatedAt'
// Añadir jsonParams si vas a editar campos personalizados aquí
// 'jsonParams'
> & {
    // Incluir objetos relacionados completos o parciales
    pipeline?: Pick<PipelineCRM, 'id' | 'nombre'> | null;
    canal?: Pick<CanalCRM, 'id' | 'nombre'> | null;
    agente?: Pick<Agente, 'id' | 'nombre'> | null;
    etiquetas?: { etiqueta: Pick<EtiquetaCRM, 'id' | 'nombre' | 'color'> }[];
    // Podrías incluir historial de conversaciones, bitácora, etc. si se muestran aquí
};

// Tipo para los datos que se envían al editar (solo campos modificables)
export type EditarLeadFormData = Pick<
    Lead,
    'nombre' | 'telefono' | 'valorEstimado' | 'status' // Email usualmente no se edita
> & {
    pipelineId?: string | null;
    canalId?: string | null;
    agenteId?: string | null;
    etiquetaIds?: string[]; // Array de IDs de etiquetas seleccionadas
    // Incluir campos personalizados si son editables
    // [key: string]: any;
};

// Tipo de retorno para la acción que obtiene los detalles del lead
export interface ObtenerDetallesLeadResult {
    success: boolean;
    data?: LeadDetallesEditar | null;
    error?: string;
}

// Tipo de retorno para la acción de editar lead
export interface EditarLeadResult {
    success: boolean;
    data?: Pick<Lead, 'id' | 'nombre'> | null; // Devolver ID y nombre actualizado
    error?: string;
}

// Tipo para los datos del formulario de nuevo lead
// Incluye campos opcionales para la asignación inicial
export type NuevoLeadFormData = Pick<Lead, 'nombre' | 'email' | 'telefono' | 'valorEstimado'> & {
    pipelineId?: string | null; // Etapa inicial opcional
    canalId?: string | null;    // Canal de origen opcional
    agenteId?: string | null;   // Agente asignado opcional
    etiquetaIds?: string[];     // Etiquetas iniciales opcionales
    // Podrías añadir campos personalizados aquí si los quieres en el form inicial
    // [key: string]: any; // Para campos personalizados dinámicos (más complejo)
};

// Tipo de retorno para la acción de crear lead
export interface CrearLeadResult {
    success: boolean;
    data?: Pick<Lead, 'id' | 'nombre'> | null; // Devolver ID y nombre del lead creado
    error?: string;
}

// Reutilizamos DatosFiltros de crm_leads_types si ya existe,
// o lo definimos aquí si es necesario para los selects del formulario.
export interface DatosFormularioLead {
    pipelines: Pick<PipelineCRM, 'id' | 'nombre'>[];
    canales: Pick<CanalCRM, 'id' | 'nombre'>[];
    etiquetas: Pick<EtiquetaCRM, 'id' | 'nombre' | 'color'>[];
    agentes: Pick<Agente, 'id' | 'nombre'>[];
    crmId: string | null; // ID del CRM asociado
    // Incluir campos personalizados si se añaden al formulario
    // camposPersonalizados: Pick<CRMCampoPersonalizado, 'id' | 'nombre' | 'tipo' | 'requerido'>[];
}

export interface ObtenerDatosFormularioLeadResult {
    success: boolean;
    data?: DatosFormularioLead | null;
    error?: string;
}



// Tipo para representar un Lead en la lista (con datos relacionados)
export type LeadListaItem = Pick<
    Lead,
    'id' | 'nombre' | 'email' | 'telefono' | 'createdAt' | 'updatedAt' | 'status' | 'valorEstimado'
> & {
    pipeline?: Pick<PipelineCRM, 'id' | 'nombre'> | null;
    canal?: Pick<CanalCRM, 'id' | 'nombre'> | null;
    agente?: Pick<Agente, 'id' | 'nombre'> | null;
    etiquetas?: { etiqueta: Pick<EtiquetaCRM, 'id' | 'nombre' | 'color'> }[];
    // Datos de la última conversación/interacción (simplificado)
    ultimaConversacion?: Pick<Conversacion, 'id' | 'updatedAt' | 'status'> | null;
    // Podrías añadir _count de conversaciones o tareas si es útil
};

// Tipo para los filtros aplicados a la lista de leads
export interface FiltrosLeads {
    searchTerm?: string;
    pipelineId?: string | 'all'; // 'all' para mostrar todos
    canalId?: string | 'all';
    etiquetaId?: string | 'all';
    agenteId?: string | 'all';
    // Podrías añadir filtros por fecha, status, etc.
}

// Tipo para las opciones de ordenamiento
export interface OpcionesSortLeads {
    campo: 'createdAt' | 'updatedAt' | 'nombre' | 'valorEstimado';
    direccion: 'asc' | 'desc';
}

// Tipo de retorno para la acción que obtiene los leads
export interface ObtenerLeadsResult {
    success: boolean;
    data?: {
        crmId: string | null;
        leads: LeadListaItem[];
        // Opcional: Información de paginación si la implementas
        // totalCount?: number;
        // currentPage?: number;
        // totalPages?: number;
    } | null;
    error?: string;
}

// Tipo para los datos necesarios para los filtros (obtenidos por separado)
export interface DatosFiltros {
    pipelines: Pick<PipelineCRM, 'id' | 'nombre'>[];
    canales: Pick<CanalCRM, 'id' | 'nombre'>[];
    etiquetas: Pick<EtiquetaCRM, 'id' | 'nombre' | 'color'>[];
    agentes: Pick<Agente, 'id' | 'nombre'>[];
}

export interface ObtenerDatosFiltrosResult {
    success: boolean;
    data?: DatosFiltros | null;
    error?: string;
}

export interface UsuarioExtendido extends Omit<Usuario, 'rol'> { // Omitir 'rol' de Usuario base
    rolNombre?: string | null; // Almacenar el NOMBRE del rol como string
    token?: string;
}

// Tipo para una tarjeta Lead simplificada para el Kanban
export type LeadCardData = Pick<Lead, 'id' | 'nombre' | 'createdAt' | 'updatedAt' | 'pipelineId'> & {
    // Opcional: Añadir más datos si los quieres mostrar en la tarjeta
    agente?: Pick<Agente, 'id' | 'nombre'> | null;
    valorEstimado?: number | null;
    Etiquetas?: { etiqueta: Pick<EtiquetaCRM, 'id' | 'nombre' | 'color'> }[];
    // Puedes añadir _count de tareas o notas si es relevante
};

// Tipo para una columna del Kanban (Etapa del Pipeline)
export type PipelineColumnData = Pick<PipelineCRM, 'id' | 'nombre' | 'orden'> & {
    leads: LeadCardData[]; // Array de leads en esta etapa
};

// Tipo para el estado completo del tablero Kanban
export type KanbanBoardData = {
    crmId: string | null;
    columns: PipelineColumnData[];
};

// Tipo de retorno para la acción que obtiene los datos del Kanban
export interface ObtenerKanbanResult {
    success: boolean;
    data?: KanbanBoardData | null;
    error?: string;
}

// Tipo para la acción de actualizar la etapa de un lead
export interface ActualizarEtapaLeadResult {
    success: boolean;
    // Opcional: devolver el lead actualizado si es necesario
    // data?: Lead;
    error?: string;
}



export type EstadisticasCRMResumen = {
    crmConfigurado: boolean;
    totalLeads?: number | null;
    totalConversaciones?: number | null;
    // Podríamos añadir más detalles después si es necesario
    // leadsPorPipeline?: { pipelineId: string | null; nombre?: string; conteo: number }[] | null;
    // leadsPorEtiqueta?: { etiquetaId: string | null; nombre?: string; color?: string | null; conteo: number }[] | null;
};

// Tipo de retorno estándar para acciones (si no lo tienes global)
export interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// Tipo para representar el estado de completitud de cada sección
export type EstadoSeccionNegocio = {
    completo: boolean; // Indica si la sección se considera completa (ej. campo principal no vacío)
    // podrías añadir más detalles si es necesario, como campos específicos pendientes
};

// Tipo para el objeto que devolverá la acción
export type EstadoConfiguracionNegocio = {
    progresoGeneral: number; // Porcentaje de 0 a 100
    secciones: {
        descripcion: EstadoSeccionNegocio;
        contacto: EstadoSeccionNegocio;
        politicas: EstadoSeccionNegocio;
        marketing: EstadoSeccionNegocio;
        faqObjeciones: EstadoSeccionNegocio;
        // Añadir más secciones si es necesario (ej. logo)
        logo: EstadoSeccionNegocio;
    };
};

// No necesitamos un tipo nuevo complejo, pero sí para los datos del formulario de edición de detalles
export type ImagenGaleriaDetallesInput = Partial<Pick<ItemCatalogoGaleria, 'altText' | 'descripcion'>>;

// Podríamos necesitar un tipo para la acción de reordenar si no existe
export interface ImagenOrdenData {
    id: string;
    orden: number;
}

// Similar a ItemFormData pero asegurando tipos de Prisma
export type ActualizarItemDataInput = Partial<{
    nombre: string;
    descripcion: string | null;
    precio: number; // Asegurar que sea número
    tipoItem: string | null;
    sku: string | null;
    stock: number | null; // Asegurar número o null
    stockMinimo: number | null; // Asegurar número o null
    unidadMedida: string | null;
    linkPago: string | null;
    funcionPrincipal: string | null;
    esPromocionado: boolean;
    AquienVaDirigido: string | null;
    palabrasClave: string | null;
    videoUrl: string | null;
    status: string;
    categoriaId: string | null;
}>;


// En types.ts
export interface AsistenteEnLista {
    id: string;
    nombre: string;
    urlImagen: string | null;
    precioBase: number | null;
    costoTotalTareasAdicionales: number; // Calculado en el backend
    // Opcionales (si decides incluirlos y la consulta los devuelve)
    totalConversaciones?: number;
    totalTareasSuscritas?: number;
    status?: string; // Podría ser útil mostrar el status
}

export interface TareaSuscripcionDetalles {
    tarea: Pick<Tarea, 'id' | 'nombre' | 'descripcion' | 'precio' | 'iconoUrl'> & {
        TareaGaleria?: Pick<TareaGaleria, 'id' | 'imageUrl' | 'altText' | 'descripcion'>[];
        CategoriaTarea?: Pick<CategoriaTarea, 'nombre' | 'color'> | null;
        etiquetas?: Pick<EtiquetaTarea, 'id' | 'nombre'>[];
    };
    suscripcion?: Pick<AsistenteTareaSuscripcion, 'id' | 'status' | 'montoSuscripcion' | 'fechaSuscripcion' | 'fechaDesuscripcion'> | null;
    // --- NUEVOS CAMPOS OPCIONALES ---
    clienteId?: string | null;
    negocioId?: string | null;
    // ------------------------------
}

// Actualizar TareaParaMarketplace para incluir imagen portada
export type TareaParaMarketplace = Pick<Tarea, 'id' | 'nombre' | 'descripcion' | 'precio' | 'categoriaTareaId'> & {
    // Incluir color desde la categoría
    CategoriaTarea?: (Pick<CategoriaTarea, 'nombre'> & { color?: string | null }) | null;
    etiquetas: { etiquetaTarea: Pick<EtiquetaTarea, 'id' | 'nombre'> }[];
    _count: {
        AsistenteTareaSuscripcion: number;
        TareaGaleria: number;
    };
    // Añadir URL de imagen de portada (opcional)
    imagenPortadaUrl?: string | null; // <-- NUEVO
};

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
export type TareaNuevaFormData = Partial<Omit<Tarea, 'id' | 'orden' | 'createdAt' | 'updatedAt' | 'version' | 'status' | 'CategoriaTarea' | 'tareaFuncion' | 'etiquetas' | 'canalesSoportados' | 'camposPersonalizadosRequeridos' | 'AsistenteTareaSuscripcion' | 'TareaEjecutada' | '_count'>> & {
    canalConversacionalId?: string; // Para el select de canal
    etiquetaIds?: string[]; // Para el multi-select de etiquetas
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
    precioBase?: number | null; //! Precio base del asistente virtual.
    version?: number | null; // Version del asistente virtual.
    status?: string | null; // Default: "activo".
    createdAt?: Date | null; // Default: now().
    updatedAt?: Date | null; // Automatically updated.

    // Relaciones
    AsistenteTareaSuscripcion?: AsistenteTareaSuscripcion[];
    TareaEjecutada?: TareaEjecutada[];
    Conversacion?: Conversacion[];
    FacturaItem?: FacturaItem[]; // Relación inversa opcional
    ItemInteraccion?: ItemInteraccion[]; // Opcional: Interacciones relacionadas con este asistente

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
    // CategoriaTarea?: CategoriaTarea | null; // Relación opcional
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

    CategoriaTarea?: Pick<CategoriaTarea, 'id' | 'nombre' | 'color'> | null; // Relación opcional con la categoría
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
    color?: string | null; // Color opcional para la categoría
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
    slogan?: string | null; // Lema, Tagline, Frase de Impacto.
    descripcion?: string | null; // Resumen Ejecutivo, Misión, Visión, Filosofía, Valores, Antecedentes.
    telefonoLlamadas?: string | null;
    telefonoWhatsapp?: string | null;
    email?: string | null;
    direccion?: string | null;
    googleMaps?: string | null;
    paginaWeb?: string | null;
    horarioAtencion?: string | null;
    garantias?: string | null; // Garantías.
    politicas?: string | null; // Políticas de Privacidad, Términos y Condiciones, Políticas de Devolución, Políticas de Reembolso, Políticas de Cancelación.
    avisoPrivacidad?: string | null; // Aviso de Privacidad, Aviso de Cookies, Aviso de Seguridad.
    competencia?: string | null; // Competencia, Análisis FODA, Análisis PESTEL, Análisis de Mercado.
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
    AsistenteVirtual?: (AsistenteVirtual & {
        precioBase?: number | null;
        AsistenteTareaSuscripcion?: AsistenteTareaSuscripcion[];
    })[];
    CRM?: CRM | null; // Added opposite relation field.
    ItemCatalogo?: ItemCatalogo[] | null; // Relación con los items del catálogo
    Notificacion?: Notificacion[]; // Relación opcional con notificaciones
    redesSociales?: NegocioRedSocial[] | null; // Relación a redes sociales
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
    GaleriaNegocio?: GaleriaNegocio[]; // Relación a galerías de negocio
}

export interface GaleriaNegocio {
    id: string;
    negocioId: string;
    negocio?: Negocio; // Relación con Negocio
    nombre: string; // Nombre de la galería (ej: "Fotos del Local")
    descripcion?: string | null; // Descripción opcional
    orden?: number | null; // Para ordenar las galerías entre sí
    status?: string; // Default: "activo"
    createdAt: Date; // Fecha de creación
    updatedAt: Date; // Fecha de última actualización

    // Relación uno-a-muchos con las imágenes de esta galería
    imagenes?: ImagenGaleriaNegocio[]; // Relación con las imágenes de la galería
}

export interface ImagenGaleriaNegocio {
    id: string;
    galeriaNegocioId: string;
    galeriaNegocio?: GaleriaNegocio; // Relación con GaleriaNegocio
    imageUrl: string; // URL de Supabase Storage
    altText?: string | null; // Texto alternativo
    descripcion?: string | null; // Descripción opcional
    orden?: number | null; // Orden de la imagen
    tamañoBytes?: number | null; // Tamaño en bytes
    createdAt: Date; // Fecha de creación
}

export interface NegocioRedSocial {
    id: string;
    negocioId: string;
    negocio?: Negocio; // Relación con Negocio
    nombreRed: string; // Nombre de la red (Ej: "Facebook", "Instagram", "TikTok", etc.)
    url: string; // URL completa del perfil o página
    icono?: string | null; // Opcional: Nombre o clase del icono a usar
    orden?: number | null; // Opcional: Orden para visualización
    createdAt: Date; // Fecha de creación
    updatedAt: Date; // Fecha de última actualización
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
    status: string; // Default: "activo"
    createdAt?: Date; // Default: now()
    updatedAt?: Date; // Automatically updated
    ItemCatalogo?: ItemCatalogo[] | null; // Added opposite relation field
    _count?: {
        ItemCatalogo: number;
    };
    imagenPortadaUrl?: string | null; // URL de la imagen de portada del catálogo
    CatalogoGaleria?: CatalogoGaleria[]; // Relación con la galería del catálogo
}

export interface CatalogoGaleria {
    id: string;
    catalogoId: string;
    catalogo?: Catalogo; // Relación con Catalogo
    imageUrl: string; // URL en Supabase Storage
    altText?: string | null; // Texto alternativo para accesibilidad
    descripcion?: string | null; // Descripción opcional
    orden?: number | null; // Orden de la imagen
    tamañoBytes?: number | null; // Tamaño en bytes
    createdAt: Date; // Fecha de creación
}

export interface ItemCatalogo {
    id: string;
    catalogoId: string;
    catalogo?: Catalogo; // Added relation to Catalogo
    categoriaId?: string | null; // Renamed field
    categoria?: NegocioCategoria | null; // Renamed type and relation
    negocioId?: string | null; // Made negocioId required
    negocio?: Negocio | null; // Added opposite relation
    nombre: string;
    descripcion?: string | null;
    precio: number; // Changed type to Float equivalent
    tipoItem?: string | null; // PRODUCTO, SERVICIO
    sku?: string | null; // Unique identifier
    stock?: number | null;
    stockMinimo?: number | null;
    unidadMedida?: string | null; // pieza, kg, hora, sesión
    linkPago?: string | null;
    funcionPrincipal?: string | null; // For AI
    esPromocionado?: boolean; // For AI/Active promotion
    AquienVaDirigido?: string | null; // For AI
    palabrasClave?: string | null; // Comma-separated keywords for search/SEO/AI
    videoUrl?: string | null; // URL for video
    orden?: number | null;
    status?: string; // activo, inactivo, agotado, proximamente
    createdAt?: Date | null; // Default: now()
    updatedAt?: Date | null; // Automatically updated

    itemEtiquetas?: ItemCatalogoEtiqueta[];
    galeria?: ItemCatalogoGaleria[];
    interacciones?: ItemInteraccion[]; // New inverse relation
    itemCatalogoOfertas?: ItemCatalogoOferta[]; // Relación con las ofertas asociadas al item
}

export interface ItemInteraccion {
    id: string;
    itemCatalogoId: string; // A qué ítem se refiere
    itemCatalogo: ItemCatalogo; // Relación con ItemCatalogo

    tipoInteraccion: string; // Ej: "CHAT_QUERY", "LANDING_CLICK", "PURCHASE", "FAQ_LINK_CLICK"
    timestamp: Date; // Cuándo ocurrió

    // Campos opcionales para dar contexto
    asistenteId?: string | null; // Qué asistente estuvo involucrado (si aplica)
    asistente?: AsistenteVirtual | null; // Relación con AsistenteVirtual
    conversacionId?: string | null; // En qué conversación ocurrió (si aplica)
    conversacion?: Conversacion | null; // Relación con Conversacion

    metadata?: JSON | null; // Para guardar detalles adicionales específicos de la interacción
}

export interface ItemCatalogoGaleria {
    id: string;
    itemCatalogoId: string;
    itemCatalogo?: ItemCatalogo; // Relation to ItemCatalogo
    imageUrl: string; // URL en Supabase Storage
    altText?: string | null; // Texto alternativo para la imagen
    descripcion?: string | null; // Descripción de la imagen
    orden?: number | null; // Orden de la imagen
    tamañoBytes?: number | null; // Tamaño en bytes, guardado al subir
    createdAt: Date; // Fecha de creación
}

export interface ItemCatalogoEtiqueta {
    id: string;
    itemCatalogoId: string;
    itemCatalogo?: ItemCatalogo;
    etiquetaId: string;
    etiqueta?: NegocioEtiqueta;
}

// --- NUEVA Entidad Unificada: Oferta ---
export interface Oferta {
    id: string;
    negocioId: string;
    negocio?: Negocio; // Relación con Negocio
    nombre: string; // Ej: "Descuento Primera Compra", "Promo Día Padre", "Cupón BIENVENIDO10"
    descripcion?: string | null;
    tipoOferta: string; // Ej: 'DESCUENTO_PORCENTAJE', 'DESCUENTO_MONTO', 'CODIGO_PROMOCIONAL', 'ENVIO_GRATIS', 'COMPRA_X_LLEVA_Y', 'GENERAL'
    valor?: number | null; // Valor numérico asociado (ej: 10.0 para 10%, 50.0 para $50)
    codigo?: string | null; // Código promocional único si tipoOferta = 'CODIGO_PROMOCIONAL'
    fechaInicio: Date;
    fechaFin: Date;
    status: string; // activo, inactivo, programada, finalizada
    condiciones?: string | null; // Texto libre para describir condiciones adicionales
    createdAt: Date;
    updatedAt: Date;

    // Relaciones
    itemCatalogoOfertas?: ItemCatalogoOferta[]; // Relación M-N con Items
    galeria?: OfertaGaleria[]; // Galería para la oferta
}

// --- Tabla Intermedia: Item <-> Oferta ---
export interface ItemCatalogoOferta {
    id: string;
    itemCatalogoId: string;
    itemCatalogo?: ItemCatalogo; // Relación con ItemCatalogo
    ofertaId: string;
    oferta?: Oferta; // Relación con Oferta
}

// --- Entidad: Galería de Oferta ---
export interface OfertaGaleria {
    id: string;
    ofertaId: string;
    oferta?: Oferta; // Relación con Oferta
    imageUrl: string; // URL de la imagen
    altText?: string | null; // Texto alternativo
    descripcion?: string | null; // Descripción opcional
    orden?: number | null; // Orden visual
    tamañoBytes?: number | null; // Tamaño en bytes
    createdAt: Date;
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
    itemInteracciones?: ItemInteraccion[]; // <-- AÑADIDO: Interacciones relacionadas con ítems del catálogo
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
