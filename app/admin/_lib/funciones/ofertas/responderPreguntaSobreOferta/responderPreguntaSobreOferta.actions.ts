// Ruta: app/admin/_lib/funciones/ofertas/responderPreguntaSobreOferta/responderPreguntaSobreOferta.actions.ts
"use server";

import type { ActionResult } from '../../../types';
import type { FullExecutionFunctionContext, FunctionResponsePayload } from '../../../dispatcher/dispatcher.types'; // Ajusta la ruta
import {
    ResponderPreguntaSobreOfertaArgsSchema,

    type OfferDetailItemPayloadData,
    type UiComponentPayloadOfferDetailItem,
    type MediaParaDetalleDisplay
} from './responderPreguntaSobreOferta.schemas';
import { MediaItem } from '../../../actions/conversacion/conversacion.schemas';
import {
    buscarRespuestaEnOfertaDetalles,
    type OfertaDetalleConMultimedia
} from './responderPreguntaSobreOferta.helpers';

export async function ejecutarResponderPreguntaSobreOfertaAction(
    argsFromIA: Record<string, unknown>,
    context: FullExecutionFunctionContext
): Promise<ActionResult<FunctionResponsePayload | null>> {
    const actionName = "ejecutarResponderPreguntaSobreOfertaAction";
    console.log(`[${actionName}] Iniciando. TareaId: ${context.tareaEjecutadaId}`);
    console.log(`[${actionName}] Args de IA:`, argsFromIA);

    const validationResult = ResponderPreguntaSobreOfertaArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        console.warn(`[${actionName}] Error de validación de argsFromIA:`, validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            error: "Argumentos de IA inválidos para responderPreguntaSobreOferta.",
            validationErrors: validationResult.error.flatten().fieldErrors,
            data: null
        };
    }

    const { oferta_id, pregunta_usuario } = validationResult.data;
    const { negocioId, canalNombre } = context;

    try {
        const detalleEncontrado: OfertaDetalleConMultimedia | null = await buscarRespuestaEnOfertaDetalles(oferta_id, pregunta_usuario, negocioId);

        if (detalleEncontrado) {
            let contenidoRespuestaPrincipal = detalleEncontrado.contenido;
            const mediaItemsParaWhatsApp: MediaItem[] = [];
            const mediaParaUiPayload: MediaParaDetalleDisplay[] = [];

            // Mapear Galería del Detalle (usando el nombre de relación correcto: galeriaDetalle)
            detalleEncontrado.galeriaDetalle?.forEach(img => {
                if (img.imageUrl) {
                    const caption = img.descripcion || img.altText || undefined;
                    mediaItemsParaWhatsApp.push({ tipo: 'image', url: img.imageUrl, caption: caption });
                    mediaParaUiPayload.push({ tipo: 'image', url: img.imageUrl, caption: caption });
                }
            });

            // Mapear Video del Detalle (usando el nombre de relación correcto: videoDetalle)
            const video = detalleEncontrado.videoDetalle; // Es un objeto o null (relación uno-a-uno/opcional)
            if (video && video.videoUrl && video.tipoVideo) {
                const esVideoHosteado = video.tipoVideo.toUpperCase() === 'SUBIDO' || video.tipoVideo.toUpperCase() === 'DIRECTO_MP4' || video.tipoVideo.toUpperCase() === 'OTRO_URL';

                if (esVideoHosteado) { // Para links directos MP4, etc.
                    mediaItemsParaWhatsApp.push({ tipo: 'video', url: video.videoUrl, caption: video.titulo || undefined });
                } else if (video.tipoVideo.toUpperCase() === 'YOUTUBE' || video.tipoVideo.toUpperCase() === 'VIMEO') {
                    // Para WhatsApp, añadir el link como texto si es de plataforma externa
                    contenidoRespuestaPrincipal += `\n\n🎬 ${video.titulo || 'Video relacionado'}: ${video.videoUrl}`;
                }
                // Siempre añadir al uiPayload para que WebChat lo maneje
                mediaParaUiPayload.push({
                    tipo: 'video', // El frontend de WebChat decidirá cómo renderizarlo
                    url: video.videoUrl,
                    caption: video.titulo || video.descripcion || undefined,
                    // Puedes pasar video.tipoVideo a mediaParaUiPayload si el componente WebChat lo necesita
                    // filename: video.tipoVideo // Ejemplo si quieres pasar el tipo original
                });
            }

            // Mapear Documentos del Detalle (usando el nombre de relación correcto: documentosDetalle)
            detalleEncontrado.documentosDetalle?.forEach(doc => {
                if (doc.documentoUrl) {
                    const caption = doc.descripcion || undefined;
                    const filename = doc.documentoNombre || 'documento';
                    mediaItemsParaWhatsApp.push({ tipo: 'document', url: doc.documentoUrl, filename: filename, caption: caption });
                    mediaParaUiPayload.push({ tipo: 'document', url: doc.documentoUrl, caption: caption, filename: filename });
                }
            });

            const uiPayloadData: OfferDetailItemPayloadData = {
                ofertaId: oferta_id,
                tituloDetalle: detalleEncontrado.tituloDetalle,
                contenido: contenidoRespuestaPrincipal, // El contenido principal del detalle
                tipoDetalle: detalleEncontrado.tipoDetalle,
                mediaAsociada: mediaParaUiPayload
            };

            const uiPayloadFinal: UiComponentPayloadOfferDetailItem | null = canalNombre?.toLowerCase().includes('webchat') ? {
                componentType: 'OfferDetailItem',
                data: uiPayloadData
            } : null;

            // Si hay un componente UI para WebChat, el texto principal puede ser más introductorio.
            // Si no (ej. WhatsApp), el texto principal es el contenido del detalle.
            const textoParaChat = uiPayloadFinal
                ? `Sobre "${detalleEncontrado.tituloDetalle}":\n${contenidoRespuestaPrincipal}`
                : contenidoRespuestaPrincipal;

            return {
                success: true,
                data: {
                    content: textoParaChat,
                    media: mediaItemsParaWhatsApp.length > 0 ? mediaItemsParaWhatsApp : null,
                    uiComponentPayload: uiPayloadFinal as Record<string, unknown> | null
                }
            };
        } else {
            // console.log(`[${actionName}] No se encontró detalle para "${pregunta_usuario}" en oferta ${ofertaId}.`);
            // Aquí va la lógica para PreguntaSinRespuestaOferta
            // await crearPreguntaSinRespuestaOfertaAction({ ofertaId, preguntaUsuario: pregunta_usuario, conversacionId: context.conversacionId });

            const userMessage = `No encontré información específica sobre "${pregunta_usuario}" para esta oferta en particular. ¿Hay algo más en lo que te pueda ayudar o alguna otra pregunta general?`;
            return {
                success: true,
                data: { content: userMessage, media: null, uiComponentPayload: null }
            };
        }

    } catch (error: unknown) {
        console.error(`[${actionName}] Error al procesar pregunta sobre oferta ${oferta_id}:`, error);
        return {
            success: false,
            error: `Error interno al buscar detalles de la oferta: ${error instanceof Error ? error.message : "Error desconocido."}`,
            // Devolver un payload de datos con un mensaje de error genérico para el usuario
            data: { content: "Lo siento, tuve un problema buscando esa información en este momento. Por favor, intenta más tarde.", media: null, uiComponentPayload: null }
        };
    }
}