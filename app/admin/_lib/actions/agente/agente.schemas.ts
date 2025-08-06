// app/admin/_lib/actions/agente/agente.schemas.ts
import { z } from 'zod';


export const agenteBasicoSchema = z.object({ // Mover aquí desde conversacion.schemas.ts
    id: z.string().cuid(),
    nombre: z.string().nullable(),
});
export type AgenteBasicoData = z.infer<typeof agenteBasicoSchema>;

// Esquema para los parámetros de obtenerAgentesCrmNegocioAction
export const obtenerAgentesCrmNegocioParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ObtenerAgentesCrmNegocioParams = z.infer<typeof obtenerAgentesCrmNegocioParamsSchema>;

export const CrearAgenteSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    email: z.string().email("Por favor, introduce un email válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    status: z.string().optional().default('activo'),
    // El crmId lo pasaremos desde el contexto de la página, es crucial
    crmId: z.string().cuid("El CRM asociado es inválido."),
});

export type CrearAgenteData = z.infer<typeof CrearAgenteSchema>;

export const EditarAgenteSchema = z.object({
    id: z.string().cuid(), // Necesitamos el ID para saber a quién actualizar
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    email: z.string().email("Por favor, introduce un email válido."),
    // La contraseña es opcional: si se deja en blanco, no se actualiza.
    password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").optional().or(z.literal('')),
    status: z.string(),
});
export type EditarAgenteData = z.infer<typeof EditarAgenteSchema>;



// Define la "forma" de una etapa del pipeline para el Kanban
// Nota: forzamos a que 'orden' sea un número, manejando el null en la acción.
export const PipelineKanbanSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    crmId: z.string(),
    // Forzamos el contrato: el cliente siempre recibirá un número para 'orden'.
    orden: z.number(),
});

// Define la "forma" exacta que el componente LeadCard.tsx espera para cada prospecto
export const LeadInKanbanCardSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    valorEstimado: z.number().nullable(),
    jsonParams: z.any(),
    fechaProximaCita: z.date().nullable(),
    pipelineId: z.string().nullable(),
    agente: z.object({
        id: z.string(),
        nombre: z.string().nullable(),
    }).nullable(),
    Etiquetas: z.array(z.object({
        id: z.string(),
        nombre: z.string(),
        color: z.string().nullable(),
    })),
});

// Define la estructura completa de datos que necesita el tablero Kanban
export const KanbanDataSchema = z.object({
    leads: z.array(LeadInKanbanCardSchema),
    etapasPipeline: z.array(PipelineKanbanSchema),
});

// Exportamos los tipos de TypeScript inferidos desde los schemas de Zod
export type LeadInKanbanCard = z.infer<typeof LeadInKanbanCardSchema>;
export type KanbanData = z.infer<typeof KanbanDataSchema>;
export type PipelineKanban = z.infer<typeof PipelineKanbanSchema>;