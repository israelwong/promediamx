// app/admin/_lib/actions/dashboard/dashboard.schemas.ts
import { z } from 'zod';

// Esquema para la entrada de la acción principal
export const getDashboardDataParamsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
});

// Esquema para cada barra del gráfico de Pipeline
export const pipelineStageDataSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    leadCount: z.number(),
});

// Esquema para cada sección del gráfico de Citas
export const appointmentStatusDataSchema = z.object({
    status: z.string(),
    count: z.number(),
});

// Esquema principal que define toda la data del dashboard
export const dashboardDataSchema = z.object({
    // Fila 1: Los grandes números
    kpis: z.object({
        conversacionesActivas: z.number(),
        leadsNuevosHoy: z.number(),
        citasAgendadasHoy: z.number(),
        // Ingresos es opcional, lo dejamos para el futuro si se necesita.
        // ingresosHoy: z.number(), 
    }),
    // Fila 2: Los flujos
    pipelineStatus: z.array(pipelineStageDataSchema),
    appointmentStatus: z.array(appointmentStatusDataSchema),

    // Fila 3: Los items accionables
    actionItems: z.object({
        erroresAsistente: z.number(),
        knowledgeGapsOfertas: z.number(),
        knowledgeGapsGenerales: z.number(),
    }),
});

// Exportamos el tipo para usarlo en nuestros componentes
export type DashboardData = z.infer<typeof dashboardDataSchema>;