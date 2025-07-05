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

    const { id, preguntaFormulada, ...restOfData } = validation.data;

    try {
        // 1. Generar el embedding a partir del título/pregunta del ítem.
        console.log(`[ACCIÓN CONOCIMIENTO] Generando embedding para: "${preguntaFormulada}"`);
        const vector = await getEmbeddingForText(preguntaFormulada);

        if (!vector) {
            throw new Error("No se pudo generar el embedding para la pregunta. El registro no se guardará.");
        }

        // 2. Preparamos los datos a guardar, incluyendo el vector.
        const dataToSave = {
            ...restOfData,
            preguntaFormulada,
            embeddingPregunta: vector, // Guardamos el vector en la BD
        };

        // 3. Decidimos si crear o actualizar.
        if (id) {
            await prisma.negocioConocimientoItem.update({
                where: { id },
                data: dataToSave,
            });
            console.log(`[ACCIÓN CONOCIMIENTO] Item ${id} actualizado con su nuevo embedding.`);
        } else {
            await prisma.negocioConocimientoItem.create({
                data: dataToSave,
            });
            console.log(`[ACCIÓN CONOCIMIENTO] Nuevo item creado con su embedding.`);
        }

        revalidatePath('/admin/conocimiento'); // Asegúrate que esta ruta sea correcta
        return { success: true, message: "Ítem de conocimiento guardado exitosamente." };

    } catch (error) {
        console.error("[ACCIÓN CONOCIMIENTO] Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido al guardar el ítem." };
    }
}


// --- TUS FUNCIONES EXISTENTES DE LECTURA Y BORRADO (SE MANTIENEN IGUAL) ---

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