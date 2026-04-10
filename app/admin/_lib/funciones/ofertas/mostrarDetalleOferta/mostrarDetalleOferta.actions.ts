// Ruta: app/admin/_lib/funciones/ofertas/mostrarDetalleOferta/mostrarDetalleOferta.actions.ts
"use server";

// import { ZodError } from "zod"; // Para manejo de errores de validación de Zod
import {
    EjecutarMostrarDetalleOfertaParamsSchema,
    type OfferDisplayPayloadData,
    type UiComponentPayloadOfferDisplay,
    type MediaItem,
    // type DetalleAdicionalParaDisplay,
    // type VideoParaDisplay,
    // type ImagenParaDisplay,
} from "./mostrarDetalleOferta.schemas"; // Schemas Zod e Interfaces actualizadas
import {
    obtenerOfertaConDetallesPorId,
    buscarOfertaPorNombre,
    type OfertaCompleta,
} from "./mostrarDetalleOferta.helpers"; // Helpers actualizados

// Tipos del dispatcher y ActionResult
import type { FullExecutionFunctionContext, FunctionResponsePayload } from '../../../dispatcher/dispatcher.types'; // Ajusta ruta
import type { ActionResult } from '../../../types';
import { ObjetivoOferta as PrismaObjetivoOferta } from '@prisma/client'; // Para el enum

export async function ejecutarMostrarDetalleOfertaAction(
    argsFromIA: Record<string, unknown>,
    context: FullExecutionFunctionContext
): Promise<ActionResult<FunctionResponsePayload | null>> {
    const actionName = "ejecutarMostrarDetalleOfertaAction";
    // console.log(`[${actionName}] V5 Iniciando. TareaId: ${context.tareaEjecutadaId}`);
    // console.log(`[${actionName}] Args de IA:`, argsFromIA);

    // 1. Validar los argumentos de la IA
    const validationResult = EjecutarMostrarDetalleOfertaParamsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        console.warn(`[${actionName}] Error de validación de argsFromIA:`, validationResult.error.flatten().fieldErrors);
        const userMessage = "Para mostrarte los detalles de la oferta, necesito que me indiques el nombre o ID de la oferta.";
        return {
            success: true, // Indica que la función manejó la situación y tiene un mensaje para el usuario
            data: { content: userMessage, media: null, uiComponentPayload: null },
            error: "Argumentos de IA inválidos para mostrarDetalleOferta", // Error interno para logs
            validationErrors: validationResult.error.flatten().fieldErrors
        };
    }
    const { ofertaId, nombre_de_la_oferta } = validationResult.data;
    const { negocioId, canalNombre, idiomaLocale, monedaNegocio } = context;

    try {
        let oferta: OfertaCompleta | null | "multiple" = null;

        if (ofertaId) {
            oferta = await obtenerOfertaConDetallesPorId(ofertaId, negocioId);
        } else if (nombre_de_la_oferta) {
            oferta = await buscarOfertaPorNombre(nombre_de_la_oferta, negocioId);
        }

        if (oferta === "multiple") {
            const userMessage = `Encontré varias ofertas que coinciden con "${nombre_de_la_oferta}". ¿Podrías ser más específico o darme el ID exacto?`;
            return { success: true, data: { content: userMessage, media: null, uiComponentPayload: null } };
        }

        if (!oferta) {
            const userMessage = ofertaId
                ? `No pude encontrar una oferta con el ID "${ofertaId}".`
                : `No encontré una oferta activa llamada "${nombre_de_la_oferta}".`;
            return { success: true, data: { content: userMessage, media: null, uiComponentPayload: null } };
        }

        // Ahora 'oferta' es de tipo OfertaCompleta
        const nombreOferta = oferta.nombre;
        const descripcionGeneral = oferta.descripcion || null;
        const precioPrincipal = oferta.precio ?? 0; // Usar oferta.precio

        // monedaCodigo se toma del negocio asociado a la oferta, o del contexto como fallback
        const monedaDetectada = oferta.negocio?.configuracionPago?.monedaPrincipal || monedaNegocio || "MXN";
        const localeDetectado = idiomaLocale || "es-MX";
        const precioFormateado = new Intl.NumberFormat(localeDetectado, { style: "currency", currency: monedaDetectada }).format(precioPrincipal);

        // Mapear objetivos Enum a array de strings
        const objetivosStrings = oferta.objetivos?.map(obj => PrismaObjetivoOferta[obj]) || [];


        let textoWhatsApp = `✨ *${nombreOferta}* ✨\n\n`;
        if (descripcionGeneral) textoWhatsApp += `${descripcionGeneral}\n\n`;
        textoWhatsApp += `💰 *Precio: ${precioFormateado}*\n`;
        if (objetivosStrings.length > 0) {
            textoWhatsApp += `🎯 Objetivos: ${objetivosStrings.join(', ')}\n`;
        }

        const mediaItemsParaWhatsApp: MediaItem[] = [];
        oferta.OfertaGaleria?.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)).slice(0, 2).forEach(img => { // Limitar a 2 imágenes para WhatsApp
            if (img.imageUrl) {
                mediaItemsParaWhatsApp.push({ tipo: "image", url: img.imageUrl, caption: img.altText || img.descripcion || undefined });
            }
        });

        let videosEnTextoParaWhatsApp = "";
        oferta.videos?.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)).slice(0, 1).forEach(video => { // Limitar a 1 video
            if (video.videoUrl && video.tipoVideo) {
                if (video.tipoVideo === 'SUBIDO' || video.tipoVideo === 'OTRO_URL') { // Asumiendo que estos son links directos
                    mediaItemsParaWhatsApp.push({ tipo: "video", url: video.videoUrl, caption: video.titulo || undefined });
                } else if (video.tipoVideo === 'YOUTUBE' || video.tipoVideo === 'VIMEO') {
                    videosEnTextoParaWhatsApp += `\n🎬 ${video.titulo || 'Video'}: ${video.videoUrl}`;
                }
            }
        });
        if (videosEnTextoParaWhatsApp) textoWhatsApp += `${videosEnTextoParaWhatsApp}\n`;

        // Detalles Adicionales (incluyendo "condiciones" si están marcadas por tipoDetalle o tituloDetalle)
        // if (oferta.detallesAdicionales && oferta.detallesAdicionales.length > 0) {
        //     textoWhatsApp += "\n📄 *Más Detalles y Condiciones:*\n";
        //     oferta.detallesAdicionales.slice(0, 3).forEach(d => { // Limitar para WhatsApp
        //         textoWhatsApp += `• *${d.tituloDetalle}*: ${d.contenido.substring(0, 150)}${d.contenido.length > 150 ? '...' : ''}\n`;
        //     });
        //     if (oferta.detallesAdicionales.length > 3) {
        //         textoWhatsApp += `_(y ${oferta.detallesAdicionales.length - 3} más...)_\n`;
        //     }
        // }

        if (oferta.objetivos?.includes('VENTA')) {
            if (oferta.tipoPago === 'UNICO') {
                textoWhatsApp += "\n✅ Esta oferta se paga en un solo pago.";
            } else if (oferta.tipoPago === 'RECURRENTE') {
                textoWhatsApp += "\n💳 Esta oferta se paga de forma recurrente.";
            }
        }
        if (oferta.objetivos?.includes('CITA')) {
            textoWhatsApp += "\n📅 Puedes agendar una cita para esta oferta.";
        }


        // Preparar payload para WebChat UI
        const imagenPrincipalObj = oferta.OfertaGaleria?.find(img => img.orden === 0) || oferta.OfertaGaleria?.[0];
        const galeriaSinPrincipal = oferta.OfertaGaleria?.filter(img => img.imageUrl !== imagenPrincipalObj?.imageUrl) || [];

        const offerPayloadDataForUI: OfferDisplayPayloadData = {
            id: oferta.id,
            nombre: nombreOferta,
            descripcionGeneral: descripcionGeneral,
            precioFormateado: precioFormateado,
            moneda: monedaDetectada,
            objetivos: objetivosStrings,
            imagenPrincipal: imagenPrincipalObj ? {
                url: imagenPrincipalObj.imageUrl,
                altText: imagenPrincipalObj.altText,
                caption: imagenPrincipalObj.descripcion,
            } : null,
            galeriaImagenes: galeriaSinPrincipal.map(img => ({
                url: img.imageUrl, altText: img.altText, caption: img.descripcion,
            })),
            videos: oferta.videos?.map(v => ({
                tipoVideo: v.tipoVideo as ('YOUTUBE' | 'VIMEO' | 'SUBIDO' | 'OTRO_URL'), // Asegurar el tipo
                videoUrl: v.videoUrl,
                titulo: v.titulo,
            })) || [],
            detallesAdicionales: oferta.detallesAdicionales?.map(d => ({
                tituloDetalle: d.tituloDetalle,
                contenido: d.contenido,
                tipoDetalle: d.tipoDetalle,
            })) || [],
        };

        const uiPayloadParaWebChat: UiComponentPayloadOfferDisplay = {
            componentType: 'OfferDisplay',
            data: offerPayloadDataForUI,
        };

        // NUEVO: Crear el objeto de datos para el contexto de la IA
        const datosParaContextoIA = {
            ofertaId: oferta.id,
            nombreOferta: oferta.nombre,
            objetivos: oferta.objetivos?.map(obj => PrismaObjetivoOferta[obj]) || [],
            // Puedes añadir un resumen o cualquier otro dato clave que la IA
            // pueda necesitar para entender qué se acaba de mostrar.
            resumenMostrado: `Se mostraron los detalles completos de la oferta "${oferta.nombre}".`,
            // Incluso podrías pasar un subconjunto de detalles si es relevante para la IA
            // por ejemplo, los títulos de los primeros OfertaDetalle mostrados:
            // titulosDetallesMostrados: oferta.detallesAdicionales?.slice(0, 2).map(d => d.tituloDetalle) || []
        };

        const finalResponsePayload: FunctionResponsePayload = {
            content: textoWhatsApp.trim(), // Siempre enviar texto, incluso para WebChat como fallback o título
            media: mediaItemsParaWhatsApp.length > 0 ? mediaItemsParaWhatsApp : null,
            // Enviar uiComponentPayload solo si el canal es WebChat (o similar)
            uiComponentPayload: canalNombre?.toLowerCase().includes('webchat') ? (uiPayloadParaWebChat as unknown as Record<string, unknown>) : null,
            aiContextData: datosParaContextoIA, // <--- ¡AQUÍ ESTÁ LA CLAVE!
        };

        return { success: true, data: finalResponsePayload };

    } catch (error: unknown) {
        console.error(`[${actionName}] Error general:`, error);
        const errorReal = error as Error;
        // Para ZodError, ya lo manejamos al inicio validando argsFromIA
        return {
            success: false,
            error: `Error interno al procesar la oferta: ${errorReal.message}`,
            data: { content: "Lo siento, tuve un problema al buscar los detalles de la oferta. Intenta de nuevo.", media: null, uiComponentPayload: null }
        };
    }
}