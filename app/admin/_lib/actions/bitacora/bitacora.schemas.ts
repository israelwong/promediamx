import { z } from 'zod';

// Esquema para obtener las notas de un lead
export const obtenerNotasLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
});

// Esquema para una nota individual
export const notaBitacoraSchema = z.object({
    id: z.string(),
    descripcion: z.string(),
    createdAt: z.date(),
    agente: z.object({
        nombre: z.string().nullable(),
    }).nullable(),
});
export type NotaBitacora = z.infer<typeof notaBitacoraSchema>;

// Esquema para añadir una nueva nota
export const agregarNotaLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    agenteId: z.string().cuid().nullable(),
    descripcion: z.string().min(1, "La nota no puede estar vacía."),
});

export const TIPOS_ACCION_BITACORA = {
    CREACION_LEAD: 'CREACION_LEAD',
    EDICION_LEAD: 'EDICION_LEAD',
    NOTA_MANUAL: 'NOTA_MANUAL',
    CAMBIO_ETAPA: 'CAMBIO_ETAPA',
    ASIGNACION_AGENTE: 'ASIGNACION_AGENTE',
    TRANSFERENCIA_AGENTE: 'TRANSFERENCIA_AGENTE',
    CITA_AGENDADA: 'CITA_AGENDADA',
    CITA_CANCELADA: 'CITA_CANCELADA',
} as const;
