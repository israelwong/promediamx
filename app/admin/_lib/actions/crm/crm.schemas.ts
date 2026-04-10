/* Ruta: app/admin/_lib/actions/crm/crm.schemas.ts
*/
import { z } from 'zod';

export const obtenerEstadoManyChatParamsSchema = z.object({
    negocioId: z.string().cuid("El ID del negocio es inválido."),
});

// ✅ CORREGIDO: Se añade clienteId para que coincida con los parámetros de la acción.
export const actualizarManyChatApiKeyParamsSchema = z.object({
    clienteId: z.string().cuid("El ID del cliente es inválido."),
    negocioId: z.string().cuid("El ID del negocio es inválido."),
    apiKey: z.string().min(1, "La API Key no puede estar vacía."),
});
