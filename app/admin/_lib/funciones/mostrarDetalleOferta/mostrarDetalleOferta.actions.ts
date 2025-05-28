// app/admin/_lib/funciones/mostrarDetalleOferta/mostrarDetalleOferta.actions.ts
"use server";

import { ZodError } from "zod";
import {
    EjecutarMostrarDetalleOfertaParamsSchema,
    type OfferDisplayPayloadData, // Asumiendo que se exporta desde aquí
    type UiComponentPayloadContent,  // Asumiendo que se exporta desde aquí
} from "./mostrarDetalleOferta.schemas";
import {
    obtenerOfertaConDetallesPorId,
    buscarOfertaPorNombre,
    type OfertaCompleta,
} from "./mostrarDetalleOferta.helpers";

import {
    type MediaItem,
    type FunctionResponseMediaData,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { type SimpleFuncionContext } from "@/app/admin/_lib/types";

type MostrarDetalleOfertaActionResult = {
    actionName: string;
    params: unknown;
    success: boolean;
    message: string;
    data?: FunctionResponseMediaData; // Este es el tipo de retorno unificado
    error?: string;
    validationErrors?: Record<string, string[] | undefined>;
};

export async function ejecutarMostrarDetalleOfertaAction(
    params: unknown,
    contexto?: SimpleFuncionContext
): Promise<MostrarDetalleOfertaActionResult> {
    const actionName = "ejecutarMostrarDetalleOfertaAction";
    console.log(`[${actionName}] V4 DEBUG - Iniciando. Params: ${JSON.stringify(params)}, Contexto: ${JSON.stringify(contexto)}`);


    try {
        const validatedParams = EjecutarMostrarDetalleOfertaParamsSchema.parse(params);
        const { ofertaId, nombre_de_la_oferta } = validatedParams;

        const canalDetectado = contexto?.canalNombre || "webchat";
        console.log(`[${actionName}] V4 DEBUG - Canal Detectado Rigurosamente: "${canalDetectado}"`); // LOG CLAVE

        let oferta: OfertaCompleta | null = null;
        if (ofertaId) {
            oferta = await obtenerOfertaConDetallesPorId(ofertaId);
        } else if (nombre_de_la_oferta) {
            const resultadoBusqueda = await buscarOfertaPorNombre(nombre_de_la_oferta, contexto?.negocioId);
            if (resultadoBusqueda === "multiple") {
                const responseDataMultiple: FunctionResponseMediaData = {
                    content: `Encontré varias ofertas que coinciden con "${nombre_de_la_oferta}". Por favor, sé más específico o proporciona un ID.`,
                    media: null, uiComponentPayload: null,
                };
                return { actionName, params, success: true, message: "Múltiples ofertas encontradas.", data: responseDataMultiple };
            }
            oferta = resultadoBusqueda;
        }

        if (!oferta) {
            const msgError = ofertaId ? `Oferta ID ${ofertaId} no encontrada.` : `No encontré oferta llamada "${nombre_de_la_oferta}".`;
            return { actionName, params, success: false, message: msgError, error: "Oferta no encontrada" };
        }

        const nombreOferta = oferta.nombre;
        const descripcionGeneral = oferta.descripcion || null;
        const precioPrincipal = oferta.valor ?? 0;
        const monedaCodigo = oferta.negocio?.configuracionPago?.monedaPrincipal || contexto?.monedaNegocio || "MXN";
        const locale = contexto?.idiomaLocale || "es-MX";
        const formattedPrice = new Intl.NumberFormat(locale, { style: "currency", currency: monedaCodigo }).format(precioPrincipal);

        let responseData: FunctionResponseMediaData;

        if (canalDetectado.toLocaleLowerCase() === "whatsapp") {
            console.log(`[${actionName}] V4 DEBUG - ENTRANDO A RAMA WHATSAPP.`); // LOG CLAVE
            let textoWhatsApp = `*${nombreOferta}*\n\n`;
            if (descripcionGeneral) textoWhatsApp += `${descripcionGeneral}\n\n`;
            textoWhatsApp += `*Precio: ${formattedPrice}*\n`;
            if (oferta.condiciones) textoWhatsApp += `_Condiciones: ${oferta.condiciones}_\n`;

            const mediaItems: MediaItem[] = [];
            oferta.OfertaGaleria?.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)).forEach((img) => { // Ordenar por 'orden'
                if (img.imageUrl) {
                    mediaItems.push({ tipo: "image", url: img.imageUrl, caption: img.altText || img.descripcion || undefined });
                }
            });

            let textoAdicionalVideosPlataforma = "";
            oferta.videos?.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)).forEach((video) => {
                if (video.videoUrl && video.tipoVideo) { // Asegurar que tipoVideo exista
                    if (video.tipoVideo === 'SUBIDO' || video.tipoVideo === 'OTRO_URL') {
                        mediaItems.push({ tipo: "video", url: video.videoUrl, caption: video.titulo || video.descripcion || undefined });
                    } else if (video.tipoVideo === 'YOUTUBE' || video.tipoVideo === 'VIMEO') {
                        textoAdicionalVideosPlataforma += `\n\n${video.titulo || 'Video'}: ${video.videoUrl}`;
                    }
                }
            });
            if (textoAdicionalVideosPlataforma) textoWhatsApp += textoAdicionalVideosPlataforma;

            if (oferta.detallesAdicionales && oferta.detallesAdicionales.length > 0) {
                textoWhatsApp += "\n\n*Más Detalles:*";
                oferta.detallesAdicionales.slice(0, 3).forEach(d => { // Limitar para WhatsApp
                    textoWhatsApp += `\n• *${d.tituloDetalle}*: ${d.contenido}`;
                });
            }

            responseData = {
                content: textoWhatsApp.trim(),
                media: mediaItems.length > 0 ? mediaItems : null,
                uiComponentPayload: null, // Explícitamente null para WhatsApp
            };
            console.log(`[${actionName}] V4 DEBUG - ResponseData para WhatsApp:`, JSON.stringify(responseData).substring(0, 300) + "...");


        } else { // WebChat - Generar uiComponentPayload
            console.log(`[${actionName}] V4 DEBUG - ENTRANDO A RAMA WEBCHAT/DEFAULT.`); // LOG CLAVE

            // Determinar imagen principal (por orden o la primera)
            const sortedGaleria = oferta.OfertaGaleria?.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)) || [];
            const imagenPrincipalObj = sortedGaleria[0];

            const galeriaSinPrincipal = imagenPrincipalObj ? sortedGaleria.slice(1) : sortedGaleria;

            const offerPayloadDataForUI: OfferDisplayPayloadData = {
                id: oferta.id,
                nombre: nombreOferta,
                descripcionGeneral: descripcionGeneral,
                precioFormateado: formattedPrice,
                moneda: monedaCodigo,
                condiciones: oferta.condiciones || null,
                linkPago: oferta.linkPago || null,
                imagenPrincipal: imagenPrincipalObj ? {
                    url: imagenPrincipalObj.imageUrl,
                    altText: imagenPrincipalObj.altText,
                    caption: imagenPrincipalObj.descripcion,
                } : null,
                galeriaImagenes: galeriaSinPrincipal.map(img => ({
                    url: img.imageUrl, altText: img.altText, caption: img.descripcion,
                })),
                videos: oferta.videos?.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99)).map(v => ({
                    // Asegúrate que v.tipoVideo sea compatible con SharedTipoVideoType
                    tipoVideo: v.tipoVideo as ('YOUTUBE' | 'VIMEO' | 'SUBIDO' | 'OTRO_URL') || 'OTRO_URL',
                    videoUrl: v.videoUrl,
                    titulo: v.titulo,
                    // descripcion: v.descripcion, // Puedes añadirlo si tu UiPayloadVideo lo tiene
                })) || [],
                detallesAdicionales: oferta.detallesAdicionales?.map(d => ({
                    tituloDetalle: d.tituloDetalle, contenido: d.contenido, tipoDetalle: d.tipoDetalle,
                })) || [],
            };

            const uiPayload: UiComponentPayloadContent = {
                componentType: 'OfferDisplay', // Este identificador lo usará el frontend
                data: offerPayloadDataForUI,
            };

            responseData = {
                content: `Viendo detalles de: ${nombreOferta}.`, // Texto de fallback o introductorio
                media: null, // Para WebChat con uiComponentPayload, media es null
                uiComponentPayload: uiPayload,
            };
            console.log(`[${actionName}] V4 DEBUG - ResponseData para WebChat:`, JSON.stringify(responseData).substring(0, 300) + "...");

        }

        return {
            actionName, params, success: true,
            message: "Detalle de oferta obtenido exitosamente.",
            data: responseData,
        };

    } catch (error) {
        console.error(`[${actionName}] Error general:`, error);
        const errorReal = error as Error;
        if (error instanceof ZodError) {
            return {
                actionName, params, success: false,
                message: "Error de validación en parámetros de entrada.",
                validationErrors: error.flatten().fieldErrors as Record<string, string[] | undefined>,
                error: "Parámetros de entrada inválidos.",
            };
        }
        return { actionName, params, success: false, message: `Error interno: ${errorReal.message}`, error: errorReal.message };
    }
}