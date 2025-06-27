// app/admin/_lib/actions/lead/lead.schemas.ts
import { z } from 'zod';

// Esquema para los datos de un pipeline simple (ya definido, lo reusamos)
export const pipelineSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    color: z.string().nullable().optional(),
});
export type PipelineSimpleData = z.infer<typeof pipelineSimpleSchema>;

// Esquema para los datos de un agente simple (ya definido, lo reusamos)
export const agenteSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().nullable(),
});
export type AgenteSimpleData = z.infer<typeof agenteSimpleSchema>;

// Esquema para los datos de una etiqueta simple (ya definido, lo reusamos)
export const etiquetaSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    color: z.string().nullable().optional(),
});
export type EtiquetaSimpleData = z.infer<typeof etiquetaSimpleSchema>;

// Esquema para los datos de un canal simple (ya definido, lo reusamos)
export const canalSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});
export type CanalSimpleData = z.infer<typeof canalSimpleSchema>;


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

// export const obtenerLeadDetallesParamsSchema = z.object({
//     leadId: z.string().cuid(),
// });
// export type ObtenerLeadDetallesParams = z.infer<typeof obtenerLeadDetallesParamsSchema>;

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
    createdAt: z.date(),
    // CORRECCIÓN DEFINITIVA: Hacemos que el esquema espere SIEMPRE una fecha. No permitimos null.
    updatedAt: z.date(),
});
export type LeadDetalleData = z.infer<typeof leadDetalleSchema>;

// Esquema para los datos necesarios para poblar los selects del formulario de Lead
// Similar a DatosParaFiltrosLeadData, pero podría divergir.
export const datosFormularioLeadSchema = z.object({
    crmId: z.string().cuid().nullable(), // CRM ID al que pertenece el negocio
    pipelines: z.array(pipelineSimpleSchema),
    canales: z.array(canalSimpleSchema),
    etiquetas: z.array(etiquetaSimpleSchema), // Todas las etiquetas disponibles del CRM
    agentes: z.array(agenteSimpleSchema),   // Todos los agentes disponibles del CRM
});
export type DatosFormularioLeadData = z.infer<typeof datosFormularioLeadSchema>;

// Esquema para los parámetros de entrada de obtenerLeadDetallesAction (ya lo teníamos, solo confirmar)
export const obtenerLeadDetallesParamsSchema = z.object({ // Ya definido, solo para referencia
    leadId: z.string().cuid(),
});
export type ObtenerLeadDetallesParams = z.infer<typeof obtenerLeadDetallesParamsSchema>;

// Esquema para los parámetros de entrada de obtenerDatosParaFormularioLeadAction
export const obtenerDatosFormularioLeadParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ObtenerDatosFormularioLeadParams = z.infer<typeof obtenerDatosFormularioLeadParamsSchema>;


// Esquema para los datos del formulario al EDITAR un Lead.
// Basado en LeadDetalleData, pero solo con los campos editables.
export const actualizarLeadFormValidationSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido.").max(150, "El nombre es muy largo."),
    telefono: z.string().nullable().optional()
        .transform(val => (val === "" ? null : val)),
    valorEstimado: z.preprocess(
        (val) => {
            // `val` viene de react-hook-form con valueAsNumber: true,
            // por lo que `val` será un `number` o `NaN`.
            if (typeof val === 'number' && isNaN(val)) {
                return undefined; // Convertir NaN (de un input numérico vacío) a undefined
            }
            return val; // Pasar números tal cual
        },
        z.number({ invalid_type_error: "El valor estimado debe ser un número." })
            .positive("El valor estimado debe ser un número positivo.")
            .nullable() // Para permitir que el valor sea explícitamente null
            .optional() // Para permitir que el valor sea undefined (y por ende opcional)
    ),
    status: z.string() // El <select> nativo siempre enviará un string
        .transform(val => val.trim() === "" ? null : val) // Transforma "" a null
        .nullable() // El resultado después de la transformación puede ser null
        .optional(), // El campo puede no estar presente en el objeto inicial antes de la validación
    pipelineId: z.string().cuid("ID de pipeline inválido.").nullable().optional()
        .transform(val => (val === "null" || val === "" ? null : val)),
    canalId: z.string().cuid("ID de canal inválido.").nullable().optional()
        .transform(val => (val === "null" || val === "" ? null : val)),
    agenteId: z.string().cuid("ID de agente inválido.").nullable().optional()
        .transform(val => (val === "null" || val === "" ? null : val)),
    etiquetaIds: z.array(z.string().cuid()).optional(),

});
export type ActualizarLeadFormData = z.infer<typeof actualizarLeadFormValidationSchema>;

export const actualizarLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    datos: actualizarLeadFormValidationSchema, // Usa el schema actualizado
});
export type ActualizarLeadParams = z.infer<typeof actualizarLeadParamsSchema>;


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
    // Podríamos añadir más filtros aquí en el futuro (por pipelineId, tagId, etc.)
});

// Esquema para un único lead en la lista
export const leadListItemSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    email: z.string().email().nullable(),
    telefono: z.string().nullable(),
    createdAt: z.date(),
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
export type ListarLeadsResult = z.infer<typeof listarLeadsResultSchema>;

export const obtenerDetallesLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
});

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



// Esquema para una etiqueta individual
const etiquetaSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    color: z.string().nullable(),
});

// Actualizamos el esquema principal de los detalles del lead
export const leadDetailsSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    email: z.string().nullable(),
    telefono: z.string().nullable(),
    // CORRECCIÓN: Nos aseguramos que la definición aquí requiera el crmId.
    etapaPipeline: z.object({
        id: z.string(),
        nombre: z.string(),
        crmId: z.string(),
    }).nullable(),
    etiquetas: z.array(etiquetaSchema).optional(),
});
export type LeadDetails = z.infer<typeof leadDetailsSchema>;

export const marcarLeadComoGanadoParamsSchema = z.object({
    leadId: z.string().cuid(),
    negocioId: z.string().cuid(),
});


export const cambiarEtapaLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombreEtapaDestino: z.string().min(1),
});