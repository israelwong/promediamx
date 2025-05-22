// Ruta: app/admin/_lib/funciones/darDireccionYUbicacion.actions.ts
'use server';

import prisma from '../prismaClient'; // Ajusta la ruta a tu prismaClient
import { ActionResult } from '../types'; // Ajusta la ruta a tus tipos globales
import { DarDireccionArgs, DarDireccionData } from './darDireccionYUbicacion.schemas'; // Importa los tipos específicos

// Importar función auxiliar para actualizar TareaEjecutada en caso de error (si la tienes separada)
// import { actualizarTareaEjecutadaFallida } from './utils/tareaUtils'; // Ejemplo de ruta

// --- Implementación de la función auxiliar (si no está global) ---
async function actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId: string, mensajeError: string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ error: `Error en darDireccionYUbicacion: ${mensajeError}` })
            }
        });
    } catch (updateError) {
        console.error(`[darDireccionYUbicacion] Error al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}
// --- Fin función auxiliar ---

/**
 * Ejecuta la lógica para obtener la dirección y ubicación de un negocio.
 * Consulta la base de datos por el negocioId, recupera los campos
 * 'direccion' y 'googleMaps', y formatea una respuesta para el usuario.
 */
export async function ejecutarDarDireccionAction(
    argumentos: DarDireccionArgs,
    tareaEjecutadaId: string // ID para actualizar el registro
): Promise<ActionResult<DarDireccionData>> {
    console.log(`[Ejecución Función] Iniciando ejecutarDarDireccionAction para TareaEjecutada ${tareaEjecutadaId}`);
    console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

    if (!argumentos.negocioId) {
        console.error("[Ejecución Función] Falta argumento negocioId.");
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta el ID del negocio.");
        return { success: false, error: "Falta el ID del negocio." };
    }

    try {
        // 1. Consultar la base de datos
        const negocio = await prisma.negocio.findUnique({
            where: { id: argumentos.negocioId },
            select: {
                nombre: true,       // Para personalizar la respuesta
                direccion: true,    // Campo a consultar
                googleMaps: true    // Campo a consultar (asumiendo que se llama así en tu schema)
            }
        });

        if (!negocio) {
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Negocio con ID ${argumentos.negocioId} no encontrado.`);
            return { success: false, error: `Negocio con ID ${argumentos.negocioId} no encontrado.` };
        }

        // 2. Preparar los datos y el mensaje de respuesta
        const direccion = negocio.direccion;
        // Asegurarnos que el campo googleMaps es el correcto según tu schema.prisma
        const googleMapsUrl = negocio.googleMaps;

        let mensajeRespuesta = "";

        if (direccion && googleMapsUrl) {
            mensajeRespuesta = `¡Claro! Nuestra dirección es: ${direccion}. Puedes encontrarnos fácilmente en Google Maps aquí: ${googleMapsUrl}`;
        } else if (direccion) {
            mensajeRespuesta = `Nuestra dirección es: ${direccion}.`;
        } else if (googleMapsUrl) {
            mensajeRespuesta = `Puedes ver nuestra ubicación en Google Maps aquí: ${googleMapsUrl}`;
        } else {
            mensajeRespuesta = `Lo siento, parece que no tenemos registrada nuestra dirección o ubicación en este momento. Te recomiendo contactar directamente con ${negocio.nombre} para obtenerla.`;
            // Considerar esto un éxito parcial o un error dependiendo de la expectativa
            console.warn(`[Ejecución Función] No se encontró dirección ni URL de Google Maps para Negocio ${argumentos.negocioId}.`);
            // Podríamos devolver success: true pero con un mensaje indicando la falta de datos
        }

        // 3. Actualizar TareaEjecutada (opcional, marcar como completada)
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ resultado: { direccion, googleMapsUrl } }) // Guardar resultado
            }
        }).catch(updateError => console.error("[darDireccionYUbicacion] Error al actualizar TareaEjecutada:", updateError));

        // 4. Preparar datos de retorno
        const resultado: DarDireccionData = {
            direccionEncontrada: direccion,
            googleMapsUrl: googleMapsUrl,
            mensajeRespuesta: mensajeRespuesta
        };

        console.log(`[Ejecución Función] Dirección encontrada para ${argumentos.negocioId}:`, resultado);
        return { success: true, data: resultado };

    } catch (error) {
        console.error("[Ejecución Función] Error al obtener dirección y ubicación:", error);
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, error instanceof Error ? error.message : "Error desconocido al obtener dirección.");
        return { success: false, error: error instanceof Error ? error.message : "Error interno al obtener la dirección." };
    }
}