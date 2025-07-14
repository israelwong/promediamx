// RUTA: /actions/whatsapp/core/orchestrator.ts

'use server';

// ✅ PASO 1: Reintroducimos la importación de Prisma.
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '../../../types';
import { ProcesarMensajeWhatsAppInputSchema, type ProcesarMensajeWhatsAppInput } from '../whatsapp.schemas';

/**
 * VERSIÓN DE DIAGNÓSTICO: "PRUEBA DE CONEXIÓN A PRISMA"
 * Esta función valida si la importación y una consulta simple a Prisma funcionan.
 */
export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<null>> {

    console.log("--- [DIAGNÓSTICO PRISMA] Inicio del procesamiento ---");

    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[DIAGNÓSTICO PRISMA] La validación de Zod falló.');
        return { success: false, error: "Datos de entrada inválidos." };
    }
    console.log("[DIAGNÓSTICO PRISMA] Validación de Zod EXITOSA.");

    // ✅ PASO 2: Intentamos una consulta simple para probar la conexión.
    try {
        console.log("[DIAGNÓSTICO PRISMA] Intentando consultar la base de datos con Prisma...");
        const { messageIdOriginal } = validation.data;

        const interaccionExistente = await prisma.interaccion.findFirst({
            where: { messageId: messageIdOriginal },
            select: { id: true } // Solo seleccionamos el ID para una consulta rápida
        });

        if (interaccionExistente) {
            console.log(`[DIAGNÓSTICO PRISMA] ¡ÉXITO! Conexión a BD y consulta de idempotencia correctas. Mensaje ya existe.`);
        } else {
            console.log(`[DIAGNÓSTICO PRISMA] ¡ÉXITO! Conexión a BD y consulta de idempotencia correctas. Mensaje es nuevo.`);
        }

    } catch (error) {
        console.error("[DIAGNÓSTICO PRISMA] ¡FALLO CRÍTICO! Error al consultar la base de datos:", error);
        return { success: false, error: "Error de conexión con la base de datos." };
    }

    return { success: true, data: null };
}
