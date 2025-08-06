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