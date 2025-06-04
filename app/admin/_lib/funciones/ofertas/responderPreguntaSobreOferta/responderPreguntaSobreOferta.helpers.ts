// Ruta: app/admin/_lib/funciones/ofertas/responderPreguntaSobreOferta/responderPreguntaSobreOferta.helpers.ts
import prisma from '@/app/admin/_lib/prismaClient';
import { Prisma } from '@prisma/client';

// Tipo para OfertaDetalle con toda su multimedia (CORREGIDO)
export type OfertaDetalleConMultimedia = Prisma.OfertaDetalleGetPayload<{
    include: {
        // Usar los nombres de los campos de relación definidos en el modelo OfertaDetalle
        galeriaDetalle: { // Antes: OfertaDetalleGaleria
            select: {
                id: true,
                imageUrl: true,
                altText: true,
                descripcion: true,
                orden: true,
                tamañoBytes: true, // Asegúrate que este campo exista en OfertaDetalleGaleria
            },
            orderBy: { orden: 'asc' }
        };
        videoDetalle: { // Antes: OfertaDetalleVideo (asumiendo que es una relación a un solo video)
            select: {
                id: true,
                videoUrl: true,
                tipoVideo: true,
                titulo: true,
                descripcion: true,
                orden: true,
                tamañoBytes: true, // Asegúrate que este campo exista en OfertaDetalleVideo
            }
            // Si videoDetalle fuera una lista (uno-a-muchos), sería:
            // videoDetalle: { select: { ... }, orderBy: { orden: 'asc' } }
        };
        documentosDetalle: { // Antes: OfertaDetalleDocumento
            select: {
                id: true,
                documentoUrl: true,
                documentoNombre: true,
                documentoTipo: true,
                documentoTamanoBytes: true,
                descripcion: true,
                orden: true,
            },
            orderBy: { orden: 'asc' }
        };
    }
}>;

// Función para buscar una respuesta en los detalles de una oferta
export async function buscarRespuestaEnOfertaDetalles(
    oferta_id: string,
    preguntaUsuario: string,
    negocioId: string // Para asegurar que la oferta pertenece al negocio en contexto
): Promise<OfertaDetalleConMultimedia | null> {
    if (!oferta_id || !preguntaUsuario || !negocioId) {
        console.warn("[Helper RESPONDER_PREGUNTA_OFERTA] Faltan parámetros: oferta_id, preguntaUsuario o negocioId.");
        return null;
    }

    try {
        const ofertaBase = await prisma.oferta.findUnique({
            where: { id: oferta_id, negocioId: negocioId },
            select: { id: true }
        });

        if (!ofertaBase) {
            console.warn(`[Helper RESPONDER_PREGUNTA_OFERTA] Oferta ${oferta_id} no encontrada para negocio ${negocioId}.`);
            return null;
        }

        const detallesDeOferta = await prisma.ofertaDetalle.findMany({
            where: {
                ofertaId: oferta_id,
                estadoContenido: 'PUBLICADO',
            },
            include: { // CORREGIDO aquí también
                galeriaDetalle: { // Antes: OfertaDetalleGaleria
                    select: { id: true, imageUrl: true, altText: true, descripcion: true, orden: true, tamañoBytes: true },
                    orderBy: { orden: 'asc' }
                },
                videoDetalle: { // Antes: OfertaDetalleVideo
                    select: { id: true, videoUrl: true, tipoVideo: true, titulo: true, descripcion: true, orden: true, tamañoBytes: true },
                },
                documentosDetalle: { // Antes: OfertaDetalleDocumento
                    select: { id: true, documentoUrl: true, documentoNombre: true, documentoTipo: true, documentoTamanoBytes: true, descripcion: true, orden: true },
                    orderBy: { orden: 'asc' }
                },
            },
            orderBy: {
                orden: 'asc',
            }
        });

        if (!detallesDeOferta || detallesDeOferta.length === 0) {
            return null;
        }

        const preguntaNormalizada = preguntaUsuario.toLowerCase().trim();
        let mejorCoincidencia: OfertaDetalleConMultimedia | null = null;

        for (const detalle of detallesDeOferta) {
            const tituloNormalizado = detalle.tituloDetalle.toLowerCase();
            const palabrasClaveNormalizadas = detalle.palabrasClave?.map(p => p.toLowerCase()) || [];

            // Coincidencia en título
            if (tituloNormalizado.includes(preguntaNormalizada)) {
                mejorCoincidencia = detalle as OfertaDetalleConMultimedia; // Cast necesario si el tipo de 'detalle' no es inferido con includes completos
                break;
            }
            // Coincidencia en palabras clave
            if (palabrasClaveNormalizadas.some(keyword => preguntaNormalizada.includes(keyword))) {
                if (!mejorCoincidencia) { // Solo si no encontramos una coincidencia de título más fuerte
                    mejorCoincidencia = detalle as OfertaDetalleConMultimedia;
                }
            }
        }

        // Lógica de búsqueda más avanzada (ej. en contenido) podría ir aquí si no hay coincidencia.
        // Por ahora, si no hay coincidencia en título o palabras clave, no se devuelve nada.

        if (mejorCoincidencia) {
            // console.log(`[Helper RESPONDER_PREGUNTA_OFERTA] Coincidencia encontrada: Detalle ID ${mejorCoincidencia.id}`);
            return mejorCoincidencia;
        }

        return null;

    } catch (error) {
        console.error(`[Helper RESPONDER_PREGUNTA_OFERTA] Error buscando respuesta para oferta ${oferta_id}:`, error);
        return null;
    }
}