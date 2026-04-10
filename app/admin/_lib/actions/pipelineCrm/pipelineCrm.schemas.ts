import { z } from 'zod';

// Esquema para una Etapa de PipelineCRM (basado en tu modelo Prisma y tipo PipelineCRM)
export const pipelineCrmSchema = z.object({
    id: z.string().cuid(),
    crmId: z.string().cuid(),
    nombre: z.string().min(1, "El nombre es requerido.").max(100, "Nombre muy largo."),
    status: z.string().default('activo'), // Podría ser z.enum(['activo', 'inactivo'])
    orden: z.number().int(), // Hacemos que orden sea requerido y numérico en el tipo de datos
    createdAt: z.date(),
    updatedAt: z.date(),
    // color: z.string().nullable().optional(), // Si añades color a las etapas del pipeline
});
export type PipelineCrmData = z.infer<typeof pipelineCrmSchema>;

// Esquema para el resultado de la acción que obtiene las etapas y el crmId
export const obtenerEtapasPipelineCrmResultSchema = z.object({
    crmId: z.string().cuid().nullable(),
    etapas: z.array(pipelineCrmSchema),
});
export type ObtenerEtapasPipelineCrmResultData = z.infer<typeof obtenerEtapasPipelineCrmResultSchema>;

// Esquema para los parámetros de entrada de listarEtapasPipelineCrmAction
export const listarEtapasPipelineCrmParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ListarEtapasPipelineCrmParams = z.infer<typeof listarEtapasPipelineCrmParamsSchema>;

// Esquema para el formulario de creación/edición de Etapa (solo nombre y status)
export const pipelineCrmFormSchema = z.object({
    nombre: z.string().min(1, "El nombre de la etapa es obligatorio.").max(50, "Nombre demasiado largo."),
    status: z.string().optional(),
    // color: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Color inválido.").nullable().optional().or(z.literal('')), // Si añades color
});
export type PipelineCrmFormData = z.infer<typeof pipelineCrmFormSchema>;

// Esquema para los parámetros de entrada de la acción crearEtapaPipelineCrmAction
export const crearEtapaPipelineCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    nombre: z.string().min(1).max(50),
    status: z.string().optional(),
    // color: z.string().nullable().optional(), // Si añades color
});
export type CrearEtapaPipelineCrmParams = z.infer<typeof crearEtapaPipelineCrmParamsSchema>;

// Esquema para los parámetros de entrada de la acción editarEtapaPipelineCrmAction
export const editarEtapaPipelineCrmParamsSchema = z.object({
    etapaId: z.string().cuid(), // Renombrado de pipelineId para claridad
    datos: pipelineCrmFormSchema,
});
export type EditarEtapaPipelineCrmParams = z.infer<typeof editarEtapaPipelineCrmParamsSchema>;

// Esquema para los parámetros de entrada de la acción eliminarEtapaPipelineCrmAction
export const eliminarEtapaPipelineCrmParamsSchema = z.object({
    etapaId: z.string().cuid(),
});
export type EliminarEtapaPipelineCrmParams = z.infer<typeof eliminarEtapaPipelineCrmParamsSchema>;

// Esquema para un ítem en la lista de reordenamiento de etapas
export const etapaPipelineOrdenSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(1),
});

// Esquema para los parámetros de entrada de la acción reordenarEtapasPipelineCrmAction
export const reordenarEtapasPipelineCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    etapasOrdenadas: z.array(etapaPipelineOrdenSchema),
});
export type ReordenarEtapasPipelineCrmParams = z.infer<typeof reordenarEtapasPipelineCrmParamsSchema>;

export type ObtenerDatosPipelineKanbanParams = z.infer<typeof obtenerDatosPipelineKanbanParamsSchema>;
export type ActualizarEtapaLeadEnPipelineParams = z.infer<typeof actualizarEtapaLeadEnPipelineParamsSchema>;


export interface PipelineSimple {
    id: string;
    nombre: string;
}

export const actualizarEtapaLeadEnPipelineParamsSchema = z.object({
    leadId: z.string().cuid(),
    nuevoPipelineId: z.string().cuid(),
    // CORRECCIÓN: Añadimos los IDs para poder revalidar la ruta correcta
    clienteId: z.string().cuid(),
    negocioId: z.string().cuid(),
});




// Schemas base para las relaciones
const agenteSimpleSchema = z.object({
    id: z.string(),
    nombre: z.string().nullable(),
});

const etiquetaSimpleSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    color: z.string().nullable(),
});

// ✅ Esquema corregido para una tarjeta de Lead en el Kanban
// Se asegura de que todos los campos opcionales se manejen correctamente.
// ✅ Esquema de la tarjeta de Lead actualizado
export const LeadInKanbanCardSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    valorEstimado: z.number().nullable(),
    agente: agenteSimpleSchema.nullable(),
    Etiquetas: z.array(etiquetaSimpleSchema),
    jsonParams: z.any().nullable(),
    fechaProximaCita: z.date().nullable(),
    pipelineId: z.string().nullable(),

});

// Esquema para una columna del Kanban
export const KanbanColumnSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    leads: z.array(LeadInKanbanCardSchema),
});

// Esquema para la estructura completa del tablero Kanban
export const KanbanBoardDataSchema = z.object({
    columns: z.array(KanbanColumnSchema),
});

export type LeadInKanbanCard = z.infer<typeof LeadInKanbanCardSchema>;
export type KanbanColumn = z.infer<typeof KanbanColumnSchema>;
export type KanbanBoardData = z.infer<typeof KanbanBoardDataSchema>;

// ✅ Nuevo schema para la acción de actualizar etapa
export const actualizarEtapaLeadParamsSchema = z.object({
    leadId: z.string().cuid("ID de Lead inválido."),
    nuevoPipelineId: z.string().cuid("ID de Pipeline inválido."),
    negocioId: z.string().cuid("ID de Negocio inválido."),
    clienteId: z.string().cuid("ID de Cliente inválido."),
});


// Esquema para los parámetros de la acción
export const obtenerDatosPipelineKanbanParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
