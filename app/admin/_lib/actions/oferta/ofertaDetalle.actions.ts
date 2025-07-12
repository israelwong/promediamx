"use server";

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta tu ruta
import { ActionResult } from '@/app/admin/_lib/types';
import {
    CreateOfertaDetalleInputSchema,
    type CreateOfertaDetalleInputType,
    UpdateOfertaDetalleInputSchema,
    type UpdateOfertaDetalleInputType,
    OfertaDetalleCompletoSchema,
    type OfertaDetalleCompletoType,
    OfertaDetalleListItemSchema,
    type OfertaDetalleListItemType,
    CrearOfertaDetalleBasicoInputSchema, // Nuevo schema
    type CrearOfertaDetalleBasicoInputType
} from './ofertaDetalle.schemas';

// import { eliminarImagenStorage as eliminarArchivoStorage } from '@/app/admin/_lib/imageHandler.actions';
// import { getEmbeddingForText } from '@/app/admin/_lib/ia/ia.actions'; // Asegúrate de que esta función esté implementada


import { revalidatePath } from 'next/cache';

import { z } from 'zod';
import { Prisma } from '@prisma/client'; // Para manejar errores específicos de Prisma

// Helper para la ruta de revalidación
const getPathToOfertaEdicionPage = (clienteId: string, negocioId: string, ofertaId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;


export async function createOfertaDetalleAction(
    input: CreateOfertaDetalleInputType,
    clienteId: string,
    negocioId: string
): Promise<ActionResult<OfertaDetalleCompletoType>> {
    const validationResult = CreateOfertaDetalleInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const data = validationResult.data;

    try {
        const ofertaPadre = await prisma.oferta.findUnique({
            where: { id: data.ofertaId, negocioId: negocioId },
        });
        if (!ofertaPadre) {
            return { success: false, error: "Oferta asociada no encontrada." };
        }

        const nuevoDetalle = await prisma.$transaction(async (tx) => {
            const detalleCreado = await tx.ofertaDetalle.create({
                data: {
                    ofertaId: data.ofertaId,
                    tituloDetalle: data.tituloDetalle,
                    contenido: data.contenido,
                    tipoDetalle: data.tipoDetalle,
                    palabrasClave: data.palabrasClave,
                    orden: data.orden,
                    estadoContenido: data.estadoContenido,
                    preguntaOriginalUsuario: data.resolverPreguntaId ? (await tx.preguntaSinRespuestaOferta.findUnique({ where: { id: data.resolverPreguntaId } }))?.preguntaUsuario : null,
                    creadoPorHumano: true,
                },
                include: { galeriaDetalle: true, videoDetalle: true, documentosDetalle: true }
            });

            const textoParaEmbedding = `${detalleCreado.tituloDetalle}. ${detalleCreado.contenido}`;
            const embedding = await getEmbeddingForText(textoParaEmbedding);

            if (embedding) {
                await tx.$executeRaw`UPDATE "OfertaDetalle" SET "embedding" = ${embedding}::vector WHERE "id" = ${detalleCreado.id}`;
            }
            return detalleCreado;
        });

        if (data.resolverPreguntaId) {
            await prisma.preguntaSinRespuestaOferta.update({
                where: { id: data.resolverPreguntaId },
                data: { estado: 'RESPONDIDA_LISTA_PARA_NOTIFICAR', ofertaDetalleRespuestaId: nuevoDetalle.id, fechaRespuesta: new Date() },
            });
        }

        const parsedData = OfertaDetalleCompletoSchema.parse(nuevoDetalle);
        revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, data.ofertaId));
        return { success: true, data: parsedData };

    } catch (error) {
        console.error("Error en createOfertaDetalleAction:", error);
        return { success: false, error: "No se pudo crear el detalle de la oferta." };
    }
}

// Action para obtener la lista de detalles para OfertaDetalleListado.tsx (ya definida antes, la incluyo aquí por completitud)
export async function obtenerDetallesDeOfertaAction(
    ofertaId: string
): Promise<ActionResult<OfertaDetalleListItemType[]>> {
    // ... (código ya proporcionado anteriormente)
    if (!ofertaId) return { success: false, error: "ID de oferta requerido." };
    try {
        const detallesDb = await prisma.ofertaDetalle.findMany({
            where: { ofertaId: ofertaId },
            select: {
                id: true, ofertaId: true, tituloDetalle: true, contenido: true,
                orden: true, estadoContenido: true, updatedAt: true,
            },
            orderBy: { orden: 'asc' },
        });
        const detallesConExtracto = detallesDb.map(d => ({
            ...d,
            contenidoExtracto: d.contenido.substring(0, 100) + (d.contenido.length > 100 ? "..." : ""),
        }));
        const parseResults = z.array(OfertaDetalleListItemSchema).safeParse(detallesConExtracto);
        if (!parseResults.success) {
            console.warn(`Error Zod al parsear lista de OfertaDetalle:`, parseResults.error.flatten());
            return { success: false, error: "Formato de datos de lista de detalles inválido." };
        }
        return { success: true, data: parseResults.data };
    } catch (error) {
        console.error("Error en obtenerDetallesDeOfertaAction:", error);
        return { success: false, error: "No se pudieron obtener los detalles de la oferta." };
    }
}

// --- NUEVA ACTION para creación básica ---
export async function crearOfertaDetalleBasicoAction(
    input: CrearOfertaDetalleBasicoInputType,
    clienteId: string,
    negocioId: string
): Promise<ActionResult<OfertaDetalleCompletoType>> {
    const validationResult = CrearOfertaDetalleBasicoInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const data = validationResult.data;

    try {
        const ofertaPadre = await prisma.oferta.findUnique({ where: { id: data.ofertaId, negocioId: negocioId } });
        if (!ofertaPadre) {
            return { success: false, error: "Oferta asociada no encontrada." };
        }

        const ultimoDetalle = await prisma.ofertaDetalle.findFirst({
            where: { ofertaId: data.ofertaId }, orderBy: { orden: 'desc' }, select: { orden: true }
        });
        const nuevoOrden = (ultimoDetalle?.orden ?? -1) + 1;

        const nuevoDetalle = await prisma.$transaction(async (tx) => {
            const detalleCreado = await tx.ofertaDetalle.create({
                data: {
                    ofertaId: data.ofertaId,
                    tituloDetalle: data.tituloDetalle,
                    contenido: data.contenido,
                    orden: nuevoOrden,
                    estadoContenido: "BORRADOR",
                    creadoPorHumano: true,
                    preguntaOriginalUsuario: data.resolverPreguntaId ? (await tx.preguntaSinRespuestaOferta.findUnique({ where: { id: data.resolverPreguntaId } }))?.preguntaUsuario : null,
                },
                include: { galeriaDetalle: true, videoDetalle: true, documentosDetalle: true }
            });

            const textoParaEmbedding = `${detalleCreado.tituloDetalle}. ${detalleCreado.contenido}`;
            const embedding = await getEmbeddingForText(textoParaEmbedding);
            if (embedding) {
                await tx.$executeRaw`UPDATE "OfertaDetalle" SET "embedding" = ${embedding}::vector WHERE "id" = ${detalleCreado.id}`;
            }
            return detalleCreado;
        });

        if (data.resolverPreguntaId) {
            await prisma.preguntaSinRespuestaOferta.update({
                where: { id: data.resolverPreguntaId },
                data: { estado: 'RESPONDIDA_LISTA_PARA_NOTIFICAR', ofertaDetalleRespuestaId: nuevoDetalle.id, fechaRespuesta: new Date() },
            });
        }

        const parsedData = OfertaDetalleCompletoSchema.parse(nuevoDetalle);
        revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, data.ofertaId));
        return { success: true, data: parsedData };

    } catch (error) {
        console.error("Error en crearOfertaDetalleBasicoAction:", error);
        return { success: false, error: "No se pudo crear el detalle de la oferta." };
    }
}


// obtenerOfertaDetallePorIdAction (para cargar datos para el form de edición)
export async function obtenerOfertaDetallePorIdAction(
    ofertaDetalleId: string,
    ofertaIdVerificar: string
): Promise<ActionResult<OfertaDetalleCompletoType>> {
    // ... (sin cambios respecto a la versión anterior que ya te pasé, que usa OfertaDetalleCompletoSchema)
    if (!ofertaDetalleId || !ofertaIdVerificar) return { success: false, error: "IDs requeridos faltantes." };
    try {
        const detalle = await prisma.ofertaDetalle.findUnique({
            where: { id: ofertaDetalleId, ofertaId: ofertaIdVerificar },
            include: { galeriaDetalle: true, videoDetalle: true, documentosDetalle: true }
        });
        if (!detalle) return { success: false, error: "Detalle de oferta no encontrado." };
        const validationResult = OfertaDetalleCompletoSchema.safeParse(detalle);
        if (!validationResult.success) {
            console.error("Error Zod en obtenerOfertaDetallePorIdAction:", validationResult.error.flatten());
            return { success: false, error: "Formato de datos de detalle inválido." };
        }
        return { success: true, data: validationResult.data };
    } catch { /* ... */ }
    return { success: false, error: "Error desconocido" } // Fallback
}




// --- Dummy implementations for completeness ---
// En tu proyecto real, estos helpers vendrían de tus propios archivos.
// type ActionResult<T> = { success: boolean; data?: T; error?: string, errorDetails?: unknown };
const getEmbeddingForText = async (text: string): Promise<number[] | null> => { console.log(`Generating embedding for: ${text}`); return [0.1, 0.2, 0.3]; };
const eliminarArchivoStorage = async (url: string): Promise<void> => { console.log(`Deleting file from storage: ${url}`); };
// --- End of Dummy implementations ---


// Esta acción es para el formulario de EDICIÓN COMPLETO (OfertaDetalleForm.tsx)
export async function updateOfertaDetalleAction(
    ofertaDetalleId: string,
    input: UpdateOfertaDetalleInputType,
    clienteId: string,
    negocioId: string,
    ofertaId: string
): Promise<ActionResult<OfertaDetalleCompletoType>> {
    const validationResult = UpdateOfertaDetalleInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const data = validationResult.data;

    try {
        const detalleActualizado = await prisma.$transaction(async (tx) => {
            const detalle = await tx.ofertaDetalle.update({
                where: { id: ofertaDetalleId },
                data: {
                    tituloDetalle: data.tituloDetalle,
                    contenido: data.contenido,
                    tipoDetalle: data.tipoDetalle,
                    palabrasClave: data.palabrasClave,
                    estadoContenido: data.estadoContenido,
                },
                include: { galeriaDetalle: true, videoDetalle: true, documentosDetalle: true }
            });

            const necesitaNuevoEmbedding = data.tituloDetalle || data.contenido;
            if (necesitaNuevoEmbedding) {
                const textoCompleto = `${detalle.tituloDetalle}. ${detalle.contenido}`;
                const nuevoEmbedding = await getEmbeddingForText(textoCompleto);
                if (nuevoEmbedding) {
                    await tx.$executeRaw`
                        UPDATE "OfertaDetalle" SET "embedding" = ${nuevoEmbedding}::vector WHERE "id" = ${detalle.id}
                    `;
                }
            }
            return detalle;
        });

        const parsedData = OfertaDetalleCompletoSchema.parse(detalleActualizado);
        revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, ofertaId));
        return { success: true, data: parsedData };

    } catch (error) {
        console.error("Error en updateOfertaDetalleAction:", error);
        return { success: false, error: "No se pudo actualizar el detalle de la oferta." };
    }
}


export async function eliminarOfertaDetalleAction(
    ofertaDetalleId: string,
    negocioId: string,
    clienteId: string,
    ofertaId: string
): Promise<ActionResult<null>> {
    if (!ofertaDetalleId || !negocioId || !clienteId || !ofertaId) {
        return { success: false, error: "Faltan parámetros requeridos para eliminar el detalle." };
    }

    try {
        const resultInTransaction = await prisma.$transaction(async (tx) => {
            const detalle = await tx.ofertaDetalle.findFirst({
                where: {
                    id: ofertaDetalleId,
                    ofertaId: ofertaId,
                    oferta: { negocioId: negocioId }
                },
                include: {
                    galeriaDetalle: { select: { id: true, imageUrl: true, tamañoBytes: true } },
                    videoDetalle: { select: { id: true, videoUrl: true, tipoVideo: true, tamañoBytes: true } },
                    documentosDetalle: { select: { id: true, documentoUrl: true, documentoTamanoBytes: true } },
                }
            });

            if (!detalle) {
                throw new Error("NOT_FOUND_OR_FORBIDDEN"); // Error específico para la transacción
            }

            let bytesDecrementados = BigInt(0);

            for (const item of detalle.galeriaDetalle) {
                if (item.imageUrl) await eliminarArchivoStorage(item.imageUrl);
                bytesDecrementados += BigInt(item.tamañoBytes || 0);
            }
            if (detalle.videoDetalle && detalle.videoDetalle.videoUrl && detalle.videoDetalle.tipoVideo === 'SUBIDO') {
                await eliminarArchivoStorage(detalle.videoDetalle.videoUrl);
                bytesDecrementados += BigInt(detalle.videoDetalle.tamañoBytes || 0);
            }
            for (const item of detalle.documentosDetalle) {
                if (item.documentoUrl) await eliminarArchivoStorage(item.documentoUrl);
                bytesDecrementados += BigInt(item.documentoTamanoBytes || 0);
            }

            await tx.ofertaDetalleGaleria.deleteMany({ where: { ofertaDetalleId } });
            if (detalle.videoDetalle) {
                await tx.ofertaDetalleVideo.deleteMany({ where: { ofertaDetalleId: ofertaDetalleId } });
            }
            await tx.ofertaDetalleDocumento.deleteMany({ where: { ofertaDetalleId } });

            await tx.ofertaDetalle.delete({ where: { id: ofertaDetalleId } });

            if (bytesDecrementados > BigInt(0)) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: Number(bytesDecrementados) } },
                });
            }
            return { success: true, data: null };
        });

        if (resultInTransaction.success) {
            revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, ofertaId));
        }
        return resultInTransaction;

    } catch (error: unknown) {
        console.error("Error en eliminarOfertaDetalleAction:", error);
        if (error instanceof Error && error.message === "NOT_FOUND_OR_FORBIDDEN") {
            return { success: false, error: "Detalle de oferta no encontrado o no pertenece al contexto." };
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, ofertaId));
            return { success: true, data: null, error: "El detalle ya había sido eliminado (P2025)." };
        }
        return { success: false, error: "No se pudo eliminar el detalle de la oferta." };
    }
}
