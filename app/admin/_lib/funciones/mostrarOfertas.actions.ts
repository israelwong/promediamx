// Ruta: app/admin/_lib/funciones/mostrarOfertas.actions.ts
'use server';

import prisma from '../prismaClient'; // Ajusta la ruta a tu prismaClient
import { ActionResult } from '../types'; // Ajusta la ruta a tus tipos globales
import { MostrarOfertasArgs, MostrarOfertasData, OfertaResumen } from './mostrarOfertas.schemas';

// --- Implementación de la función auxiliar (si no está global) ---
async function actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId: string, mensajeError: string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ error: `Error en mostrarOfertas: ${mensajeError}` })
            }
        });
    } catch (updateError) {
        console.error(`[mostrarOfertas] Error al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}

export async function ejecutarMostrarOfertasAction(
    argumentos: MostrarOfertasArgs,
    tareaEjecutadaId: string
): Promise<ActionResult<MostrarOfertasData>> {

    console.log(`[Ejecución Función] Iniciando ejecutarMostrarOfertasAction para TareaEjecutada ${tareaEjecutadaId}`);
    console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

    if (!argumentos.negocioId) {
        console.error("[Ejecución Función] Falta argumento negocioId.");
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta el ID del negocio.");
        return { success: false, error: "Falta el ID del negocio." };
    }

    try {
        // 1. Consultar ofertas activas y vigentes del negocio
        const ahora = new Date();
        const ofertasDb = await prisma.oferta.findMany({
            where: {
                negocioId: argumentos.negocioId,
                status: 'activo', // Solo ofertas activas
                fechaInicio: { lte: ahora }, // Que ya hayan comenzado
                fechaFin: { gte: ahora },    // Y que no hayan terminado
            },
            select: {
                id: true,
                nombre: true,
                // descripcion: true, // Podrías seleccionar una descripción corta si la tienes
                // tipoOferta: true,
            },
            orderBy: {
                // Podrías añadir un campo 'orden' o priorizar por fecha de creación/fin
                fechaFin: 'asc', // Ejemplo: mostrar primero las que terminan pronto
            },
            take: 10 // Limitar la cantidad de ofertas a mostrar inicialmente
        });

        const ofertasEncontradas: OfertaResumen[] = ofertasDb.map(o => ({
            id: o.id,
            nombre: o.nombre,
            // descripcion: o.descripcion?.substring(0, 50) + "..." // Ejemplo si tuvieras descripción corta
        }));

        // 2. Construir el mensaje de respuesta según la Tarea.instruccionParaIA
        let mensajeRespuesta = "";
        if (ofertasEncontradas.length === 0) {
            mensajeRespuesta = "Lo siento, parece que no tenemos ofertas o promociones activas en este momento. ¡Vuelve a consultarnos pronto!";
        } else if (ofertasEncontradas.length === 1) {
            mensajeRespuesta = `¡Tenemos una oferta especial para ti! Se llama "${ofertasEncontradas[0].nombre}". ¿Te gustaría saber más detalles?`;
        } else {
            const nombresOfertas = ofertasEncontradas.map(o => `"${o.nombre}"`).join(', ');
            mensajeRespuesta = `¡Buenas noticias! Tenemos ${ofertasEncontradas.length} ofertas especiales disponibles: ${nombresOfertas}. ¿Te gustaría conocer los detalles de alguna de ellas?`;
        }

        // 3. Actualizar TareaEjecutada
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ resultado: { count: ofertasEncontradas.length, ids: ofertasEncontradas.map(o => o.id) } })
            }
        }).catch(updateError => console.error("[mostrarOfertas] Error al actualizar TareaEjecutada:", updateError));

        // 4. Preparar datos de retorno
        const resultado: MostrarOfertasData = {
            ofertasEncontradas: ofertasEncontradas,
            mensajeRespuesta: mensajeRespuesta
        };

        console.log(`[Ejecución Función] Ofertas encontradas para ${argumentos.negocioId}: ${ofertasEncontradas.length}`);
        return { success: true, data: resultado };

    } catch (error) {
        console.error("[Ejecución Función] Error al obtener ofertas:", error);
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, error instanceof Error ? error.message : "Error desconocido al obtener ofertas.");
        return { success: false, error: error instanceof Error ? error.message : "Error interno al obtener las ofertas." };
    }
}