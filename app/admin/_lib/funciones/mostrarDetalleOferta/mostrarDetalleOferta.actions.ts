// app/admin/_lib/actions/funciones/mostrarDetalleOferta/mostrarDetalleOferta.actions.ts
"use server";

import { z, ZodError } from "zod";
import {
    EjecutarMostrarDetalleOfertaParamsSchema,
    //   type EjecutarMostrarDetalleOfertaParams,
} from "./mostrarDetalleOferta.schemas";
import {
    obtenerOfertaConDetallesPorId,
    buscarOfertaPorNombre,
    type OfertaCompleta,
} from "./mostrarDetalleOferta.helpers";

// Importar Schemas/Tipos globales desde el archivo de conversación
import {
    type MediaItem,
    //   MediaItemSchema, // Lo importamos por si necesitamos validar algo internamente, aunque la estructura la creamos nosotros
    type FunctionResponseMediaData, // Este es el tipo para la estructura { content, media }
    FunctionResponseMediaDataSchema // El schema Zod para esa estructura
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

// Importar el tipo para el contexto simple
import { type SimpleFuncionContext } from "@/app/admin/_lib/types"; // Ajusta la ruta a tu archivo de tipos compartidos

// Tipo para el resultado de esta acción
type MostrarDetalleOfertaActionResult = {
    actionName: string;
    params: unknown;
    success: boolean;
    message: string;
    data?: FunctionResponseMediaData; // Usamos el tipo global importado
    error?: string;
    validationErrors?: z.ZodIssue[];
};

export async function ejecutarMostrarDetalleOfertaAction(
    params: unknown, // Parámetros de la IA
    contexto?: SimpleFuncionContext // Contexto del dispatcher
): Promise<MostrarDetalleOfertaActionResult> {

    const actionName = "ejecutarMostrarDetalleOfertaAction";
    console.log(`[${actionName}] Iniciando. Params:`, JSON.stringify(params));
    console.log(`[${actionName}] Contexto:`, JSON.stringify(contexto));

    try {
        const validatedParams = EjecutarMostrarDetalleOfertaParamsSchema.parse(params);
        const { ofertaId, nombre_de_la_oferta } = validatedParams; // Ahora tenemos ambos
        let oferta: OfertaCompleta | null = null;

        if (ofertaId) {
            console.log(`[${actionName}] Obteniendo oferta por ID: ${ofertaId}`);
            oferta = await obtenerOfertaConDetallesPorId(ofertaId);

            console.log(oferta)
        } else if (nombre_de_la_oferta) {
            console.log(`[${actionName}] Buscando oferta por nombre: "${nombre_de_la_oferta}" con contexto de negocioId: ${contexto?.negocioId}`);
            const resultadoBusqueda = await buscarOfertaPorNombre(nombre_de_la_oferta, contexto?.negocioId);
            if (resultadoBusqueda === "multiple") {
                return {
                    actionName, params, success: true, // Es un éxito encontrar múltiples, pero la respuesta es diferente
                    message: "Múltiples ofertas encontradas.",
                    data: {
                        content: `Encontré varias ofertas que coinciden con "${nombre_de_la_oferta}". ¿Podrías ser más específico o darme el ID de la oferta que te interesa?`,
                        media: null,
                    },
                };
            }
            oferta = resultadoBusqueda; // Será la oferta o null
        }

        if (!oferta) {
            const msgNoEncontrada = ofertaId
                ? `Oferta con ID ${ofertaId} no encontrada.`
                : `No pude encontrar una oferta llamada "${nombre_de_la_oferta}".`;
            return {
                actionName, params, success: false, // CAMBIADO a success
                message: msgNoEncontrada,
                error: "Oferta no encontrada",
            };
        }

        // Ejemplo del final de la lógica de formateo:
        const nombreOferta = oferta.nombre; // Esto ya lo tienes
        let responseContent = "";
        const descripcionOferta = oferta.descripcion || "No hay descripción disponible."; // Manejo de descripción nula
        let responseMedia: MediaItem[] | null = null;
        const canalDetectado = contexto?.canalNombre || "webchat";

        // Precio y Moneda
        const precioPrincipal = oferta.valor ?? 0;
        const monedaCodigo = oferta.negocio?.configuracionPago?.monedaPrincipal || "MXN"; // Prioridad: config negocio, default
        const locale = contexto?.idiomaLocale || "es-MX";
        const formattedPrice = new Intl.NumberFormat(locale, {
            style: "currency", currency: monedaCodigo,
        }).format(precioPrincipal);

        // Beneficios y Detalles (adaptado a OfertaDetalle)
        // Asumimos que los beneficios y otros detalles están en `oferta.detallesAdicionales`
        // Podrías filtrar por `tipoDetalle` si lo usas para distinguir "Beneficio" de "FAQ", etc.
        const beneficiosTextArray: string[] = [];
        const detallesTextArray: string[] = [];

        oferta.detallesAdicionales?.forEach(detalle => {
            // Ejemplo: Si usas tipoDetalle para identificar beneficios
            if (detalle.tipoDetalle?.toUpperCase() === "BENEFICIO") {
                beneficiosTextArray.push(`${detalle.tituloDetalle}: ${detalle.contenido}`);
            } else {
                // Para otros detalles, podrías usar tituloDetalle y contenido
                detallesTextArray.push(`*${detalle.tituloDetalle}*\n${detalle.contenido}`);
            }
        });

        //! Whatsapp
        if (canalDetectado.toLocaleLowerCase() === "whatsapp") {
            console.log(`[${actionName}] Generando respuesta para WhatsApp.`);
            let textoWhatsApp = `*${nombreOferta}*\n\n`;
            textoWhatsApp += `${descripcionOferta}\n\n`;
            textoWhatsApp += `*Precio: ${formattedPrice}*\n`;

            if (beneficiosTextArray.length > 0) {
                textoWhatsApp += "\n*Beneficios destacados:*\n";
                beneficiosTextArray.forEach((b) => { textoWhatsApp += `• ${b}\n`; });
            }
            if (detallesTextArray.length > 0 && canalDetectado === "whatsapp") { // Solo si no son beneficios
                textoWhatsApp += "\n*Más información:*\n";
                // Mostrar solo algunos detalles para no saturar WhatsApp, o los más importantes
                detallesTextArray.slice(0, 3).forEach((d) => { textoWhatsApp += `${d}\n\n`; });
            }

            responseContent = textoWhatsApp.trim();
            responseMedia = []; // Inicializar como array vacío

            oferta.OfertaGaleria?.forEach((img) => {
                if (img.imageUrl) {
                    responseMedia?.push({
                        tipo: "image",
                        url: img.imageUrl,
                        // caption: img.altText || img.descripcion || nombreOferta,
                    });
                }
            });

            // // Procesar Videos DIFERENCIANDO el tipo
            // let textoAdicionalVideosPlataforma = ""; // Para acumular links de YouTube/Vimeo
            // if (oferta.videos && Array.isArray(oferta.videos)) {
            //     oferta.videos.forEach((video) => {
            //         if (video.videoUrl) {
            //             // Asumiendo que video.tipoVideo es del tipo SharedTipoVideoType ('SUBIDO', 'YOUTUBE', 'VIMEO', 'OTRO_URL')
            //             if (video.tipoVideo === 'SUBIDO' || video.tipoVideo === 'OTRO_URL') {
            //                 // Estos son archivos directos, intentar enviarlos como MediaItem de tipo "video"
            //                 // (Aquí sigue aplicando la advertencia del códec HEVC vs H.264 para los SUBIDO/OTRO_URL)
            //                 responseMedia?.push({
            //                     tipo: "video",
            //                     url: video.videoUrl,
            //                     caption: video.titulo || video.descripcion || nombreOferta,
            //                     // filename: video.titulo || "video_oferta.mp4" // Opcional, si tu MediaItemSchema lo tiene
            //                 });
            //             } else if (video.tipoVideo === 'YOUTUBE' || video.tipoVideo === 'VIMEO') {
            //                 // Estos son enlaces de plataforma, añadir al texto para que WhatsApp genere vista previa
            //                 const tituloVideo = video.titulo ? `${video.titulo}: ` : "Video: ";
            //                 textoAdicionalVideosPlataforma += `\n\n${tituloVideo}${video.videoUrl}`;
            //             }
            //         }
            //     });
            // }
            // // Añadir los links de videos de plataforma al mensaje de texto principal de WhatsApp
            // if (textoAdicionalVideosPlataforma) {
            //     textoWhatsApp += textoAdicionalVideosPlataforma;
            // }

        } else {
            //! WebChat / Default
            console.log(`[${actionName}] Generando respuesta HTML para WebChat.`);
            let htmlContent = `<h3>${nombreOferta}</h3>`;

            const imagenPrincipal = oferta.OfertaGaleria?.[0]; // Tomar la primera como principal por ahora
            if (imagenPrincipal?.imageUrl) {
                htmlContent += `<p><img src="${imagenPrincipal.imageUrl}" alt="${imagenPrincipal.altText || nombreOferta}" style="max-width: 100%; width: 350px; height: auto; border-radius: 8px; cursor: pointer;" class="chat-image-lightbox-trigger"></p>`;
            }

            htmlContent += `<p>${descripcionOferta.replace(/\n/g, "<br>")}</p>`;
            htmlContent += `<p><strong>Precio: ${formattedPrice}</strong></p>`;

            if (beneficiosTextArray.length > 0) {
                htmlContent += "<h4>Beneficios destacados:</h4><ul>";
                beneficiosTextArray.forEach((b) => { htmlContent += `<li>${b.replace(/\n/g, "<br>")}</li>`; });
                htmlContent += "</ul>";
            }

            if (detallesTextArray.length > 0) {
                htmlContent += "<h4>Más información:</h4>";
                detallesTextArray.forEach((d) => {
                    // Asumiendo que 'd' puede tener un título en markdown como *Título* y luego contenido
                    const parts = d.split('\n');
                    const tituloDetalleHtml = parts[0].replace(/\*/g, ''); // Quitar asteriscos para el título
                    const contenidoDetalleHtml = parts.slice(1).join('<br>');
                    htmlContent += `<h5>${tituloDetalleHtml}</h5><p>${contenidoDetalleHtml}</p>`;
                });
            }

            // if (oferta.OfertaGaleria && oferta.OfertaGaleria.length > (imagenPrincipal ? 1 : 0)) {
            //     htmlContent += "<h4>Galería de imágenes:</h4><div style='display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;'>";
            //     oferta.OfertaGaleria.forEach((img) => {
            //         if (img.imageUrl && img.id !== imagenPrincipal?.id) { // Evitar duplicar la principal
            //             htmlContent += `<img src="${img.imageUrl}" alt="${img.altText || nombreOferta}" style="max-width: 120px; height: auto; border-radius: 4px; cursor: pointer;" class="chat-image-lightbox-trigger">`;
            //         }
            //     });
            //     htmlContent += "</div>";
            // }

            const imagenesGaleria = oferta.OfertaGaleria?.filter(img => img.imageUrl && img.id !== imagenPrincipal?.id) || [];
            if (imagenesGaleria.length > 0) {
                htmlContent += "<h4 class='text-sm font-semibold text-zinc-200 mt-4 mb-2'>Galería de imágenes:</h4>";
                // Contenedor de la galería. 'not-prose' puede ayudar a evitar estilos no deseados de Tailwind Typography si lo usas.
                htmlContent += "<div class='not-prose grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-2 rounded-md bg-zinc-800 border border-zinc-700'>";
                // Usamos grid para un layout ordenado. Ajusta grid-cols-* según cuántas miniaturas quieres por fila.

                imagenesGaleria.forEach((img) => {
                    // Cada imagen es un ancla para el lightbox y tiene un aspect ratio definido
                    htmlContent += `
            <a 
                href="${img.imageUrl}" 
                class="chat-image-lightbox-trigger block aspect-square rounded overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all group"
                data-alt="${img.altText || img.descripcion || nombreOferta + ' - imagen adicional'}"
                title="${img.altText || img.descripcion || 'Ver imagen ampliada'}"
            >
                <img 
                    src="${img.imageUrl}" 
                    alt="${img.altText || img.descripcion || 'Miniatura de ' + nombreOferta}" 
                    style="display: block; width: 100%; height: 100%; object-fit: cover; object-position: center;"
                    class="group-hover:opacity-80 transition-opacity" 
                />
            </a>`;
                });
                htmlContent += "</div>";
            }

            if (oferta.videos && Array.isArray(oferta.videos)) {
                htmlContent += "<h4>Videos:</h4>";
                oferta.videos.forEach(video => {
                    if (video.videoUrl) {
                        const tituloVideoHtml = video.titulo ? `<h5>${video.titulo}</h5>` : '';
                        if (video.tipoVideo === 'SUBIDO' || video.tipoVideo === 'OTRO_URL') {
                            htmlContent += `${tituloVideoHtml}<video controls width="100%" style="max-width: 400px; border-radius: 8px; margin-bottom:10px;" src="${video.videoUrl}"><p>Tu navegador no soporta el tag de video.</p></video>`;
                        } else if (video.tipoVideo === 'YOUTUBE') {
                            // Asumiendo que video.videoUrl es la URL completa de watch.
                            // Necesitamos extraer el ID del video para el embed.
                            let videoId = '';
                            try {
                                const url = new URL(video.videoUrl);
                                if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
                                    videoId = url.searchParams.get('v') || url.pathname.split('/').pop() || '';
                                } else if (url.hostname === 'youtu.be') {
                                    videoId = url.pathname.substring(1);
                                }
                            } catch (e) { console.error("Error parseando URL de YouTube:", video.videoUrl, e); }

                            if (videoId) {
                                htmlContent += `${tituloVideoHtml}<div class="aspect-video" style="max-width: 560px; margin-bottom:10px;"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" title="${video.titulo || 'YouTube video player'}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
                            } else {
                                htmlContent += `${tituloVideoHtml}<p><a href="${video.videoUrl}" target="_blank" rel="noopener noreferrer">Ver video en YouTube</a></p>`;
                            }
                        } else if (video.tipoVideo === 'VIMEO') {
                            let videoId = '';
                            try {
                                const url = new URL(video.videoUrl);
                                videoId = url.pathname.split('/').pop()?.split('?')[0] || '';
                            } catch (e) { console.error("Error parseando URL de Vimeo:", video.videoUrl, e); }

                            if (videoId) {
                                htmlContent += `${tituloVideoHtml}<div style="padding:56.25% 0 0 0;position:relative;max-width: 560px; margin-bottom:10px;"><iframe src="https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${video.titulo || 'Vimeo video player'}"></iframe></div>`;
                            } else {
                                htmlContent += `${tituloVideoHtml}<p><a href="${video.videoUrl}" target="_blank" rel="noopener noreferrer">Ver video en Vimeo</a></p>`;
                            }
                        }
                    }
                });
            }

            responseContent = htmlContent.trim();
            responseMedia = null;
        }

        const responseData: FunctionResponseMediaData = {
            content: responseContent,
            media: responseMedia && responseMedia.length > 0 ? responseMedia : null,
        };

        // Validar la estructura de salida (opcional pero recomendado)
        const parsedData = FunctionResponseMediaDataSchema.safeParse(responseData);
        if (!parsedData.success) {
            console.error(`[${actionName}] Error al validar responseData:`, parsedData.error.flatten());
            // Decide cómo manejar esto: ¿lanzar error, o continuar con data no validada?
            // Por ahora, solo logueamos y continuamos.
        }


        console.log(`[${actionName}] Respuesta generada. Content (primeros 100 chars): ${(responseData.content ?? '').substring(0, 100)}... Media count: ${responseData.media?.length ?? 0}`);

        return {
            actionName,
            params,
            success: true, // USAR 'success'
            message: "Detalle de oferta obtenido exitosamente.",
            data: responseData, // responseData es { content, media }
        };

    } catch (error) {
        console.error(`[${actionName}] Error general:`, error);
        // const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
        if (error instanceof ZodError) {
            return {
                actionName,
                params,
                success: false, // USAR 'success'
                message: "Error...",
                error: "Mensaje de error",
            };
        }
        return {
            actionName,
            params,
            success: false, // USAR 'success'
            message: "Error...",
            error: "Mensaje de error",
        };
    }
}