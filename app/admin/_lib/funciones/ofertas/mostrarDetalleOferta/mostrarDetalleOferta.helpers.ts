// Ruta: app/admin/_lib/funciones/ofertas/mostrarDetalleOferta/mostrarDetalleOferta.helpers.ts
import prisma from "@/app/admin/_lib/prismaClient";
import { Prisma } from "@prisma/client"; // Importar ObjetivoOferta si es un enum

// Tipo para la oferta con todas sus relaciones necesarias
// Basado en el schema.prisma actual y lo que necesitamos para el display.
export type OfertaCompleta = Prisma.OfertaGetPayload<{
    select: {
        id: true;
        nombre: true;
        descripcion: true;
        precio: true;
        objetivos: true; // Array de Enum ObjetivoOferta
        fechaInicio: true; // Para validar vigencia, aunque la query principal ya lo hace
        fechaFin: true;    // Para validar vigencia
        status: true;      // La query principal ya filtra por activo

        tipoPago: true;
        intervaloRecurrencia: true;
        tipoAnticipo: true;
        porcentajeAnticipo: true;
        anticipo: true;

        negocio: {
            select: {
                configuracionPago: {
                    select: {
                        monedaPrincipal: true;
                    }
                }
            }
        };
        OfertaGaleria: {
            select: {
                imageUrl: true;
                altText: true;
                descripcion: true; // Usado como caption
                orden: true;
            };
            orderBy: {
                orden: "asc";
            };
        };
        videos: { // Relación a OfertaVideos
            select: {
                videoUrl: true;
                tipoVideo: true; // Ej: 'YOUTUBE', 'VIMEO', 'SUBIDO', 'OTRO_URL'
                titulo: true;
                orden: true;
            };
            orderBy: {
                orden: "asc";
            };
        };
        detallesAdicionales: { // Relación a OfertaDetalle[]
            select: {
                tituloDetalle: true;
                contenido: true;
                tipoDetalle: true; // Ej: "CONDICION", "BENEFICIO", "FAQ" (si tienes este campo)
                // Si OfertaDetalle tuviera su propia galería/videos, se incluirían aquí.
            };
            orderBy: {
                orden: "asc"; // Asumiendo que OfertaDetalle tiene un campo 'orden'
            };
        };
        // documentosOferta: true, // Si necesitas mostrar documentos asociados a la oferta
    };
}>;

export async function obtenerOfertaConDetallesPorId(
    ofertaId: string,
    negocioId?: string // Opcional, para mayor seguridad
): Promise<OfertaCompleta | null> {
    if (!ofertaId) {
        console.warn("[Helper MOSTRAR_DETALLE_OFERTA] obtenerOfertaConDetallesPorId: ofertaId no proporcionado.");
        return null;
    }
    try {
        const whereClause: Prisma.OfertaWhereUniqueInput = { id: ofertaId };
        if (negocioId) {
            // Prisma no tipa bien where con relaciones anidadas opcionales a veces
            whereClause.negocioId = negocioId;
        }

        const oferta = await prisma.oferta.findUnique({
            where: whereClause,
            select: { // Mismo select que en el tipo OfertaCompleta, agregando los nuevos campos
                id: true,
                nombre: true,
                descripcion: true,
                precio: true,
                tipoPago: true,
                intervaloRecurrencia: true,
                tipoAnticipo: true,
                porcentajeAnticipo: true,
                anticipo: true,
                objetivos: true,
                fechaInicio: true,
                fechaFin: true,
                status: true,
                negocio: {
                    select: {
                        configuracionPago: {
                            select: {
                                monedaPrincipal: true,
                            }
                        }
                    }
                },
                OfertaGaleria: {
                    select: {
                        imageUrl: true,
                        altText: true,
                        descripcion: true,
                        orden: true
                    },
                    orderBy: { orden: "asc" }
                },
                videos: {
                    select: {
                        videoUrl: true,
                        tipoVideo: true,
                        titulo: true,
                        orden: true
                    },
                    orderBy: { orden: "asc" }
                },
                detallesAdicionales: {
                    select: {
                        tituloDetalle: true,
                        contenido: true,
                        tipoDetalle: true,
                        orden: true
                    },
                    orderBy: { orden: "asc" }
                },
            },
        });

        if (!oferta) {
            console.warn(`[Helper MOSTRAR_DETALLE_OFERTA] Oferta con ID ${ofertaId} no encontrada (o no pertenece al negocio ${negocioId}).`);
            return null;
        }
        // Prisma devuelve los enums como strings, el tipo OfertaCompleta debería estar alineado.
        return oferta as OfertaCompleta; // Cast si es necesario después de asegurar que el select coincide
    } catch (error) {
        console.error(`[Helper MOSTRAR_DETALLE_OFERTA] Error al obtener oferta con ID ${ofertaId}:`, error);
        return null;
    }
}

export async function buscarOfertaPorNombre(
    nombreOferta: string,
    negocioId: string // Hacer negocioId requerido para esta búsqueda para evitar ambigüedades
): Promise<OfertaCompleta | null | "multiple"> {
    if (!nombreOferta || !negocioId) {
        console.warn("[Helper MOSTRAR_DETALLE_OFERTA] buscarOfertaPorNombre: nombreOferta o negocioId no proporcionado.");
        return null;
    }

    // console.log(`[Helper MOSTRAR_DETALLE_OFERTA] Buscando oferta por nombre: "${nombreOferta}" en negocioId: ${negocioId}`);

    const ahora = new Date();
    const ofertasEncontradas = await prisma.oferta.findMany({
        where: {
            negocioId: negocioId,
            nombre: { contains: nombreOferta, mode: "insensitive" },
            status: 'activo',
            fechaInicio: { lte: ahora },
            fechaFin: { gte: ahora },
        },
        select: { // Mismo select que en el tipo OfertaCompleta
            id: true,
            nombre: true,
            descripcion: true,
            precio: true,
            tipoPago: true,
            intervaloRecurrencia: true,
            tipoAnticipo: true,
            porcentajeAnticipo: true,
            anticipo: true,
            objetivos: true,
            fechaInicio: true,
            fechaFin: true,
            status: true,
            negocio: { select: { configuracionPago: { select: { monedaPrincipal: true } } } },
            OfertaGaleria: { select: { imageUrl: true, altText: true, descripcion: true, orden: true }, orderBy: { orden: "asc" } },
            videos: { select: { videoUrl: true, tipoVideo: true, titulo: true, orden: true }, orderBy: { orden: "asc" } },
            detallesAdicionales: { select: { tituloDetalle: true, contenido: true, tipoDetalle: true, orden: true }, orderBy: { orden: "asc" } },
        },
        take: 5, // Limitar resultados para evitar devolver demasiados si la búsqueda es amplia
    });

    if (ofertasEncontradas.length === 0) {
        // console.log(`[Helper MOSTRAR_DETALLE_OFERTA] No se encontró oferta activa y vigente con nombre similar a "${nombreOferta}".`);
        return null;
    }
    if (ofertasEncontradas.length === 1) {
        // console.log(`[Helper MOSTRAR_DETALLE_OFERTA] Oferta encontrada por nombre: ID ${ofertasEncontradas[0].id}`);
        return ofertasEncontradas[0] as OfertaCompleta;
    }
    // Múltiples ofertas encontradas
    // console.log(`[Helper MOSTRAR_DETALLE_OFERTA] Múltiples ofertas (${ofertasEncontradas.length}) encontradas con nombre similar a "${nombreOferta}".`);
    return "multiple";
}