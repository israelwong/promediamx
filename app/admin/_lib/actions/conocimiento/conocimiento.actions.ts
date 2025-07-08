// app/admin/_lib/actions/conocimiento.actions.ts

'use server';



import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Importamos la función que genera embeddings
import { getEmbeddingForText } from '../../ia/ia.actions';



import {
    ConocimientoItemParaEditarSchema
} from './conocimiento.schemas';
import type {
    ConocimientoItemParaEditarType
} from './conocimiento.schemas';

// --- NUEVO ESQUEMA UNIFICADO PARA EL FORMULARIO ---
// Este esquema sirve tanto para crear como para actualizar desde un FormData.
const UpsertConocimientoItemSchema = z.object({
    id: z.string().optional(),
    negocioId: z.string(),
    preguntaFormulada: z.string().min(5, 'La pregunta o título es requerido.'),
    respuesta: z.string().min(10, 'La respuesta es requerida.'),
    categoria: z.string().optional(),
    estado: z.enum(['PENDIENTE_RESPUESTA', 'RESPONDIDA', 'EN_REVISION', 'OBSOLETA', 'ARCHIVADA']),
});

// --- FUNCIÓN UNIFICADA Y CORREGIDA ---
/**
 * Crea o actualiza un ítem de conocimiento.
 * **Crucialmente, genera y guarda el vector de embedding para la búsqueda semántica.**
 * @param formData Los datos provenientes del formulario.
 */
export async function crearOActualizarConocimientoItemAction(formData: FormData) {
    const data = Object.fromEntries(formData.entries());
    const validation = UpsertConocimientoItemSchema.safeParse(data);

    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", validationErrors: validation.error.flatten().fieldErrors };
    }

    const { id, preguntaFormulada, respuesta, negocioId, ...restOfData } = validation.data;

    try {
        console.log(`[ACCIÓN CONOCIMIENTO] Generando embeddings para: "${preguntaFormulada}"`);

        const [vectorPregunta, vectorRespuesta] = await Promise.all([
            getEmbeddingForText(preguntaFormulada),
            respuesta ? getEmbeddingForText(respuesta) : Promise.resolve(null)
        ]);

        if (!vectorPregunta) {
            throw new Error("No se pudo generar el embedding para la pregunta.");
        }

        if (id) {
            // Lógica de ACTUALIZACIÓN usando una transacción
            await prisma.$transaction(async (tx) => {
                // 1. Actualizamos los campos de texto
                await tx.negocioConocimientoItem.update({
                    where: { id },
                    data: {
                        ...restOfData,
                        preguntaFormulada,
                        respuesta,
                    },
                });

                // 2. Actualizamos los campos de vector con $executeRaw
                await tx.$executeRaw`
                    UPDATE "NegocioConocimientoItem"
                    SET "embeddingPregunta" = ${vectorPregunta}::vector,
                        "embeddingRespuesta" = ${vectorRespuesta}::vector
                    WHERE "id" = ${id}
                `;
            });
            console.log(`[ACCIÓN CONOCIMIENTO] Item ${id} actualizado con sus nuevos embeddings.`);

        } else {
            // Lógica de CREACIÓN usando una transacción
            const newItem = await prisma.$transaction(async (tx) => {
                // 1. Creamos el item solo con los datos de texto y la relación
                const itemCreado = await tx.negocioConocimientoItem.create({
                    data: {
                        ...restOfData,
                        preguntaFormulada,
                        respuesta,
                        negocio: { connect: { id: negocioId } }
                    }
                });

                // 2. Actualizamos el item recién creado con sus vectores
                await tx.$executeRaw`
                    UPDATE "NegocioConocimientoItem"
                    SET "embeddingPregunta" = ${vectorPregunta}::vector,
                        "embeddingRespuesta" = ${vectorRespuesta}::vector
                    WHERE "id" = ${itemCreado.id}
                `;
                return itemCreado;
            });
            console.log(`[ACCIÓN CONOCIMIENTO] Nuevo item creado con id ${newItem.id} y sus embeddings.`);
        }

        revalidatePath('/admin/conocimiento');
        return { success: true, message: "Ítem de conocimiento guardado exitosamente." };

    } catch (error) {
        console.error("[ACCIÓN CONOCIMIENTO] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido al guardar el ítem." };
    }
}

/**
 * Obtiene todos los ítems de conocimiento para un negocio específico.
 */
export async function getConocimientoItemsByNegocio(negocioId: string): Promise<ActionResult<ConocimientoItemParaEditarType[]>> {
    try {
        const items = await prisma.negocioConocimientoItem.findMany({
            where: { negocioId },
            select: {
                id: true,
                preguntaFormulada: true,
                respuesta: true,
                categoria: true,
                estado: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        const validation = z.array(ConocimientoItemParaEditarSchema).safeParse(items);
        if (!validation.success) {
            console.error("Error Zod en getConocimientoItemsByNegocio:", validation.error);
            return { success: false, error: "Los datos son inconsistentes." };
        }
        return { success: true, data: validation.data };

    } catch {
        return { success: false, error: "No se pudieron cargar los ítems de conocimiento." };
    }
}


/**
 * Elimina un ítem de conocimiento.
 */
export async function deleteConocimientoItem(itemId: string): Promise<ActionResult<null>> {
    try {
        await prisma.negocioConocimientoItem.delete({
            where: { id: itemId }
        });
        revalidatePath(`/admin/conocimiento`); // Asegúrate que esta ruta sea correcta
        return { success: true, data: null };
    } catch {
        return { success: false, error: "No se pudo eliminar el ítem." };
    }
}


export async function getConocimientoItemById(itemId: string): Promise<ActionResult<ConocimientoItemParaEditarType>> {
    try {
        const item = await prisma.negocioConocimientoItem.findUnique({
            where: { id: itemId },
        });
        if (!item) return { success: false, error: "Ítem no encontrado." };

        // Hacemos una validación segura para asegurar que el tipo es correcto
        const validation = ConocimientoItemParaEditarSchema.safeParse(item);
        if (!validation.success) {
            return { success: false, error: "Los datos del ítem son inconsistentes." };
        }

        return { success: true, data: validation.data };
    } catch {
        return { success: false, error: "Error al cargar el ítem." };
    }
}

/**
 * Obtiene todas las preguntas generales sin respuesta para un negocio.
 */
export async function getPreguntasSinRespuestaGeneral(negocioId: string): Promise<ActionResult<{ id: string; preguntaUsuario: string }[]>> {
    try {
        const preguntas = await prisma.preguntaSinRespuestaGeneral.findMany({
            where: {
                negocioId,
                estado: 'PENDIENTE_REVISION' // Solo traemos las pendientes
            },
            select: {
                id: true,
                preguntaUsuario: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return { success: true, data: preguntas };
    } catch (error) {
        console.error("Error al obtener preguntas sin respuesta:", error);
        return { success: false, error: "No se pudieron cargar las preguntas pendientes." };
    }
}