// RUTA: /actions/whatsapp/core/orchestrator.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '../../../types';
import { ProcesarMensajeWhatsAppInputSchema, type ProcesarMensajeWhatsAppInput } from '../whatsapp.schemas';

/**
 * VERSIÓN DE PRUEBA DE CONEXIÓN A BD
 * Su única responsabilidad es validar que Prisma puede conectarse
 * desde este entorno de servidor.
 */
export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<null>> {

    console.log("--- [ORCHESTRATOR - PRUEBA BD] Inicio del procesamiento ---");

    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[ORCHESTRATOR - PRUEBA BD] ERROR: La validación de Zod falló.');
        return { success: false, error: "Datos de entrada inválidos." };
    }
    console.log("[ORCHESTRATOR - PRUEBA BD] Validación de Zod EXITOSA.");


    try {
        console.log("[ORCHESTRATOR - PRUEBA BD] Intentando conectar a la base de datos con Prisma...");
        const { messageIdOriginal } = validation.data;

        const interaccionExistente = await prisma.interaccion.findFirst({
            where: { messageId: messageIdOriginal },
            select: { id: true } // Solo seleccionamos el ID para una consulta más rápida
        });

        if (interaccionExistente) {
            console.log(`[ORCHESTRATOR - PRUEBA BD] ¡ÉXITO! Conexión a BD y consulta de idempotencia correctas. Mensaje ya existe.`);
        } else {
            console.log(`[ORCHESTRATOR - PRUEBA BD] ¡ÉXITO! Conexión a BD y consulta de idempotencia correctas. Mensaje es nuevo.`);
        }

    } catch (error) {
        console.error("[ORCHESTRATOR - PRUEBA BD] ¡FALLO CRÍTICO! Error al consultar la base de datos:", error);
        return { success: false, error: "Error de conexión con la base de datos." };
    }

    return { success: true, data: null };
}
