// Ruta sugerida: app/admin/_lib/funciones/listarHorariosDisponiblesAgenda.actions.ts
'use server';

import prisma from '../prismaClient'; // Tu cliente Prisma
import { ActionResult } from '../types'; // Asumo que tienes este tipo genérico

import { ListarHorariosDisponiblesArgs, ListarHorariosDisponiblesData } from './listarHorariosDisponiblesAgenda.schemas';
import { ConfiguracionAgendaDelNegocio } from './agendarCita.schemas'; // Necesitaremos la config del negocio
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.actions'; // Reutilizamos el verificador de slot

import { DiaSemana } from '@prisma/client'; // Tipos de Prisma

import {
    format,
    startOfDay,
    addMinutes,
    setHours,
    setMinutes,
    isBefore,
    isAfter,
    getDay as dateFnsGetDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

const MAX_HORARIOS_A_SUGERIR = 5; // Número máximo de horarios a mostrar
const INCREMENTO_MINUTOS_BUSQUEDA = 30; // Buscar disponibilidad cada 30 minutos

/**
 * Función para listar horarios disponibles para un servicio en una fecha dada.
 */
export async function ejecutarListarHorariosDisponiblesAction(
    argumentos: ListarHorariosDisponiblesArgs,
    tareaEjecutadaId: string,
    configAgenda: ConfiguracionAgendaDelNegocio
): Promise<ActionResult<ListarHorariosDisponiblesData>> {
    console.log(`[ejecutarListarHorariosDisponiblesAction] Iniciando para TareaID: ${tareaEjecutadaId}, Args: ${JSON.stringify(argumentos)}`);

    if (!argumentos.negocioId || !argumentos.servicio_nombre_interes || !argumentos.fecha_deseada) {
        const errorMsg = "Error interno: Faltan negocioId, servicio_nombre_interes o fecha_deseada para listar horarios.";
        console.error(`[ejecutarListarHorariosDisponiblesAction] ${errorMsg}`);
        return {
            success: false,
            error: errorMsg,
            data: {
                horariosDisponibles: [],
                mensajeParaUsuario: "Lo siento, necesito más información para buscar los horarios. ¿Para qué servicio y fecha te gustaría?",
                servicioConsultado: argumentos.servicio_nombre_interes || "Desconocido",
                fechaConsultada: argumentos.fecha_deseada || "Desconocida"
            }
        };
    }

    try {
        const agendaTipoCita = await prisma.agendaTipoCita.findFirst({
            where: {
                nombre: { equals: argumentos.servicio_nombre_interes, mode: 'insensitive' },
                negocioId: argumentos.negocioId,
                activo: true,
            },
        });

        if (!agendaTipoCita) {
            const mensaje = `Lo siento, no pude encontrar el servicio "${argumentos.servicio_nombre_interes}". ¿Es correcto el nombre?`;
            return { success: true, data: { horariosDisponibles: [], mensajeParaUsuario: mensaje, servicioConsultado: argumentos.servicio_nombre_interes, fechaConsultada: argumentos.fecha_deseada } };
        }
        console.log(`[ejecutarListarHorariosDisponiblesAction] Buscando servicio "${agendaTipoCita.nombre}" para el negocio ${argumentos.negocioId}`);

        // MODIFICADO: Llamar a parsearFechaHoraInteligente con la opción de permitir solo fecha
        const fechaDeseadaParseadaObj = await parsearFechaHoraInteligente(argumentos.fecha_deseada, { permitirSoloFecha: true });

        if (!fechaDeseadaParseadaObj) {
            const mensaje = `No entendí la fecha "${argumentos.fecha_deseada}". ¿Podrías intentarlo de nuevo con un formato como "mañana", "próximo lunes" o "15 de junio"?`;
            return { success: true, data: { horariosDisponibles: [], mensajeParaUsuario: mensaje, servicioConsultado: agendaTipoCita.nombre, fechaConsultada: argumentos.fecha_deseada } };
        }
        // Nos aseguramos de trabajar con el inicio del día para la búsqueda de slots.
        const inicioDelDiaConsultado = startOfDay(fechaDeseadaParseadaObj);
        const fechaFormateada = format(inicioDelDiaConsultado, "EEEE d 'de' MMMM", { locale: es });
        console.log(`[ejecutarListarHorariosDisponiblesAction] Fecha parseada para búsqueda: ${format(inicioDelDiaConsultado, "yyyy-MM-dd")}`);


        const horariosEncontrados: Date[] = [];
        const diaDeLaSemanaISO = dateFnsGetDay(inicioDelDiaConsultado);
        const mapDiaISOaEnum: { [key: number]: DiaSemana } = { 0: DiaSemana.DOMINGO, 1: DiaSemana.LUNES, 2: DiaSemana.MARTES, 3: DiaSemana.MIERCOLES, 4: DiaSemana.JUEVES, 5: DiaSemana.VIERNES, 6: DiaSemana.SABADO };
        const diaSemanaEnum = mapDiaISOaEnum[diaDeLaSemanaISO];

        let horaInicioDia = "00:00";
        let horaFinDia = "23:59";
        let diaEsLaborableConfigurado = false;

        const excepcion = await prisma.excepcionHorario.findUnique({
            where: { negocioId_fecha: { negocioId: argumentos.negocioId, fecha: inicioDelDiaConsultado } }
        });

        if (excepcion) {
            console.log(`[ejecutarListarHorariosDisponiblesAction] Excepción para ${format(inicioDelDiaConsultado, "yyyy-MM-dd")}: ${JSON.stringify(excepcion)}`);
            if (excepcion.esDiaNoLaborable) {
                const mensaje = `Lo siento, el ${fechaFormateada} (${excepcion.descripcion || 'es día no laborable'}) no tenemos disponibilidad.`;
                return { success: true, data: { horariosDisponibles: [], mensajeParaUsuario: mensaje, servicioConsultado: agendaTipoCita.nombre, fechaConsultada: fechaFormateada } };
            }
            if (excepcion.horaInicio && excepcion.horaFin) {
                horaInicioDia = excepcion.horaInicio;
                horaFinDia = excepcion.horaFin;
                diaEsLaborableConfigurado = true;
            }
        }

        if (!diaEsLaborableConfigurado) {
            const horarioSemanal = await prisma.horarioAtencion.findUnique({
                where: { negocioId_dia: { negocioId: argumentos.negocioId, dia: diaSemanaEnum } }
            });
            if (horarioSemanal) {
                console.log(`[ejecutarListarHorariosDisponiblesAction] Horario semanal para ${diaSemanaEnum}: ${JSON.stringify(horarioSemanal)}`);
                horaInicioDia = horarioSemanal.horaInicio;
                horaFinDia = horarioSemanal.horaFin;
                diaEsLaborableConfigurado = true;
            }
        }

        if (!diaEsLaborableConfigurado) {
            const mensaje = `Lo siento, parece que los ${format(inicioDelDiaConsultado, "EEEE", { locale: es })} no ofrecemos servicio o no hay un horario configurado.`;
            return { success: true, data: { horariosDisponibles: [], mensajeParaUsuario: mensaje, servicioConsultado: agendaTipoCita.nombre, fechaConsultada: fechaFormateada } };
        }

        const [hIni, mIni] = horaInicioDia.split(':').map(Number);
        const [hFin, mFin] = horaFinDia.split(':').map(Number);

        let slotActual = setHours(setMinutes(inicioDelDiaConsultado, mIni), hIni);
        const finDeJornada = setHours(setMinutes(inicioDelDiaConsultado, mFin), hFin);
        const ahora = new Date();

        console.log(`[ejecutarListarHorariosDisponiblesAction] Buscando slots desde ${format(slotActual, "HH:mm")} hasta ${format(finDeJornada, "HH:mm")}`);

        while (isBefore(slotActual, finDeJornada) && horariosEncontrados.length < MAX_HORARIOS_A_SUGERIR) {
            // Solo considerar slots futuros
            if (isBefore(slotActual, ahora)) {
                slotActual = addMinutes(slotActual, INCREMENTO_MINUTOS_BUSQUEDA);
                continue;
            }

            const disponibilidad = await verificarDisponibilidadSlot({
                negocioId: argumentos.negocioId,
                agendaTipoCita: agendaTipoCita,
                fechaHoraInicioDeseada: slotActual,
                configAgenda: configAgenda
            });

            if (disponibilidad.disponible) {
                const finServicioSlotActual = addMinutes(slotActual, agendaTipoCita.duracionMinutos ?? 60);
                if (!isAfter(finServicioSlotActual, finDeJornada)) {
                    horariosEncontrados.push(new Date(slotActual.getTime()));
                }
            }
            slotActual = addMinutes(slotActual, INCREMENTO_MINUTOS_BUSQUEDA);
        }

        if (horariosEncontrados.length === 0) {
            const mensaje = `Lo siento, para "${agendaTipoCita.nombre}" el ${fechaFormateada} no encontré horarios disponibles. ¿Te gustaría que busque en otra fecha?`;
            return { success: true, data: { horariosDisponibles: [], mensajeParaUsuario: mensaje, servicioConsultado: agendaTipoCita.nombre, fechaConsultada: fechaFormateada } };
        }

        const horariosFormateados = horariosEncontrados.map(h => format(h, "h:mm aa", { locale: es }));
        const mensajeParaUsuario = `Para "${agendaTipoCita.nombre}" el ${fechaFormateada}, tengo estos horarios disponibles: ${horariosFormateados.join(', ')}. ¿Alguno te funciona?`;

        return {
            success: true,
            data: {
                horariosDisponibles: horariosFormateados,
                mensajeParaUsuario: mensajeParaUsuario,
                servicioConsultado: agendaTipoCita.nombre,
                fechaConsultada: fechaFormateada,
            }
        };

    } catch (error: unknown) {
        console.error(`[ejecutarListarHorariosDisponiblesAction] Error:`, error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al listar horarios.";
        return {
            success: false,
            error: errorMessage,
            data: {
                horariosDisponibles: [],
                mensajeParaUsuario: "Lo siento, tuve problemas para buscar los horarios disponibles. Por favor, intenta más tarde.",
                servicioConsultado: argumentos.servicio_nombre_interes,
                fechaConsultada: argumentos.fecha_deseada
            }
        };
    }
}