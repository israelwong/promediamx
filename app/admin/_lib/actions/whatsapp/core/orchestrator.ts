// RUTA: /actions/whatsapp/core/orchestrator.ts

'use server';

// ❌ SE HAN ELIMINADO TODAS LAS IMPORTACIONES PROBLEMÁTICAS (PRISMA, HANDLERS, ETC.)

import type { ActionResult } from '../../../types';
// Solo importamos los tipos y el schema, que no ejecutan código.
import { ProcesarMensajeWhatsAppInputSchema, type ProcesarMensajeWhatsAppInput } from '../whatsapp.schemas';

/**
 * VERSIÓN DE DIAGNÓSTICO FINAL: "PRUEBA DE AISLAMIENTO"
 * Esta función no hace NADA excepto validar que puede ser llamada.
 * Si esto funciona, el problema es la importación de Prisma.
 */
export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<null>> {

    console.log("--- [DIAGNÓSTICO FINAL] ¡ÉXITO! La acción del orquestador fue invocada. ---");

    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[DIAGNÓSTICO FINAL] La validación de Zod falló, lo cual es inesperado.');
        return { success: false, error: "Datos de entrada inválidos." };
    }

    console.log("[DIAGNÓSTICO FINAL] La validación de Zod funcionó. El problema está en una de las importaciones eliminadas (probablemente Prisma).");

    return { success: true, data: null };
}
