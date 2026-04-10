import { z } from 'zod';

// Esquema para los items que se muestran en la lista de preguntas pendientes
export const PreguntaSinRespuestaOfertaListItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    preguntaUsuario: z.string(),
    estado: z.string(), // Ej: "PENDIENTE_REVISION", "RESPONDIDA_LISTA_PARA_NOTIFICAR"
    fechaCreacion: z.date(),
    // Opcional: Detalle del detalle de oferta vinculado si ya está resuelta
    ofertaDetalleRespuesta: z.object({
        id: z.string().cuid(),
        tituloDetalle: z.string(),
    }).nullable().optional(),
});
export type PreguntaSinRespuestaOfertaListItemType = z.infer<typeof PreguntaSinRespuestaOfertaListItemSchema>;


// --- Esquemas para las nuevas Server Actions ---

// Esquema para la acción de vincular una pregunta a un detalle existente
export const VincularPreguntaInputSchema = z.object({
    preguntaSinRespuestaId: z.string().cuid(),
    ofertaDetalleId: z.string().cuid(),
});
export type VincularPreguntaInputType = z.infer<typeof VincularPreguntaInputSchema>;

// Esquema para la acción de marcar una pregunta como notificada
export const MarcarComoNotificadaInputSchema = z.object({
    preguntaSinRespuestaId: z.string().cuid(),
});
export type MarcarComoNotificadaInputType = z.infer<typeof MarcarComoNotificadaInputSchema>;

