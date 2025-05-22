import { z } from 'zod';
import { agenteSimpleSchema, etiquetaSimpleSchema } from '@/app/admin/_lib/actions/lead/lead.schemas'; // Reutilizar de lead si es apropiado


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







// Esquema para los datos de una tarjeta Lead en el Kanban (basado en tu LeadCardData)
export const leadCardKanbanSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    pipelineId: z.string().cuid().nullable(), // El ID de la etapa en la que está
    valorEstimado: z.number().nullable().optional(),
    agente: agenteSimpleSchema.nullable().optional(), // Reutilizamos el schema de agente
    Etiquetas: z.array(z.object({ // La estructura de Prisma es LeadEtiqueta -> etiqueta
        etiqueta: etiquetaSimpleSchema,
    })).optional().default([]),
    // Puedes añadir más campos que necesites mostrar en la tarjeta del lead
});
export type LeadCardKanbanData = z.infer<typeof leadCardKanbanSchema>;

// Esquema para una columna del Pipeline en el Kanban (una Etapa con sus Leads)
export const pipelineColumnKanbanSchema = z.object({
    id: z.string().cuid(),        // ID de la PipelineCRM (etapa)
    nombre: z.string(),
    orden: z.number().int(),      // Orden de la columna
    leads: z.array(leadCardKanbanSchema),
    // color: z.string().nullable().optional(), // Si tus etapas tienen color
});
export type PipelineColumnKanbanData = z.infer<typeof pipelineColumnKanbanSchema>;

// Esquema para los datos completos del tablero Kanban
export const kanbanBoardDataSchema = z.object({
    crmId: z.string().cuid().nullable(),
    columns: z.array(pipelineColumnKanbanSchema),
});
export type KanbanBoardData = z.infer<typeof kanbanBoardDataSchema>;

// Esquema para los parámetros de entrada de obtenerDatosPipelineKanbanAction
export const obtenerDatosPipelineKanbanParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ObtenerDatosPipelineKanbanParams = z.infer<typeof obtenerDatosPipelineKanbanParamsSchema>;


// Esquema para los parámetros de entrada de la acción actualizarEtapaLeadEnPipelineAction
export const actualizarEtapaLeadEnPipelineParamsSchema = z.object({
    leadId: z.string().cuid(),
    nuevoPipelineId: z.string().cuid(), // El ID de la nueva columna/etapa
    // Opcional: podrías pasar el orden dentro de la nueva columna si quieres manejarlo en el servidor
    // nuevoOrdenEnEtapa: z.number().int().optional(), 
    // clienteId y negocioId para revalidación si es necesario
    // clienteId: z.string().cuid(),
    // negocioId: z.string().cuid(),
});
export type ActualizarEtapaLeadEnPipelineParams = z.infer<typeof actualizarEtapaLeadEnPipelineParamsSchema>;


// (Otros schemas de pipelineCrm.schemas.ts como pipelineCrmSchema, pipelineCrmFormSchema, etc., se mantienen)

export interface PipelineSimple {
    id: string;
    nombre: string;
}