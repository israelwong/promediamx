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
    type CrearOfertaDetalleBasicoInputType,
} from './ofertaDetalle.schemas';

import { eliminarImagenStorage as eliminarArchivoStorage } from '@/app/admin/_lib/imageHandler.actions';


import { revalidatePath } from 'next/cache';

import { z } from 'zod';
import { Prisma } from '@prisma/client'; // Para manejar errores específicos de Prisma

// Helper para la ruta de revalidación
const getPathToOfertaEdicionPage = (clienteId: string, negocioId: string, ofertaId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;


export async function createOfertaDetalleAction(
    input: CreateOfertaDetalleInputType,
    clienteId: string, // Para revalidatePath
    negocioId: string  // Para revalidatePath y potencialmente permisos
): Promise<ActionResult<OfertaDetalleCompletoType>> {
    const validationResult = CreateOfertaDetalleInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para crear detalle.",
            errorDetails: validationResult.error.flatten().fieldErrors,
        };
    }
    const data = validationResult.data;

    try {
        // Verificar que la ofertaId existe y pertenece al negocio (si tienes esa lógica de permisos)
        const ofertaPadre = await prisma.oferta.findUnique({
            where: { id: data.ofertaId, negocioId: negocioId }, // Asumiendo que pasas negocioId para verificar
        });
        if (!ofertaPadre) {
            return { success: false, error: "Oferta asociada no encontrada o no pertenece al negocio." };
        }

        const nuevoDetalle = await prisma.ofertaDetalle.create({
            data: {
                ofertaId: data.ofertaId,
                tituloDetalle: data.tituloDetalle,
                contenido: data.contenido,
                tipoDetalle: data.tipoDetalle,
                palabrasClave: data.palabrasClave,
                orden: data.orden,
                estadoContenido: data.estadoContenido,
                preguntaOriginalUsuario: data.resolverPreguntaId ?
                    (await prisma.preguntaSinRespuestaOferta.findUnique({ where: { id: data.resolverPreguntaId } }))?.preguntaUsuario : null,
                creadoPorHumano: true, // Asumimos que se crea desde el form por un humano
                // La multimedia se gestionará por separado después de la creación
            },
            include: { // Incluir para devolver el objeto completo
                galeriaDetalle: true, videoDetalle: true, documentosDetalle: true,
            }
        });

        // Si se está resolviendo una pregunta, actualizarla
        if (data.resolverPreguntaId) {
            await prisma.preguntaSinRespuestaOferta.update({
                where: { id: data.resolverPreguntaId },
                data: {
                    estado: 'RESPONDIDA_LISTA_PARA_NOTIFICAR', // O el estado que corresponda
                    ofertaDetalleRespuestaId: nuevoDetalle.id,
                    fechaRespuesta: new Date(),
                },
            });
        }

        const parsedData = OfertaDetalleCompletoSchema.parse(nuevoDetalle); // Validar/transformar salida

        revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, data.ofertaId));
        return { success: true, data: parsedData };

    } catch (error) {
        console.error("Error en createOfertaDetalleAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Manejar errores específicos de Prisma si es necesario
        }
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

            // Las eliminaciones de relaciones multimedia se pueden hacer aquí explícitamente si no hay onDelete: Cascade
            // o confiar en la cascada si está configurada al eliminar OfertaDetalle.
            // Por seguridad, si no estás seguro de la cascada:
            await tx.ofertaDetalleGaleria.deleteMany({ where: { ofertaDetalleId } });
            if (detalle.videoDetalle) {
                await tx.ofertaDetalleVideo.deleteMany({ where: { ofertaDetalleId: ofertaDetalleId } }); // Usar deleteMany por si acaso, o delete con el ID del videoDetalle si lo tienes
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
            return { success: true, data: null, error: "El detalle ya había sido eliminado (P2025)." }; // Considerar esto un éxito si el objetivo es que no exista
        }
        return { success: false, error: "No se pudo eliminar el detalle de la oferta." };
    }
}

// --- NUEVA ACTION para creación básica ---
export async function crearOfertaDetalleBasicoAction(
    input: CrearOfertaDetalleBasicoInputType,
    clienteId: string, // Para revalidatePath y construcción de URL de redirección
    negocioId: string  // Para revalidatePath y construcción de URL de redirección
): Promise<ActionResult<OfertaDetalleCompletoType>> { // Devolvemos el detalle completo para la redirección
    const validationResult = CrearOfertaDetalleBasicoInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para crear el detalle.",
            errorDetails: validationResult.error.flatten().fieldErrors,
        };
    }
    const data = validationResult.data;

    try {
        // Verificar que la ofertaId existe y pertenece al negocio (si tienes esa lógica de permisos)
        const ofertaPadre = await prisma.oferta.findUnique({
            where: { id: data.ofertaId, negocioId: negocioId },
        });
        if (!ofertaPadre) {
            return { success: false, error: "Oferta asociada no encontrada." };
        }

        // Asignar orden por defecto al crear
        const ultimoDetalle = await prisma.ofertaDetalle.findFirst({
            where: { ofertaId: data.ofertaId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoDetalle?.orden ?? -1) + 1;

        const nuevoDetalle = await prisma.ofertaDetalle.create({
            data: {
                ofertaId: data.ofertaId,
                tituloDetalle: data.tituloDetalle,
                contenido: data.contenido,
                // Valores por defecto para los campos no incluidos en este form básico:
                tipoDetalle: null,
                palabrasClave: [], // Default a array vacío
                orden: nuevoOrden,
                estadoContenido: "BORRADOR", // Iniciar como borrador, ya que faltan detalles/multimedia
                creadoPorHumano: true,
                preguntaOriginalUsuario: data.resolverPreguntaId ?
                    (await prisma.preguntaSinRespuestaOferta.findUnique({ where: { id: data.resolverPreguntaId } }))?.preguntaUsuario : null,

                // Multimedia se añadirá en la página de edición
            },
            include: { // Incluir para devolver el objeto completo y pasarlo a la pág de edición
                galeriaDetalle: true, videoDetalle: true, documentosDetalle: true,
            }
        });

        // Si se está resolviendo una pregunta, actualizarla
        if (data.resolverPreguntaId) {
            await prisma.preguntaSinRespuestaOferta.update({
                where: { id: data.resolverPreguntaId },
                data: {
                    estado: 'RESPONDIDA_LISTA_PARA_NOTIFICAR', // O un estado intermedio como 'RESPUESTA_EN_BORRADOR'
                    ofertaDetalleRespuestaId: nuevoDetalle.id,
                    fechaRespuesta: new Date(),
                },
            });
        }

        // Validar la data completa que se devuelve
        const parsedData = OfertaDetalleCompletoSchema.parse(nuevoDetalle);

        // Revalidar la página de edición de la oferta principal (donde se lista OfertaDetalleManager)
        revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, data.ofertaId));

        return { success: true, data: parsedData }; // Devolver el detalle completo con su ID

    } catch (error) {
        console.error("Error en crearOfertaDetalleBasicoAction:", error);
        return { success: false, error: "No se pudo crear el detalle de la oferta." };
    }
}

// Esta acción es para el formulario de EDICIÓN COMPLETO (OfertaDetalleForm.tsx)
export async function updateOfertaDetalleAction(
    ofertaDetalleId: string,
    input: UpdateOfertaDetalleInputType, // Schema ya no incluye 'orden'
    clienteId: string,
    negocioId: string,
    ofertaId: string
): Promise<ActionResult<OfertaDetalleCompletoType>> {
    const validationResult = UpdateOfertaDetalleInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para actualizar detalle.",
            errorDetails: validationResult.error.flatten().fieldErrors,
        };
    }
    const data = validationResult.data;

    try {
        const detalleExistente = await prisma.ofertaDetalle.findFirst({
            where: { id: ofertaDetalleId, ofertaId: ofertaId, oferta: { negocioId: negocioId } }
        });
        if (!detalleExistente) {
            return { success: false, error: "Detalle de oferta no encontrado o no modificable." };
        }

        const detalleActualizado = await prisma.ofertaDetalle.update({
            where: { id: ofertaDetalleId },
            data: {
                tituloDetalle: data.tituloDetalle,
                contenido: data.contenido,
                tipoDetalle: data.tipoDetalle,
                palabrasClave: data.palabrasClave,
                estadoContenido: data.estadoContenido,
                // 'orden' NO se actualiza desde este formulario.
                // La reordenación se haría con una action separada desde el listado.
            },
            include: {
                galeriaDetalle: true, videoDetalle: true, documentosDetalle: true,
            }
        });

        const parsedData = OfertaDetalleCompletoSchema.parse(detalleActualizado);

        const mainOfertaPagePath = getPathToOfertaEdicionPage(clienteId, negocioId, ofertaId);
        revalidatePath(mainOfertaPagePath);
        // También la página específica de edición de este detalle, si existiera y se quisiera revalidar
        // revalidatePath(getPathToOfertaDetalleEdicionPage(clienteId, negocioId, ofertaId, ofertaDetalleId));

        return { success: true, data: parsedData };

    } catch (error) {
        console.error("Error en updateOfertaDetalleAction:", error);
        return { success: false, error: "No se pudo actualizar el detalle de la oferta." };
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