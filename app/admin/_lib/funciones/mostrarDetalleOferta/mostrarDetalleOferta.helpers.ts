// app/admin/_lib/actions/funciones/mostrarDetalleOferta/mostrarDetalleOferta.helpers.ts
import prisma from "@/app/admin/_lib/prismaClient";
import { Prisma } from "@prisma/client";

// Tipo para la oferta con todas sus relaciones necesarias
// Ajusta las relaciones según lo que necesites mostrar y esté en tu schema.prisma
export type OfertaCompleta = Prisma.OfertaGetPayload<{
    include: {
        negocio: { // Para obtener la moneda del negocio, por ejemplo
            include: {
                configuracionPago: true; // Asumiendo que aquí está la monedaPrincipal del negocio
            }
        };
        OfertaGaleria: { // Cambiado de ofertaImagenes a OfertaGaleria
            orderBy: {
                orden: "asc"; // Opcional: si tienes un campo 'orden'
            };
        };
        videos: {        // Relación 'videos' para OfertaVideos
            orderBy: {
                orden: "asc";
            };
        };
        detallesAdicionales: { // Relación 'detallesAdicionales' para OfertaDetalle
            orderBy: {
                orden: "asc";
            };
        };
        // Si tienes una forma de obtener "Beneficios" (ej. a través de OfertaDetalle con un tipo específico),
        // asegúrate de que 'detallesAdicionales' esté incluido.
        // Si "Precios" están separados y no solo en Oferta.valor, incluye esa relación aquí.
    };
}>;

export async function obtenerOfertaConDetallesPorId(
    ofertaId: string
): Promise<OfertaCompleta | null> {
    if (!ofertaId) {
        console.warn("[Helper] obtenerOfertaConDetallesPorId: ofertaId no proporcionado.");
        return null;
    }
    try {
        const oferta = await prisma.oferta.findUnique({
            where: { id: ofertaId },
            include: {
                negocio: {
                    include: {
                        configuracionPago: true, // Para moneda
                    },
                },
                OfertaGaleria: { // Imágenes
                    orderBy: {
                        orden: "asc",
                    },
                },
                videos: { // Videos
                    orderBy: {
                        orden: "asc",
                    },
                },
                detallesAdicionales: { // Detalles/FAQs/Beneficios (si están aquí)
                    orderBy: {
                        orden: "asc",
                    },
                },
            },
        });

        if (!oferta) {
            console.warn(`[Helper] Oferta con ID ${ofertaId} no encontrada.`);
            return null;
        }
        return oferta;
    } catch (error) {
        console.error(`[Helper] Error al obtener oferta con ID ${ofertaId}:`, error);
        // Podrías lanzar el error para que sea manejado por la acción principal,
        // o devolver null y que la acción principal lo maneje como "no encontrado".
        // Por consistencia con el chequeo de '!oferta', devolvemos null.
        return null;
    }
}

export async function buscarOfertaPorNombre(
    nombreOferta: string,
    negocioId?: string // Para acotar la búsqueda al negocio actual si es posible y necesario
): Promise<OfertaCompleta | null | "multiple"> { // "multiple" para indicar ambigüedad
    if (!nombreOferta) return null;

    console.log(`[Helper] Buscando oferta por nombre: "${nombreOferta}"${negocioId ? ` en negocioId: ${negocioId}` : ''}`);

    const whereClause: Prisma.OfertaWhereInput = {
        // Usar 'contains' para búsqueda flexible, o 'equals' si quieres exactitud.
        // 'mode: "insensitive"' para ignorar mayúsculas/minúsculas.
        nombre: {
            contains: nombreOferta,
            mode: "insensitive",
        },
    };

    if (negocioId) {
        whereClause.negocioId = negocioId;
    }

    const ofertasEncontradas = await prisma.oferta.findMany({
        where: whereClause,
        include: { // Incluir las mismas relaciones que en OfertaCompleta
            negocio: { include: { configuracionPago: true } },
            OfertaGaleria: { orderBy: { orden: "asc" } },
            videos: { orderBy: { orden: "asc" } },
            detallesAdicionales: { orderBy: { orden: "asc" } },
        },
    });

    if (ofertasEncontradas.length === 0) {
        console.log(`[Helper] No se encontró oferta con nombre similar a "${nombreOferta}".`);
        return null;
    }
    if (ofertasEncontradas.length === 1) {
        console.log(`[Helper] Oferta encontrada por nombre: ID ${ofertasEncontradas[0].id}`);
        return ofertasEncontradas[0] as OfertaCompleta; // Asegurar el tipo
    }
    // Múltiples ofertas encontradas
    console.log(`[Helper] Múltiples ofertas (${ofertasEncontradas.length}) encontradas con nombre similar a "${nombreOferta}".`);
    return "multiple";
}