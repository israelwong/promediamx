// Ruta: app/admin/_lib/funciones/informarHorarioDeAtencion.actions.ts
'use server';

// import { Prisma } from '@prisma/client';
import prisma from '../prismaClient'; // Ajusta la ruta si es necesario
import { ActionResult } from '../types'; // Ajusta la ruta si es necesario
import { InformarHorarioArgs, InformarHorarioData } from './informarHorarioDeAtencion.type';

/**
 * Ejecuta la lógica para obtener y formatear el horario de atención del negocio.
 */
export async function ejecutarInformarHorarioAction(
    argumentos: InformarHorarioArgs,
    tareaEjecutadaId: string // ID para actualizar el registro si es necesario
): Promise<ActionResult<InformarHorarioData>> {
    console.log(`[Ejecución Función] Iniciando ejecutarInformarHorarioAction para TareaEjecutada ${tareaEjecutadaId}`);
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
                horarioAtencion: true,
            }
        });

        if (!negocio) {
            return { success: false, error: `Negocio con ID ${argumentos.negocioId} no encontrado.` };
        }

        let respuesta = `No tenemos registrado un horario de atención para ${negocio.nombre}.`;

        if (negocio.horarioAtencion) {
            // Lógica simple: devolver el texto almacenado.
            // Podrías añadir lógica más compleja aquí para interpretar el texto del horario,
            // verificar si está abierto ahora, o formatear para un día específico.
            respuesta = `Nuestro horario de atención es: ${negocio.horarioAtencion}`;

            // Ejemplo (muy básico) para verificar si está abierto (requiere parseo robusto del string horarioAtencion)
            // if (argumentos.verificarAbiertoAhora) {
            //    const ahora = new Date();
            //    const diaActual = ahora.getDay(); // 0=Domingo, 1=Lunes...
            //    const horaActual = ahora.getHours();
            //    // ... Lógica para parsear negocio.horarioAtencion y comparar ...
            //    // if (estaAbierto) {
            //    //     respuesta = `Sí, estamos abiertos ahora. Nuestro horario es: ${negocio.horarioAtencion}`;
            //    // } else {
            //    //     respuesta = `No, ahora estamos cerrados. Nuestro horario es: ${negocio.horarioAtencion}`;
            //    // }
            // }
        }

        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: null } // Opcional: Actualizar estado/metadata
        }).catch(updateError => console.error("Error al actualizar TareaEjecutada:", updateError));

        return { success: true, data: { respuestaHorario: respuesta } };

    } catch (error) {
        console.error("[Ejecución Función] Error al obtener horario de atención:", error);
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }) }
        }).catch(updateError => console.error("Error al actualizar TareaEjecutada como fallida:", updateError));
        return { success: false, error: error instanceof Error ? error.message : "Error interno al obtener el horario." };
    }
}
