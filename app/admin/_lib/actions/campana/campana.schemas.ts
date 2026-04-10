// Ruta: app/admin/_lib/actions/campana/campana.schemas.ts
import { z } from 'zod';

// Esquema para crear una nueva campaña manualmente desde el CRM
export const crearCampanaParamsSchema = z.object({
    id: z.string().min(1, "El ID del anuncio de Meta es requerido."),
    nombre: z.string().min(3, "El nombre de la campaña es requerido."),
    negocioId: z.string().cuid("El ID del negocio es inválido."),
});

// Esquema para los datos que se mostrarán en la lista de campañas
// Incluye el conteo de leads asociados.
export const campanaConEstadisticasSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    createdAt: z.date(),
    _count: z.object({
        leads: z.number(),
    }),
});

export type CampanaConEstadisticas = z.infer<typeof campanaConEstadisticasSchema>;
