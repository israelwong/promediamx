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