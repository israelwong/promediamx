// @/app/admin/_lib/actions/negocio/negocio.actions.ts
'use server';
import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client'; // Tipo Negocio vendrá de aquí directamente
import { revalidatePath } from 'next/cache';


// Importar esquemas y tipos Zod
import {
    ActualizarDetallesNegocioDataSchema,
} from './negocio.schemas';
import type { Negocio as PrismaNegocioType } from '@prisma/client'; // Para claridad

// ... (otras acciones como crearNegocio, obtenerNegocios, etc., pueden refactorizarse después)

// --- ACCIÓN PARA OBTENER DATOS COMPLETOS DEL NEGOCIO ---
export async function obtenerDetallesNegocioParaEditar(negocioId: string): Promise<PrismaNegocioType | null> {
    if (!negocioId) {
        console.warn("obtenerDetallesNegocioParaEditar: negocioId no proporcionado.");
        return null;
    }
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
        });
        return negocio;
    } catch (error) {
        console.error(`Error obteniendo detalles del negocio ${negocioId}:`, error);
        // En producción, podrías querer lanzar el error o devolver un objeto error estandarizado.
        return null;
    }
}

// --- ACCIÓN PARA ACTUALIZAR DETALLES DEL NEGOCIO (REFACTORIZADA CON ZOD) ---
export async function actualizarDetallesNegocio(
    negocioId: string,
    data: unknown // Recibimos 'unknown' para forzar la validación Zod
): Promise<ActionResult<void>> { // Típicamente ActionResult<void> si no hay datos específicos que devolver
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };

    const validationResult = ActualizarDetallesNegocioDataSchema.safeParse(data);

    if (!validationResult.success) {
        console.error("Error de validación en actualizarDetallesNegocio:", validationResult.error.flatten());
        return {
            success: false,
            error: "Datos inválidos.",
        };
    }

    // Los datos validados y tipados ahora están en validationResult.data
    const validData = validationResult.data;

    try {
        const negocioActualizado = await prisma.negocio.update({
            where: { id: negocioId },
            // Usamos validData que ya tiene la forma correcta y los tipos correctos
            data: validData,
            select: { clienteId: true } // Para revalidación
        });

        // Revalidar rutas
        const basePath = negocioActualizado.clienteId
            ? `/admin/clientes/${negocioActualizado.clienteId}/negocios/${negocioId}`
            : `/admin/negocios/${negocioId}`; // Esta ruta quizás no exista o sea diferente
        revalidatePath(basePath); // Dashboard negocio (ruta base)
        revalidatePath(`${basePath}/editar`); // Página de edición

        return { success: true };
    } catch (error) {
        console.error(`Error actualizando negocio ${negocioId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Negocio no encontrado para actualizar." };
        }
        return { success: false, error: "No se pudo actualizar la información del negocio." };
    }
}





