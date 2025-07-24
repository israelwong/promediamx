// app/admin/_lib/actions/lead/lead.schemas.ts
import { z } from 'zod';


// Asumiendo que estos schemas simples existen en alguna parte para la validación
const pipelineSimpleSchema = z.object({ id: z.string(), nombre: z.string() });
const canalSimpleSchema = z.object({ id: z.string(), nombre: z.string() });
const etiquetaSimpleSchema = z.object({ id: z.string(), nombre: z.string(), color: z.string().nullable() });
const agenteSimpleSchema = z.object({ id: z.string(), nombre: z.string().nullable() });

// Schema para los parámetros de entrada de la acción
export const obtenerDatosFormularioLeadParamsSchema = z.object({
    negocioId: z.string().cuid(),
});

// ✅ Se añade un schema para los campos personalizados
const campoPersonalizadoSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    tipo: z.string(), // ej. 'TEXTO', 'NUMERO', 'FECHA', 'SELECT'
    nombreCampo: z.string(), // ej. 'colegio', 'nivel_educativo'
    metadata: z.any().nullable(), // Para opciones de select, etc.
});

// Se actualiza el schema de datos del formulario para incluir los campos personalizados
export const datosFormularioLeadSchema = z.object({
    crmId: z.string().cuid().nullable(),
    pipelines: z.array(pipelineSimpleSchema),
    canales: z.array(canalSimpleSchema),
    etiquetas: z.array(etiquetaSimpleSchema),
    agentes: z.array(agenteSimpleSchema),
    camposPersonalizados: z.array(campoPersonalizadoSchema), // ✅ Se añade el nuevo campo
});
export type DatosFormularioLeadData = z.infer<typeof datosFormularioLeadSchema>;

// Se actualiza el schema de actualización para aceptar un jsonParams dinámico
const actualizarLeadFormValidationSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido."),
    email: z.string().email("Debe ser un email válido.").nullable().optional().or(z.literal('')),
    telefono: z.string().nullable().optional(),
    // Se usa preprocess para manejar el caso de un input numérico vacío
    valorEstimado: z.preprocess(
        (val) => (val === "" || val === null || (typeof val === 'number' && isNaN(val)) ? null : Number(val)),
        z.number().positive("El valor estimado debe ser un número positivo.").nullable().optional()
    ),
    status: z.string().nullable().optional(),
    pipelineId: z.string().cuid().nullable().optional(),
    canalId: z.string().cuid().nullable().optional(),
    agenteId: z.string().cuid().nullable().optional(),
    etiquetaIds: z.array(z.string().cuid()).optional(),
    jsonParams: z.record(z.string()).optional(),
});
export type ActualizarLeadFormData = z.infer<typeof actualizarLeadFormValidationSchema>;

export const actualizarLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    datos: actualizarLeadFormValidationSchema,
});
export type ActualizarLeadParams = z.infer<typeof actualizarLeadParamsSchema>;



// Esquema para cada Lead en la lista (basado en tu LeadListaItem)
export const leadListaItemSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    email: z.string().email().nullable().optional(),
    telefono: z.string().nullable().optional(),
    status: z.string().nullable().optional(), // Considerar z.enum si los estados son fijos
    createdAt: z.date(),
    updatedAt: z.date().nullable().optional(),
    valorEstimado: z.number().nullable().optional(),
    pipeline: pipelineSimpleSchema.nullable().optional(),
    agente: agenteSimpleSchema.nullable().optional(),
    etiquetas: z.array(z.object({ etiqueta: etiquetaSimpleSchema })).optional(), // Array de objetos que contienen 'etiqueta'
    ultimaConversacion: z.object({
        id: z.string().cuid(),
        updatedAt: z.date(),
        status: z.string(),
    }).nullable().optional(),
});
export type LeadListaItemData = z.infer<typeof leadListaItemSchema>;

// Esquema para los filtros aplicados a la lista de Leads (basado en tu FiltrosLeads)
export const filtrosLeadsSchema = z.object({
    searchTerm: z.string().nullable().optional(),
    pipelineId: z.string().nullable().optional(), // 'all' o CUID
    canalId: z.string().nullable().optional(),    // 'all' o CUID
    etiquetaId: z.string().nullable().optional(), // 'all' o CUID
    agenteId: z.string().nullable().optional(),   // 'all' o CUID
});
export type FiltrosLeadsData = z.infer<typeof filtrosLeadsSchema>;

// Esquema para las opciones de ordenamiento (basado en tu OpcionesSortLeads)
export const opcionesSortLeadsSchema = z.object({
    campo: z.enum(['nombre', 'createdAt', 'updatedAt', 'valorEstimado']),
    direccion: z.enum(['asc', 'desc']),
});
export type OpcionesSortLeadsData = z.infer<typeof opcionesSortLeadsSchema>;


export type ListarLeadsResultData = z.infer<typeof listarLeadsResultSchema>;


// Esquema para los datos devueltos por obtenerDatosParaFiltrosLeadAction (basado en tu DatosFiltros)
export const datosParaFiltrosLeadSchema = z.object({
    crmId: z.string().cuid().nullable(),
    pipelines: z.array(pipelineSimpleSchema),
    canales: z.array(canalSimpleSchema),
    etiquetas: z.array(etiquetaSimpleSchema),
    agentes: z.array(agenteSimpleSchema),
});
export type DatosParaFiltrosLeadData = z.infer<typeof datosParaFiltrosLeadSchema>;

// Esquema para los parámetros de entrada de obtenerDatosParaFiltrosLeadAction
export const obtenerDatosParaFiltrosLeadParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ObtenerDatosParaFiltrosLeadParams = z.infer<typeof obtenerDatosParaFiltrosLeadParamsSchema>;

// --- Esquemas para detalles de Lead (si los moviste aquí desde conversacion.schemas.ts) ---
export const leadDetailsForPanelSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    email: z.string().email().nullable().optional(),
    telefono: z.string().nullable().optional(),
});
export type LeadDetailsForPanelData = z.infer<typeof leadDetailsForPanelSchema>;




export const obtenerEtiquetasAsignadasLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
});

export const actualizarEtiquetasLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    etiquetaIds: z.array(z.string().cuid()),
    conversacionId: z.string().cuid(),
    nombreAgenteQueActualiza: z.string().nullable().optional(),
});
export type ActualizarEtiquetasLeadParams = z.infer<typeof actualizarEtiquetasLeadParamsSchema>;



// Esquema para los detalles completos de un Lead para el formulario de edición
export const leadDetalleSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    email: z.string().nullable(),
    telefono: z.string().nullable(),
    status: z.string().nullable(),
    pipelineId: z.string().nullable(),
    agenteId: z.string().nullable(),
    canalId: z.string().nullable(),
    valorEstimado: z.number().nullable(),
    etiquetaIds: z.array(z.string()),
    // ✅ Se añade jsonParams para que el frontend reciba los datos
    jsonParams: z.any().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type LeadDetalleData = z.infer<typeof leadDetalleSchema>;


export const obtenerLeadDetallesParamsSchema = z.object({ // Ya definido, solo para referencia
    leadId: z.string().cuid(),
});
export type ObtenerLeadDetallesParams = z.infer<typeof obtenerLeadDetallesParamsSchema>;


// Esquema para los parámetros de entrada de la acción eliminarLeadAction
export const eliminarLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
});
export type EliminarLeadParams = z.infer<typeof eliminarLeadParamsSchema>;


// Esquema para la validación del formulario de NUEVO Lead
export const nuevoLeadFormValidationSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido.").max(150, "El nombre es muy largo."),
    email: z.string().email("Email inválido.").nullable().optional()
        .transform(val => (val === "" ? null : val)), // Transforma string vacío a null
    telefono: z.string().nullable().optional()
        .transform(val => (val === "" ? null : val)), // Transforma string vacío a null
    valorEstimado: z.number().nullable().optional(), // <-- Cambia a number().nullable().optional()
});
export type NuevoLeadFormData = z.infer<typeof nuevoLeadFormValidationSchema>;

// Esquema para los parámetros de entrada de la acción crearLeadAction
export const crearLeadParamsSchema = z.object({
    crmId: z.string().cuid("ID de CRM inválido."), // Necesario para asociar el Lead
    negocioId: z.string().cuid(), // Para buscar el primer pipeline/canal por defecto
    datos: nuevoLeadFormValidationSchema, // Los datos validados del formulario
});
export type CrearLeadParams = z.infer<typeof crearLeadParamsSchema>;


// Esquema para la entrada de la acción de listar leads
export const listarLeadsParamsSchema = z.object({
    negocioId: z.string().cuid(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().default(10),
    searchTerm: z.string().optional(),
    colegio: z.string().optional(),
    etapa: z.string().optional(),
});


// Esquema para un único lead en la lista
export const leadListItemSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    email: z.string().email().nullable(),
    telefono: z.string().nullable(),
    createdAt: z.date(),
    // ✅ Se añade jsonParams para pasar los datos del colegio, grado, etc.
    jsonParams: z.any().nullable(),
    etapaPipeline: z.object({
        id: z.string().cuid(),
        nombre: z.string(),
    }).nullable(),
    agenteAsignado: z.object({
        id: z.string().cuid(),
        nombre: z.string().nullable(),
    }).nullable(),
});
// Esquema para la respuesta completa de la acción
export const listarLeadsResultSchema = z.object({
    leads: z.array(leadListItemSchema),
    totalCount: z.number(),
    page: z.number(),
    pageSize: z.number(),
});

export type ListarLeadsParams = z.infer<typeof listarLeadsParamsSchema>;
export type LeadListItem = z.infer<typeof leadListItemSchema>;


// export const obtenerDetallesLeadParamsSchema = z.object({
//     leadId: z.string().cuid(),
// });

export const asignarEtiquetaLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    nombreEtiqueta: z.string().min(1),
    // Opcional: para crear la etiqueta si no existe
    crmId: z.string().cuid(),
    colorEtiqueta: z.string().optional(),
});

export const etiquetarYReubicarLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombreEtiqueta: z.string().min(1),
    nombreEtapaDestino: z.string().min(1), // El nombre de la columna del pipeline a la que se moverá
});


export const marcarLeadComoGanadoParamsSchema = z.object({
    leadId: z.string().cuid(),
    negocioId: z.string().cuid(),
});


export const cambiarEtapaLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombreEtapaDestino: z.string().min(1),
});


// Esquema para la validación del formulario de NUEVO Lead
export const nuevoLeadBasicoFormSchema = z.object({
    nombre: z.string().min(3, "El nombre es requerido y debe tener al menos 3 caracteres."),
    email: z.string().email("Debe ser un email válido.").optional().or(z.literal('')),
    telefono: z.string().min(10, "El teléfono debe tener al menos 10 dígitos.").optional().or(z.literal('')),
}).refine(data => data.email || data.telefono, {
    message: "Se requiere al menos un email o un teléfono.",
    path: ["email"],
});

export type NuevoLeadBasicoFormData = z.infer<typeof nuevoLeadBasicoFormSchema>;

// ✅ CORRECCIÓN: La acción ahora espera 'negocioId' en lugar de 'crmId'.
export const crearLeadBasicoParamsSchema = z.object({
    negocioId: z.string().cuid("ID de Negocio inválido."),
    datos: nuevoLeadBasicoFormSchema,
});

export type CrearLeadBasicoParams = z.infer<typeof crearLeadBasicoParamsSchema>;



export const etiquetaSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    color: z.string().nullable(),
});

// Esquema para los detalles del Lead, usado en el modal y la página de detalles
export const leadDetailsSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    email: z.string().nullable(),
    telefono: z.string().nullable(),
    jsonParams: z.any().nullable(),
    etapaPipeline: z.object({
        id: z.string(),
        nombre: z.string(),
        crmId: z.string(),
    }).nullable(),
    etiquetas: z.array(etiquetaSchema).optional(),
});
export type LeadDetails = z.infer<typeof leadDetailsSchema>;

// Esquema para los parámetros de la acción obtenerDetallesLeadAction
export const obtenerDetallesLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
});


export const LeadUnificadoFormSchema = z.object({
    // --- Datos del Lead ---
    id: z.string().cuid().optional(),
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    email: z.string().email("Por favor, introduce un email válido.").nullable().optional(),
    telefono: z.string().optional(),
    status: z.string(),
    pipelineId: z.string().cuid("Debes seleccionar una etapa del pipeline."),
    valorEstimado: z.number().positive("El valor estimado debe ser un número positivo.").nullable().optional(),

    jsonParams: z.object({
        colegio: z.string().optional(),
        nivel_educativo: z.string().optional(),
        grado: z.string().optional(),
    }).optional(),

    // ✅ Se añade el campo para los IDs de las etiquetas seleccionadas
    etiquetaIds: z.array(z.string().cuid()).optional(),

    // --- Datos de la Cita (Opcionales) ---
    fechaCita: z.date().optional().nullable(),
    horaCita: z.string().optional().nullable(),
    tipoDeCitaId: z.string().cuid().optional().nullable(),
    modalidadCita: z.string().optional().nullable(),

    // --- IDs de contexto ---
    negocioId: z.string().cuid(),
    crmId: z.string().cuid(),
}).refine(data => {
    if (data.fechaCita) {
        return !!data.horaCita && !!data.tipoDeCitaId && !!data.modalidadCita;
    }
    return true;
}, {
    message: "Si agendas una cita, debes especificar todos sus detalles.",
    path: ["fechaCita"],
});

export type LeadUnificadoFormData = z.infer<typeof LeadUnificadoFormSchema>;


export const LeadParaTablaSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    email: z.string().nullable(),
    telefono: z.string().nullable(),
    createdAt: z.date(),
    pipelineNombre: z.string().nullable(),
    colegio: z.string().nullable(),
});
export type LeadParaTabla = z.infer<typeof LeadParaTablaSchema>;

export const ListarLeadsResultSchema = z.object({
    leads: z.array(LeadParaTablaSchema),
    totalCount: z.number(),
    page: z.number(),
    pageSize: z.number(),
    startIndex: z.number(),
});
export type ListarLeadsResult = z.infer<typeof ListarLeadsResultSchema>;

export const DatosFiltrosLeadSchema = z.object({
    pipelines: z.array(z.object({ id: z.string(), nombre: z.string() })),
    colegios: z.array(z.string()),
});
export type DatosFiltrosLead = z.infer<typeof DatosFiltrosLeadSchema>;

export const ConteoPorEtapaSchema = z.object({
    totalLeads: z.number(),
    etapas: z.array(z.object({
        nombre: z.string(),
        _count: z.object({
            leads: z.number(),
        }),
    })),
});
export type ConteoPorEtapa = z.infer<typeof ConteoPorEtapaSchema>;