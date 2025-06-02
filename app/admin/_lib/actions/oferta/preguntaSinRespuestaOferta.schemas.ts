import { z } from 'zod';

export const PreguntaSinRespuestaOfertaListItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    preguntaUsuario: z.string(),
    estado: z.string(), // Ej: "PENDIENTE_REVISION", "RESPONDIDA_LISTA_PARA_NOTIFICAR"
    fechaCreacion: z.date(),
    // Opcional: nombre del detalle vinculado si ya está resuelta
    ofertaDetalleRespuesta: z.object({
        id: z.string().cuid(),
        tituloDetalle: z.string(),
    }).nullable().optional(),
});
export type PreguntaSinRespuestaOfertaListItemType = z.infer<typeof PreguntaSinRespuestaOfertaListItemSchema>;