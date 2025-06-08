// Ruta sugerida: app/admin/_lib/funciones/listarServiciosAgenda.actions.ts
'use server';

import prisma from '../../../prismaClient'; // Tu cliente Prisma
import { ActionResult } from '../../../types'; // Asumo que tienes este tipo genérico
import {
    ListarServiciosAgendaArgs,
    ListarServiciosAgendaData,
    ServicioAgendaInfo
} from './listarServiciosAgenda.schemas'; // Importa tus tipos
// No necesitamos otros tipos de Prisma aquí a menos que los uses en la lógica de formateo

/**
 * Función para obtener y listar los servicios de agenda disponibles para un negocio.
 */
export async function ejecutarListarServiciosAgendaAction(
    argumentos: ListarServiciosAgendaArgs,
    tareaEjecutadaId: string // Si necesitas loguear o actualizar el estado de la tarea
): Promise<ActionResult<ListarServiciosAgendaData>> {
    console.log(`[ejecutarListarServiciosAgendaAction] Iniciando para TareaID: ${tareaEjecutadaId}, NegocioID: ${argumentos.negocioId}`);

    if (!argumentos.negocioId) {
        const errorMsg = "Error interno: Falta negocioId para listar los servicios.";
        console.error(`[ejecutarListarServiciosAgendaAction] ${errorMsg}`);
        // Aquí podrías llamar a tu función 'actualizarTareaEjecutadaFallidaDispatcher' si la tienes
        // await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, errorMsg);
        return {
            success: false, // Indica un fallo en la ejecución de la acción
            error: errorMsg,
            data: { // Aunque falle, podemos dar una estructura de datos con mensaje de error
                servicios: [],
                mensajeParaUsuario: "Lo siento, no pude obtener la lista de servicios en este momento debido a un problema interno."
            }
        };
    }

    try {
        const serviciosDisponibles = await prisma.agendaTipoCita.findMany({
            where: {
                negocioId: argumentos.negocioId,
                activo: true, // Solo listar servicios activos
            },
            select: {
                nombre: true,
                descripcion: true,
                // duracionMinutos: true, // Podrías incluirlo si quieres mostrarlo
            },
            orderBy: {
                nombre: 'asc', // Ordenar alfabéticamente para consistencia
            }
        });

        if (serviciosDisponibles.length === 0) {
            const mensaje = "Actualmente no tenemos servicios específicos listados para agendar. ¿Hay algo más en lo que pueda ayudarte?";
            console.log(`[ejecutarListarServiciosAgendaAction] No se encontraron servicios activos para el negocio ${argumentos.negocioId}`);
            return {
                success: true, // La acción se ejecutó, pero no hay servicios
                data: {
                    servicios: [],
                    mensajeParaUsuario: mensaje,
                }
            };
        }

        // Formatear los servicios para la interfaz ListarServiciosAgendaData
        const serviciosInfo: ServicioAgendaInfo[] = serviciosDisponibles.map(s => ({
            nombre: s.nombre,
            descripcion: s.descripcion,
        }));

        // Construir el mensaje para el usuario
        let mensajeParaUsuario = "Claro, estos son los servicios que ofrecemos para agendar:\n";
        serviciosInfo.forEach(servicio => {
            mensajeParaUsuario += `\n- **${servicio.nombre}**`;
            if (servicio.descripcion) {
                // mensajeParaUsuario += `: ${servicio.descripcion}`; // Podrías añadir descripción si es corta
            }
        });
        mensajeParaUsuario += "\n\n¿Cuál de estos servicios te gustaría agendar?";

        console.log(`[ejecutarListarServiciosAgendaAction] Servicios encontrados para ${argumentos.negocioId}: ${serviciosInfo.length}`);
        return {
            success: true,
            data: {
                servicios: serviciosInfo,
                mensajeParaUsuario: mensajeParaUsuario,
            }
        };

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`[ejecutarListarServiciosAgendaAction] Error al obtener servicios para negocio ${argumentos.negocioId}:`, error);
            return {
                success: false,
                error: error.message || "Error de base de datos al listar servicios.",
                data: {
                    servicios: [],
                    mensajeParaUsuario: "Lo siento, tuve problemas para obtener la lista de servicios. Por favor, intenta más tarde."
                }
            };
        } else {
            console.error(`[ejecutarListarServiciosAgendaAction] Error desconocido:`, error);
            return {
                success: false,
                error: "Error desconocido al listar servicios.",
                data: {
                    servicios: [],
                    mensajeParaUsuario: "Lo siento, ocurrió un error inesperado. Por favor, intenta más tarde."
                }
            };
        }

    }
}
