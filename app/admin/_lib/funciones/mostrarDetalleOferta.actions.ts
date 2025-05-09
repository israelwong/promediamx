// Ruta: app/admin/_lib/funciones/mostrarDetalleOferta.actions.ts
'use server';

import prisma from '../prismaClient';
import { ActionResult } from '../types';
import { MostrarDetalleOfertaArgs, MostrarDetalleOfertaData, OfertaDetallada } from './mostrarDetalleOferta.type';

async function actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId: string, mensajeError: string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ error: `Error en mostrarDetalleOferta: ${mensajeError}` })
            }
        });
    } catch (updateError) {
        console.error(`[mostrarDetalleOferta] Error al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}

function formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function ejecutarMostrarDetalleOfertaAction(
    argumentos: MostrarDetalleOfertaArgs,
    tareaEjecutadaId: string
): Promise<ActionResult<MostrarDetalleOfertaData>> {
    console.log(`[Ejecución Función] Iniciando ejecutarMostrarDetalleOfertaAction para TareaEjecutada ${tareaEjecutadaId}`);
    console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

    if (!argumentos.negocioId) {
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta el ID del negocio.");
        return { success: false, error: "Falta el ID del negocio." };
    }
    if (!argumentos.nombre_de_la_oferta || argumentos.nombre_de_la_oferta.trim() === "") {
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta el identificador de la oferta.");
        // Este mensaje es para el usuario si la IA no pudo extraer el identificador
        return {
            success: true, // Éxito en la ejecución de la acción, pero la IA necesita más info
            data: {
                mensajeRespuesta: "No entendí a qué oferta te refieres. ¿Podrías decirme el nombre de la promoción que te interesa?"
            }
        };
    }

    try {
        const ahora = new Date();
        // Intentar buscar por ID si el identificador parece un CUID, o por nombre/descripción
        // Esta lógica de búsqueda puede necesitar ajustes para ser más robusta.
        const ofertaDb = await prisma.oferta.findFirst({
            where: {
                negocioId: argumentos.negocioId,
                status: 'activo',
                fechaInicio: { lte: ahora },
                fechaFin: { gte: ahora },
                OR: [
                    { id: { equals: argumentos.nombre_de_la_oferta } }, // Si el identificador es un ID exacto
                    { nombre: { contains: argumentos.nombre_de_la_oferta, mode: 'insensitive' } },
                    // Podrías añadir búsqueda en descripción si es relevante
                    // { descripcion: { contains: argumentos.identificadorOferta, mode: 'insensitive' } }
                ],
            },
            include: {
                OfertaGaleria: { // Incluir imágenes de la galería
                    select: {
                        imageUrl: true,
                        altText: true,
                        descripcion: true,
                    },
                    orderBy: { orden: 'asc' }
                }
            }
        });

        let mensajeRespuesta = "";
        let ofertaDetallada: OfertaDetallada | null = null;

        if (!ofertaDb) {
            mensajeRespuesta = `Lo siento, no pude encontrar una oferta activa que coincida con "${argumentos.nombre_de_la_oferta}". ¿Quizás quisiste decir otra o te gustaría ver la lista de ofertas disponibles?`;
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Oferta no encontrada para identificador: ${argumentos.nombre_de_la_oferta}`);
        } else {
            ofertaDetallada = {
                id: ofertaDb.id,
                nombre: ofertaDb.nombre,
                descripcion: ofertaDb.descripcion,
                tipoOferta: ofertaDb.tipoOferta,
                valor: ofertaDb.valor,
                codigo: ofertaDb.codigo,
                fechaInicio: ofertaDb.fechaInicio,
                fechaFin: ofertaDb.fechaFin,
                condiciones: ofertaDb.condiciones,
                imagenes: ofertaDb.OfertaGaleria.map(img => ({
                    imageUrl: img.imageUrl,
                    altText: img.altText,
                    descripcion: img.descripcion
                }))
            };

            //Construir mensaje según Tarea.instruccionParaIA
            mensajeRespuesta = `¡Claro! Aquí tienes los detalles de la oferta "${ofertaDetallada.nombre}" (ID: ${ofertaDetallada.id}):\n`;
            if (ofertaDetallada.descripcion) {
                mensajeRespuesta += `${ofertaDetallada.descripcion}\n`;
            }
            mensajeRespuesta += `Válida desde el ${formatearFecha(ofertaDetallada.fechaInicio)} hasta el ${formatearFecha(ofertaDetallada.fechaFin)}.\n`;
            if (ofertaDetallada.condiciones) {
                mensajeRespuesta += `Condiciones: ${ofertaDetallada.condiciones}\n`;
            }
            if (ofertaDetallada.codigo) {
                mensajeRespuesta += `Puedes usar el código: ${ofertaDetallada.codigo}\n`;
            }

            // Imágenes
            if (ofertaDetallada.imagenes.length > 0) {
                if (argumentos.canalNombre?.toLowerCase() === 'web chat') {
                    mensajeRespuesta += `<br><br>Imágenes:<br>`;

                    // ofertaDetallada.imagenes.forEach(img => {
                    //     mensajeRespuesta += `<img src="${img.imageUrl}" alt="${img.altText || ofertaDetallada!.nombre}" style="max-width:200px; margin:5px; height:auto;"><br>`;
                    // });

                    ofertaDetallada.imagenes.forEach(img => {
                        const altText = img.altText || ofertaDetallada!.nombre; // Usar un fallback para altText
                        mensajeRespuesta +=
                            `<a href="${img.imageUrl}" class="chat-image-lightbox-trigger" data-alt="${altText}" target="_blank" rel="noopener noreferrer">
                                <img src="${img.imageUrl}" alt="${altText}" style="max-width:200px; margin:5px; height:auto; cursor:pointer; border-radius: 4px;">
                            </a>
                            <br>`; // Añadí cursor:pointer y un pequeño borde redondeado para la imagen
                        if (img.descripcion) {
                            mensajeRespuesta += `${img.descripcion}<br>`; // Mantener la descripción si existe
                        }
                    });

                } else if (argumentos.canalNombre?.toLowerCase() === 'whatsapp') {
                    // Para WhatsApp, usualmente enviarías las imágenes como mensajes separados o usarías plantillas.
                    // Por ahora, solo listamos las URLs o indicamos su existencia.
                    mensajeRespuesta += `\nImágenes disponibles:\n`;
                    ofertaDetallada.imagenes.forEach(img => {
                        mensajeRespuesta += `- ${img.imageUrl}\n`;
                    });
                    mensajeRespuesta += "(En WhatsApp, las imágenes se enviarían por separado o mediante una plantilla específica).\n";
                } else { // Canal desconocido o no especificado, solo texto
                    mensajeRespuesta += `\nEsta oferta tiene ${ofertaDetallada.imagenes.length} imagen(es).\n`;
                }
            }

            // Videos (lógica similar)
            // if (ofertaDetallada.videos && ofertaDetallada.videos.length > 0) {
            //      if (argumentos.canalNombre?.toLowerCase() === 'web chat') {
            //         mensajeRespuesta += `<br><br>Videos:<br>`;
            //         ofertaDetallada.videos.forEach(vid => {
            //             if (vid.tipo === 'youtube' && vid.videoUrl.includes("v=")) {
            //                 const videoId = new URL(vid.videoUrl).searchParams.get("v");
            //                 mensajeRespuesta += `<iframe width="300" height="180" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe><br>`;
            //             } else if (vid.tipo === 'mp4') { // Asumiendo mp4
            //                  mensajeRespuesta += `<video width="300" height="180" controls><source src="${vid.videoUrl}" type="video/mp4">Tu navegador no soporta videos HTML5.</video><br>`;
            //             } else {
            //                  mensajeRespuesta += `<a href="${vid.videoUrl}" target="_blank">Ver video: ${vid.altText || vid.videoUrl}</a><br>`;
            //             }
            //         });
            //     } else { // WhatsApp u otros
            //         mensajeRespuesta += `\nVideos disponibles:\n`;
            //         ofertaDetallada.videos.forEach(vid => {
            //             mensajeRespuesta += `- ${vid.videoUrl}\n`;
            //         });
            //     }
            // }

            mensajeRespuesta += "\n¿Esta información te es útil? ¿Te gustaría aprovechar esta oferta o tienes más preguntas?";
        }

        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ resultado: ofertaDetallada ? { ofertaId: ofertaDetallada.id } : { error: "Oferta no encontrada" } })
            }
        }).catch(updateError => console.error("[mostrarDetalleOferta] Error al actualizar TareaEjecutada:", updateError));

        return {
            success: true,
            data: {
                oferta: ofertaDetallada,
                mensajeRespuesta: mensajeRespuesta
            }
        };

    } catch (error) {
        console.error("[Ejecución Función] Error al obtener detalle de la oferta:", error);
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, error instanceof Error ? error.message : "Error desconocido al obtener detalle.");
        return { success: false, error: error instanceof Error ? error.message : "Error interno al obtener los detalles de la oferta." };
    }
}