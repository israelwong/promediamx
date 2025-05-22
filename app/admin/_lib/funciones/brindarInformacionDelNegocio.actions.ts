// Ruta: app/admin/_lib/funciones/brindarInformacionDelNegocio.actions.ts
'use server';

import prisma from '../prismaClient';
import { ActionResult } from '../types';
import { BrindarInfoArgs, BrindarInfoData } from './brindarInformacionDelNegocio.schemas';

/**
 * Ejecuta la lógica para obtener y formatear información general del negocio.
 */
export async function ejecutarBrindarInfoNegocioAction(
    argumentos: BrindarInfoArgs,
    tareaEjecutadaId: string
): Promise<ActionResult<BrindarInfoData>> {
    console.log(`[Ejecución Función] Iniciando ejecutarBrindarInfoNegocioAction para TareaEjecutada ${tareaEjecutadaId}`);
    console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

    if (!argumentos.negocioId) {
        console.error("[Ejecución Función] Falta argumento negocioId.");
        return { success: false, error: "Falta el ID del negocio." };
    }

    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: argumentos.negocioId },
            select: {
                nombre: true,
                descripcion: true,
                slogan: true,
            }
        });

        if (!negocio) {
            return { success: false, error: `Negocio con ID ${argumentos.negocioId} no encontrado.` };
        }

        let info = `Sobre ${negocio.nombre}: `;
        if (negocio.slogan) info += `${negocio.slogan}. `;
        if (negocio.descripcion) info += `${negocio.descripcion}`;
        else info += `Somos un negocio dedicado a ofrecer excelentes productos/servicios.`; // Fallback

        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: null } // Opcional: Actualizar estado/metadata
        }).catch(updateError => console.error("Error al actualizar TareaEjecutada:", updateError));


        return { success: true, data: { informacionEncontrada: info } };

    } catch (error) {
        console.error("[Ejecución Función] Error al obtener información del negocio:", error);
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }) }
        }).catch(updateError => console.error("Error al actualizar TareaEjecutada como fallida:", updateError));
        return { success: false, error: error instanceof Error ? error.message : "Error interno al obtener información del negocio." };
    }
}
