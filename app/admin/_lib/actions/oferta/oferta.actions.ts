'use server';

import prisma from '@/app/admin/_lib/prismaClient';

import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { EstadoOferta, TipoPagoOferta } from '@prisma/client';
import { getEmbeddingForText } from '../../ia/ia.actions';

import {
    CrearOfertaSimplificadoSchema,
    OfertaParaListaSchema,
    EditarOfertaInputSchema,
    OfertaCompletaParaEdicionSchema
} from './oferta.schemas';
import type {
    CrearOfertaSimplificadoType,
    OfertaCreadaType,
    OfertaParaListaType,
    EditarOfertaInputType,
    OfertaParaEditarFormType,
} from './oferta.schemas';

const getPathToOfertaList = (clienteId: string, negocioId: string) => `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`;

/**
 * Crea una nueva oferta con valores por defecto.
 */
export async function crearOfertaAction(
    negocioId: string,
    clienteId: string,
    input: CrearOfertaSimplificadoType
): Promise<ActionResult<OfertaCreadaType>> {
    const validation = CrearOfertaSimplificadoSchema.safeParse(input);
    if (!validation.success) return { success: false, error: "Datos inválidos." };

    try {
        const nuevaOferta = await prisma.$transaction(async (tx) => {
            // Paso 1: Crear la oferta con los datos de texto, como antes.
            const ofertaCreada = await tx.oferta.create({
                data: {
                    negocioId,
                    ...validation.data,
                    objetivos: [],
                    tipoPago: TipoPagoOferta.UNICO,
                    fechaInicio: new Date(),
                    fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    status: EstadoOferta.BORRADOR,
                },
                select: { id: true, nombre: true }
            });

            // Paso 2: Generar el embedding.
            const textoParaEmbedding = `${validation.data.nombre}. ${validation.data.descripcion || ''}`;
            const embedding = await getEmbeddingForText(textoParaEmbedding);

            if (!embedding) {
                throw new Error("La generación del embedding falló.");
            }

            // ✅ SOLUCIÓN: Usamos $executeRaw para actualizar la columna de tipo 'vector'.
            // Prisma se encarga de proteger contra inyección SQL al usar `${...}`.
            await tx.$executeRaw`
                UPDATE "Oferta"
                SET "embedding" = ${embedding}::vector
                WHERE "id" = ${ofertaCreada.id}
            `;

            return ofertaCreada;
        });

        revalidatePath(getPathToOfertaList(clienteId, negocioId));
        return { success: true, data: nuevaOferta };

    } catch (error) {
        console.error("Error al crear la oferta con embedding:", error);
        return { success: false, error: "No se pudo crear la oferta." };
    }
}

/**
 * Obtiene la lista de ofertas para un negocio.
 */
export async function obtenerOfertasNegocioAction(
    negocioId: string
): Promise<ActionResult<OfertaParaListaType[]>> {
    if (!negocioId) return { success: false, error: "ID de Negocio no proporcionado." };

    try {
        const ofertasDb = await prisma.oferta.findMany({
            where: { negocioId },
            select: {
                id: true, nombre: true, descripcion: true, status: true,
                fechaInicio: true, fechaFin: true,
                OfertaGaleria: { select: { imageUrl: true }, orderBy: { orden: 'asc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
        });

        const ofertasParaLista = ofertasDb.map(o => ({ ...o, imagenPortadaUrl: o.OfertaGaleria?.[0]?.imageUrl ?? null }));
        const validation = z.array(OfertaParaListaSchema).safeParse(ofertasParaLista);
        if (!validation.success) {
            console.error("Error Zod en obtenerOfertasNegocioAction:", validation.error);
            return { success: false, error: "Los datos de las ofertas son inconsistentes." };
        }
        return { success: true, data: validation.data };
    } catch {
        return { success: false, error: "No se pudieron cargar las ofertas." };
    }
}

/**
 * Obtiene los datos de una oferta para cargarlos en el formulario de edición.
 */
export async function obtenerOfertaParaEdicionAction(
    ofertaId: string,
    negocioId: string
): Promise<ActionResult<OfertaParaEditarFormType>> {
    try {
        const ofertaDb = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioId },
            include: { serviciosDeCita: { select: { agendaTipoCitaId: true } } }
        });
        if (!ofertaDb) return { success: false, error: "Oferta no encontrada." };

        const dataParaValidar = {
            ...ofertaDb,
            serviciosDeCitaIds: ofertaDb.serviciosDeCita.map(s => s.agendaTipoCitaId),
        };

        // CORRECCIÓN: Usar el nombre de schema correcto
        const validation = OfertaCompletaParaEdicionSchema.safeParse(dataParaValidar);
        if (!validation.success) {
            console.error("Error Zod en obtenerOfertaParaEdicionAction:", validation.error.flatten());
            return { success: false, error: "Los datos de la oferta son inconsistentes." };
        }
        return { success: true, data: validation.data };
    } catch {
        return { success: false, error: "Error al cargar la oferta." };
    }
}

/**
 * Actualiza una oferta existente.
 */
export async function editarOfertaAction(
    ofertaId: string,
    input: EditarOfertaInputType
): Promise<ActionResult<OfertaParaEditarFormType>> {
    const validation = EditarOfertaInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", validationErrors: validation.error.flatten().fieldErrors };
    }

    const { serviciosDeCitaIds, ...dataToUpdate } = validation.data;

    try {
        // ✅ Usamos una transacción para asegurar que todas las operaciones se completen
        const updatedOferta = await prisma.$transaction(async (tx) => {
            // 1. Actualizamos los campos de texto y relaciones como siempre
            const ofertaActualizada = await tx.oferta.update({
                where: { id: ofertaId },
                data: {
                    ...dataToUpdate,
                    serviciosDeCita: {
                        deleteMany: {},
                        create: serviciosDeCitaIds?.map(servicioId => ({ agendaTipoCitaId: servicioId })),
                    }
                },
            });

            // 2. Verificamos si el texto cambió para decidir si regenerar el embedding
            const necesitaNuevoEmbedding = dataToUpdate.nombre || dataToUpdate.descripcion;

            if (necesitaNuevoEmbedding) {
                const textoCompleto = `${ofertaActualizada.nombre} ${ofertaActualizada.descripcion || ''}`;
                const nuevoEmbedding = await getEmbeddingForText(textoCompleto);

                if (nuevoEmbedding) {
                    // 3. Usamos $executeRaw para actualizar la columna de tipo 'vector'
                    await tx.$executeRaw`
                        UPDATE "Oferta"
                        SET "embedding" = ${nuevoEmbedding}::vector
                        WHERE "id" = ${ofertaId}
                    `;
                }
            }

            return ofertaActualizada;
        });

        revalidatePath(`/admin/`);
        return await obtenerOfertaParaEdicionAction(ofertaId, updatedOferta.negocioId);

    } catch (error) {
        console.error("Error al actualizar la oferta:", error);
        return { success: false, error: "No se pudo actualizar la oferta." };
    }
}

/**
 * Elimina una oferta de forma permanente.
 */
export async function eliminarOfertaAction(ofertaId: string, clienteId: string, negocioId: string): Promise<ActionResult<null>> {
    try {
        await prisma.oferta.delete({ where: { id: ofertaId, negocioId: negocioId } });
        revalidatePath(getPathToOfertaList(clienteId, negocioId));
        return { success: true, data: null };
    } catch {
        return { success: false, error: "No se pudo eliminar la oferta." };
    }
}
