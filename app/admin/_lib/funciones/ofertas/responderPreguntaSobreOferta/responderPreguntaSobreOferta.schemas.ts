// Ruta: app/admin/_lib/funciones/ofertas/responderPreguntaSobreOferta/responderPreguntaSobreOferta.schemas.ts
import { z } from 'zod';
// import type { MediaItem } from '../../../actions/conversacion/conversacion.schemas'; // Ajusta la ruta si es necesario

// Esquema para los argumentos que la IA debe proporcionar para esta función
export const ResponderPreguntaSobreOfertaArgsSchema = z.object({
    oferta_id: z.string().cuid("ID de oferta inválido. Debe ser un CUID."),
    pregunta_usuario: z.string().min(3, "La pregunta del usuario es demasiado corta.").max(500, "La pregunta del usuario es demasiado larga."),
});
export type ResponderPreguntaSobreOfertaArgs = z.infer<typeof ResponderPreguntaSobreOfertaArgsSchema>;

// --- Interfaces para el payload del componente de UI en WebChat ---
// Estas son interfaces TypeScript, no schemas Zod.

// Para la media asociada a un OfertaDetalle
export interface MediaParaDetalleDisplay {
    tipo: 'image' | 'video' | 'document'; // Podrías usar el enum de MediaItem directamente
    url: string;
    caption?: string | null;
    filename?: string | null; // Para documentos
}

// Payload específico para el componente que mostrará un detalle de la oferta en WebChat
export interface OfferDetailItemPayloadData {
    ofertaId: string;
    tituloDetalle: string;
    contenido: string; // HTML o Markdown que el frontend pueda renderizar
    tipoDetalle?: string | null;
    mediaAsociada: MediaParaDetalleDisplay[];
}

// Estructura del uiComponentPayload que se enviará al WebChat
export interface UiComponentPayloadOfferDetailItem {
    componentType: 'OfferDetailItem'; // Identificador del componente UI
    data: OfferDetailItemPayloadData;
}

// (No necesitamos un schema de datos de salida específico aquí porque la acción
// devolverá directamente el tipo FunctionResponsePayload definido en dispatcher.types.ts)