// Ruta: app/admin/_lib/funciones/agendarCitaPresencial.actions.ts
'use server';

import { Prisma } from '@prisma/client';
import prisma from '../prismaClient'; // Ajusta la ruta si es necesario
import { ActionResult } from '../types'; // Ajusta la ruta si es necesario
import { AgendarCitaArgs, ResultadoAgendamiento } from './agendarCitaPresencial.type'; // Importar tipos

/**
 * Ejecuta la lógica para agendar una cita presencial.
 * 1. Valida argumentos.
 * 2. Actualiza el Lead con la información de contacto recopilada en jsonParams.
 * 3. Crea la cita en la tabla Agenda.
 * 4. Actualiza el estado de TareaEjecutada.
 */
export async function ejecutarAgendarCitaAction(
    argumentos: AgendarCitaArgs,
    tareaEjecutadaId: string
): Promise<ActionResult<ResultadoAgendamiento>> {
    console.log(`[Ejecución Función] Iniciando ejecutarAgendarCitaAction para TareaEjecutada ${tareaEjecutadaId}`);
    console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

    // --- Validación de Argumentos Clave ---
    // Validar los parámetros que son absolutamente necesarios para crear la cita
    if (!argumentos.fecha_hora || !argumentos.leadId) {
        console.error("[Ejecución Función] Faltan argumentos obligatorios (fecha_hora, leadId).");
        await actualizarTareaEjecutadaFallida(tareaEjecutadaId, "Faltan datos necesarios (fecha/hora, lead).");
        return { success: false, error: "Faltan datos necesarios para agendar la cita (fecha/hora, lead)." };
    }
    // Validar que al menos un método de contacto principal exista si es requerido por el negocio
    if (!argumentos.nombre_contacto || (!argumentos.email_contacto && !argumentos.telefono_contacto)) {
        console.warn("[Ejecución Función] Falta nombre o información de contacto principal.");
        // Podrías decidir si esto es un error fatal o no. Por ahora, permitiremos continuar.
        // await actualizarTareaEjecutadaFallida(tareaEjecutadaId, "Falta nombre o contacto principal.");
        // return { success: false, error: "Falta el nombre o un método de contacto (email/teléfono)." };
    }

    try {
        // --- Lógica de Negocio ---

        // 1. Parsear fecha_hora (¡Asegúrate de manejar errores de formato!)
        let fechaCita: Date;
        try {
            fechaCita = new Date(argumentos.fecha_hora);
            if (isNaN(fechaCita.getTime())) {
                throw new Error('Formato de fecha/hora inválido.');
            }
        } catch (dateError) {
            console.error("[Ejecución Función] Error al parsear fecha_hora:", argumentos.fecha_hora, dateError);
            await actualizarTareaEjecutadaFallida(tareaEjecutadaId, "Formato de fecha/hora inválido.");
            return { success: false, error: "El formato de la fecha/hora proporcionada no es válido." };
        }

        // 2. (Opcional) Verificar disponibilidad aquí si es necesario


        // 3. Actualizar el Lead con los datos recopilados
        const leadActual = await prisma.lead.findUnique({
            where: { id: argumentos.leadId },
            select: { jsonParams: true, nombre: true, email: true, telefono: true } // Seleccionar campos a actualizar y jsonParams existente
        });

        if (!leadActual) {
            await actualizarTareaEjecutadaFallida(tareaEjecutadaId, `Lead con ID ${argumentos.leadId} no encontrado.`);
            return { success: false, error: `Lead con ID ${argumentos.leadId} no encontrado.` };
        }

        // Preparar datos para actualizar (campos directos y jsonParams)
        const datosLeadUpdate: Prisma.LeadUpdateInput = {};
        const currentJsonParams = (leadActual.jsonParams && typeof leadActual.jsonParams === 'object' && !Array.isArray(leadActual.jsonParams))
            ? leadActual.jsonParams as Prisma.JsonObject
            : {};
        const nuevosJsonParams: Prisma.JsonObject = { ...currentJsonParams };

        // Actualizar campos directos si no existen o si los argumentos son diferentes
        if (argumentos.nombre_contacto && argumentos.nombre_contacto !== leadActual.nombre) {
            datosLeadUpdate.nombre = argumentos.nombre_contacto;
        }
        if (argumentos.email_contacto && argumentos.email_contacto !== leadActual.email) {
            datosLeadUpdate.email = argumentos.email_contacto;
        }
        if (argumentos.telefono_contacto && argumentos.telefono_contacto !== leadActual.telefono) {
            datosLeadUpdate.telefono = argumentos.telefono_contacto;
        }

        // Añadir/actualizar campos personalizados en jsonParams (excluyendo los ya mapeados a campos directos)
        for (const [key, value] of Object.entries(argumentos)) {
            if (value !== undefined && !['leadId', 'fecha_hora', 'nombre_contacto', 'email_contacto', 'telefono_contacto'].includes(key)) {
                nuevosJsonParams[key] = value; // Guardar otros argumentos como campos personalizados
            }
        }
        datosLeadUpdate.jsonParams = nuevosJsonParams;

        // Ejecutar actualización del Lead
        await prisma.lead.update({
            where: { id: argumentos.leadId },
            data: datosLeadUpdate,
        });
        console.log(`[Ejecución Función] Lead ${argumentos.leadId} actualizado con datos de contacto y/o jsonParams.`);


        // 4. Determinar el agenteId (usar predeterminado o buscar uno disponible)
        // TODO: Implementar lógica para asignar agente si es necesario
        const agenteIdAsignado = "agent_crm_id_placeholder"; // Reemplazar con lógica real

        // 5. Crear el registro en la tabla `Agenda`.
        const nuevaCita = await prisma.agenda.create({
            data: {
                leadId: argumentos.leadId,
                agenteId: agenteIdAsignado,
                fecha: fechaCita,
                tipo: 'Reunion Presencial', // O un tipo más dinámico
                asunto: `Cita: ${argumentos.motivo_de_reunion || 'Seguimiento'} con ${argumentos.nombre_contacto || leadActual.nombre}`,
                descripcion: `Agendada por asistente virtual. Contacto: ${argumentos.email_contacto || argumentos.telefono_contacto || 'N/A'}.`,
                status: 'pendiente',
            }
        });

        console.log(`[Ejecución Función] Cita creada con ID: ${nuevaCita.id}`);

        // 6. Actualizar TareaEjecutada como completada
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ resultado: { citaId: nuevaCita.id } }) // Guardar resultado si es útil
            }
        });

        const resultado: ResultadoAgendamiento = {
            citaId: nuevaCita.id,
            fechaConfirmada: nuevaCita.fecha,
            mensajeConfirmacion: `¡Listo ${argumentos.nombre_contacto || leadActual.nombre}! Tu cita ha sido agendada para el ${nuevaCita.fecha.toLocaleDateString()} a las ${nuevaCita.fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        };

        return { success: true, data: resultado };

    } catch (error) {
        console.error("[Ejecución Función] Error al ejecutar agendarCitaPresencial:", error);
        await actualizarTareaEjecutadaFallida(tareaEjecutadaId, error instanceof Error ? error.message : "Error desconocido al agendar");
        return { success: false, error: error instanceof Error ? error.message : "Error interno al agendar la cita." };
    }
}

// Función auxiliar para marcar la tarea como fallida
async function actualizarTareaEjecutadaFallida(tareaEjecutadaId: string, mensajeError: string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                // status: 'FALLIDO', // Si tuvieras un campo status
                metadata: JSON.stringify({ error: mensajeError })
            }
        });
    } catch (updateError) {
        console.error(`[Ejecución Función] Error al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}
