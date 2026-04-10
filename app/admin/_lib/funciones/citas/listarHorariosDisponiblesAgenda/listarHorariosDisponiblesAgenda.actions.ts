'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { ListarHorariosDisponiblesArgsSchema } from './listarHorariosDisponiblesAgenda.schemas';
// import { ConfiguracionAgendaDelNegocio } from '../agendarCita/agendarCita.schemas';
import { parsearFechaHoraInteligente } from '../agendarCita/agendarCita.helpers';
import { DiaSemana } from '@prisma/client';
import { format, startOfDay, addMinutes, setHours, setMinutes, isBefore, isAfter, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

const MAX_HORARIOS_A_SUGERIR = 5;
const INCREMENTO_MINUTOS_BUSQUEDA = 30;

/**
 * Función refactorizada para listar horarios disponibles.
 * Sigue el patrón FunctionExecutor para integrarse con el dispatcher.
 */
export const ejecutarListarHorariosDisponiblesAction: FunctionExecutor = async (argsFromIA, context) => {

    // 1. Validar argumentos de la IA con nuestro nuevo schema.
    const validationResult = ListarHorariosDisponiblesArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        return {
            success: true, // Error manejable, no del sistema.
            data: {
                content: "Para poder ayudarte, necesito saber para qué servicio y en qué fecha estás buscando horarios.",
                aiContextData: { status: 'VALIDATION_ERROR', error: validationResult.error.flatten() }
            }
        };
    }
    const { servicio_nombre, fecha_deseada } = validationResult.data;

    try {
        // 2. Obtener la configuración de la agenda del negocio desde el contexto.
        const config = await prisma.agendaConfiguracion.findUnique({ where: { negocioId: context.negocioId } });
        if (!config) {
            return { success: false, error: `Configuración de agenda no encontrada para negocio ${context.negocioId}.` };
        }

        const tipoCita = await prisma.agendaTipoCita.findFirst({
            where: {
                nombre: { equals: servicio_nombre, mode: 'insensitive' },
                negocioId: context.negocioId,
                activo: true,
            },
        });
        if (!tipoCita || !tipoCita.duracionMinutos) {
            return { success: true, data: { content: `No encontré el servicio "${servicio_nombre}" o no tiene una duración definida.` } };
        }

        const fechaDeseadaParseada = await parsearFechaHoraInteligente(fecha_deseada, { permitirSoloFecha: true });
        if (!fechaDeseadaParseada) {
            return { success: true, data: { content: `No entendí la fecha "${fecha_deseada}". ¿Podrías intentarlo de nuevo?` } };
        }

        // --- INICIO DE LA CORRECCIÓN ---
        // Creamos un mapa explícito para convertir el número del día al enum de Prisma.
        const mapDiaNumeroAEnum: DiaSemana[] = [
            DiaSemana.DOMINGO, DiaSemana.LUNES, DiaSemana.MARTES,
            DiaSemana.MIERCOLES, DiaSemana.JUEVES, DiaSemana.VIERNES, DiaSemana.SABADO
        ];

        const inicioDelDia = startOfDay(fechaDeseadaParseada);
        const numeroDelDia = getDay(inicioDelDia); // Obtiene el número del día (0-6)
        const diaSemanaEnum = mapDiaNumeroAEnum[numeroDelDia]; // Obtiene el valor del enum correcto.
        // --- FIN DE LA CORRECCIÓN ---

        const horarioSemanal = await prisma.horarioAtencion.findUnique({
            where: { negocioId_dia: { negocioId: context.negocioId, dia: diaSemanaEnum } }
        });
        const excepcion = await prisma.excepcionHorario.findUnique({ where: { negocioId_fecha: { negocioId: context.negocioId, fecha: inicioDelDia } } });

        if (excepcion?.esDiaNoLaborable) {
            return { success: true, data: { content: `El ${format(inicioDelDia, "EEEE d 'de' MMMM", { locale: es })} es un día no laborable.` } };
        }
        const horaInicioStr = excepcion?.horaInicio || horarioSemanal?.horaInicio;
        const horaFinStr = excepcion?.horaFin || horarioSemanal?.horaFin;
        if (!horaInicioStr || !horaFinStr) {
            return { success: true, data: { content: `No tenemos un horario configurado para los ${format(inicioDelDia, "EEEE", { locale: es })}.` } };
        }

        const [hIni, mIni] = horaInicioStr.split(':').map(Number);
        const [hFin, mFin] = horaFinStr.split(':').map(Number);
        let slotActual = setHours(setMinutes(inicioDelDia, mIni), hIni);
        const finDeJornada = setHours(setMinutes(inicioDelDia, mFin), hFin);
        const ahora = new Date();

        const citasExistentes = await prisma.agenda.findMany({
            where: {
                negocioId: context.negocioId,
                fecha: { gte: inicioDelDia, lt: addMinutes(inicioDelDia, 24 * 60) },
                status: { notIn: ['CANCELADA', 'COMPLETADA', 'NO_ASISTIO'] }
            },
            select: { fecha: true, tipoDeCita: { select: { duracionMinutos: true } } }
        });

        // Versión simplificada para calcular horarios ocupados
        const horariosOcupados = new Set<number>();
        citasExistentes.forEach(cita => {
            const inicio = cita.fecha.getTime();
            const fin = addMinutes(inicio, cita.tipoDeCita?.duracionMinutos ?? 60).getTime();
            // Marcamos los intervalos de 30 mins que la cita ocupa
            for (let t = inicio; t < fin; t += INCREMENTO_MINUTOS_BUSQUEDA * 60000) {
                horariosOcupados.add(t);
            }
        });

        const slotsDisponibles: Date[] = [];
        while (isBefore(slotActual, finDeJornada) && slotsDisponibles.length < MAX_HORARIOS_A_SUGERIR) {
            if (isBefore(slotActual, ahora)) {
                slotActual = addMinutes(slotActual, INCREMENTO_MINUTOS_BUSQUEDA);
                continue;
            }

            // Verificar si el slot actual está ocupado
            if (!horariosOcupados.has(slotActual.getTime())) {
                const finServicioSlot = addMinutes(slotActual, tipoCita.duracionMinutos ?? 60);
                if (!isAfter(finServicioSlot, finDeJornada)) {
                    slotsDisponibles.push(new Date(slotActual.getTime()));
                }
            }
            slotActual = addMinutes(slotActual, INCREMENTO_MINUTOS_BUSQUEDA);
        }

        const fechaFormateada = format(inicioDelDia, "EEEE d 'de' MMMM", { locale: es });
        if (slotsDisponibles.length === 0) {
            const mensaje = `Lo siento, para "${tipoCita.nombre}" el ${fechaFormateada} no encontré horarios disponibles. ¿Te gustaría que busque en otra fecha?`;
            return { success: true, data: { content: mensaje } };
        }

        const horariosFormateados = slotsDisponibles.map(h => format(h, "h:mm aa", { locale: es }));
        const mensajeParaUsuario = `Para "${tipoCita.nombre}" el ${fechaFormateada}, tengo estos horarios disponibles: ${horariosFormateados.join(', ')}. ¿Alguno te funciona?`;

        return {
            success: true,
            data: {
                content: mensajeParaUsuario,
                uiComponentPayload: { componentType: 'time-slot-selector', slots: horariosFormateados, serviceName: tipoCita.nombre },
                aiContextData: { status: 'SLOTS_PROVIDED', slots: horariosFormateados, serviceName: tipoCita.nombre }
            }
        };

    } catch (error) {
        console.error(`[ejecutarListarHorariosDisponiblesAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido al listar horarios." };
    }
};