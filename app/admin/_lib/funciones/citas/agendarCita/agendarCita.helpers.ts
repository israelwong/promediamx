// Ruta: app/admin/_lib/funciones/citas/agendarCita/agendarCita.helpers.ts
import prisma from '../../../prismaClient';
import {
    Agenda as AgendaPrismaModel,
    AgendaTipoCita as AgendaTipoCitaPrisma,
    ActionType,
    ChangedByType,
    DiaSemana,
    Prisma,
    StatusAgenda,
} from '@prisma/client';
import {
    parse as dateFnsParse,
    isValid,
    addDays,
    startOfDay,
    set,
    nextMonday,
    nextTuesday,
    nextWednesday,
    nextThursday,
    nextFriday,
    nextSaturday,
    nextSunday,
    addMinutes,
    // formatISO,
    isBefore,
    isAfter,
    getDay as dateFnsGetDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ConfiguracionAgendaDelNegocio } from './agendarCita.schemas';

// --- FUNCIONES EXPORTADAS ---

export function extraerYParsearHora(texto: string): { hours: number; minutes: number } | null {
    const textoNormalizado = texto.toLowerCase();
    const matchHora = textoNormalizado.match(/(\d{1,2})(?:\s*[:\.]\s*(\d{1,2}))?\s*(am|pm|de\s+la\s+mañana|de\s+la\s+tarde|de\s+la\s+noche)?/);
    if (matchHora) {
        let horas = parseInt(matchHora[1], 10);
        const minutos = matchHora[2] ? parseInt(matchHora[2], 10) : 0;
        const periodo = matchHora[3]?.replace(/de\s+la\s+/, '').trim();
        if (!(isNaN(horas) || isNaN(minutos))) {
            if (horas >= 1 && horas <= 12 && periodo) {
                if ((periodo === 'pm' || periodo === 'tarde' || periodo === 'noche') && horas < 12) horas += 12;
                if ((periodo === 'am' || periodo === 'mañana') && horas === 12) horas = 0;
            }
            if (horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59) {
                return { hours: horas, minutes: minutos };
            }
        }
    }
    return null;
}

export interface ParsearFechaHoraOpciones {
    permitirSoloFecha?: boolean;
}

export async function parsearFechaHoraInteligente(
    fechaHoraStrEntrada: string,
    opciones?: ParsearFechaHoraOpciones
): Promise<Date | null> {
    const ahora = new Date();
    const hoy = startOfDay(ahora);
    const textoOriginalNormalizado = fechaHoraStrEntrada.toLowerCase().trim();
    let textoParaHora = textoOriginalNormalizado;

    let fechaBase: Date | null = null;
    let horaExtraida: { hours: number; minutes: number } | null = null;

    const partesHora = extraerYParsearHora(textoParaHora);
    if (partesHora) {
        horaExtraida = partesHora;
        const matchHoraEnString = textoParaHora.match(/\d{1,2}(\s*[:\.]\s*\d{1,2})?(\s*(am|pm|de\s+la\s+mañana|de\s+la\s+tarde|de\s+la\s+noche))?/i);
        if (matchHoraEnString && matchHoraEnString[0]) {
            textoParaHora = textoParaHora.replace(matchHoraEnString[0], "").trim().replace(/^a\s+las\s+/, "").trim();
        }
    }

    let textoParaFecha = textoParaHora.replace(/^(para el|el)\s+/, "").trim();
    if (textoParaFecha.length < 3 && textoOriginalNormalizado.length > textoParaHora.length) {
        textoParaFecha = textoOriginalNormalizado.replace(/^(para el|el)\s+/, "").trim();
    }

    const diasSemana = [
        { nombre: "lunes", func: nextMonday }, { nombre: "martes", func: nextTuesday },
        { nombre: "miércoles", alt: "miercoles", func: nextWednesday }, { nombre: "jueves", func: nextThursday },
        { nombre: "viernes", func: nextFriday }, { nombre: "sábado", alt: "sabado", func: nextSaturday },
        { nombre: "domingo", func: nextSunday },
    ];

    for (const dia of diasSemana) {
        if (textoParaFecha.includes(dia.nombre) || (dia.alt && textoParaFecha.includes(dia.alt)) ||
            textoOriginalNormalizado.includes(dia.nombre) || (dia.alt && textoOriginalNormalizado.includes(dia.alt))) {
            let tempFecha = dia.func(ahora);
            if (startOfDay(tempFecha).getTime() === hoy.getTime() && horaExtraida && set(hoy, horaExtraida) < addMinutes(ahora, 5)) {
                tempFecha = dia.func(addDays(ahora, 1));
            }
            fechaBase = startOfDay(tempFecha);
            break;
        }
    }

    if (!fechaBase) {
        if (textoParaFecha.includes("mañana") || textoOriginalNormalizado.includes("mañana")) fechaBase = addDays(hoy, 1);
        else if (textoParaFecha.includes("pasado mañana") || textoOriginalNormalizado.includes("pasado mañana")) fechaBase = addDays(hoy, 2);
        else if (textoParaFecha.includes("hoy") || textoOriginalNormalizado.includes("hoy") || (textoParaFecha === "" && horaExtraida)) fechaBase = hoy;
        else if (textoParaFecha) {
            const formatosComunes = ['d \'de\' MMMM \'de\' yy', 'd \'de\' MMMM', 'dd/MM/yyyy', 'd/M/yy', 'yyyy-MM-dd', 'P', 'PP'];
            for (const fmt of formatosComunes) {
                try {
                    const d = dateFnsParse(textoParaFecha, fmt, ahora, { locale: es });
                    if (isValid(d) && d >= startOfDay(ahora)) {
                        fechaBase = startOfDay(d);
                        break;
                    }
                } catch { /* ignorar */ }
            }
        }
    }

    if (fechaHoraStrEntrada && !fechaBase && !horaExtraida) {
        try {
            const d = new Date(fechaHoraStrEntrada);
            if (isValid(d) && d > ahora) return d;
            if (isValid(d) && opciones?.permitirSoloFecha && d >= hoy) return startOfDay(d);
        } catch { /* ignorar */ }
    }

    if (fechaBase && !horaExtraida) {
        if (opciones?.permitirSoloFecha) return fechaBase;
        return null; // Se requiere hora
    }
    if (!fechaBase && horaExtraida) {
        return null; // Se requiere fecha
    }

    if (fechaBase && horaExtraida) {
        const fechaHoraFinal = set(fechaBase, { ...horaExtraida, seconds: 0, milliseconds: 0 });
        if (isValid(fechaHoraFinal) && fechaHoraFinal > addMinutes(ahora, -5)) {
            return fechaHoraFinal;
        }
    }

    return null;
}


export async function verificarDisponibilidadSlot(
    datosVerificacion: {
        negocioId: string;
        agendaTipoCita: AgendaTipoCitaPrisma;
        fechaHoraInicioDeseada: Date;
        configAgenda: ConfiguracionAgendaDelNegocio;
    }
): Promise<{ disponible: boolean; mensaje?: string; alternativas?: Date[] }> {
    // const { negocioId, agendaTipoCita, fechaHoraInicioDeseada, configAgenda } = datosVerificacion;
    const { negocioId, agendaTipoCita, fechaHoraInicioDeseada } = datosVerificacion;
    const duracionServicio = agendaTipoCita.duracionMinutos ?? 60;
    // const bufferEntreCitas = configAgenda.bufferMinutos ?? 0;

    const slotInicio = fechaHoraInicioDeseada;
    const slotFinServicio = addMinutes(slotInicio, duracionServicio);
    // const slotFinTotalConBuffer = addMinutes(slotFinServicio, bufferEntreCitas);

    const diaDeLaSemanaISO = dateFnsGetDay(slotInicio);
    const mapDiaISOaEnum: { [key: number]: DiaSemana } = { 0: DiaSemana.DOMINGO, 1: DiaSemana.LUNES, 2: DiaSemana.MARTES, 3: DiaSemana.MIERCOLES, 4: DiaSemana.JUEVES, 5: DiaSemana.VIERNES, 6: DiaSemana.SABADO };
    const diaSemanaEnum = mapDiaISOaEnum[diaDeLaSemanaISO];

    const fechaSolo = startOfDay(slotInicio);
    const excepcion = await prisma.excepcionHorario.findUnique({
        where: { negocioId_fecha: { negocioId: negocioId, fecha: fechaSolo } }
    });

    let horarioDia = { inicio: "00:00", fin: "23:59" };
    let diaActivo = true;

    if (excepcion) {
        if (excepcion.esDiaNoLaborable) {
            return { disponible: false, mensaje: `Lo siento, el ${slotInicio.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} (${excepcion.descripcion || 'es día no laborable'}) no estamos disponibles.` };
        }
        if (excepcion.horaInicio && excepcion.horaFin) {
            horarioDia = { inicio: excepcion.horaInicio, fin: excepcion.horaFin };
        }
    }

    if (!excepcion || !excepcion.horaInicio) {
        const horarioSemanal = await prisma.horarioAtencion.findUnique({
            where: { negocioId_dia: { negocioId: negocioId, dia: diaSemanaEnum } }
        });
        if (!horarioSemanal) diaActivo = false;
        else horarioDia = { inicio: horarioSemanal.horaInicio, fin: horarioSemanal.horaFin };
    }

    if (!diaActivo && !excepcion) {
        return { disponible: false, mensaje: `Lo siento, los ${slotInicio.toLocaleDateString('es-MX', { weekday: 'long' })} no ofrecemos servicio.` };
    }

    const [inicioH, inicioM] = horarioDia.inicio.split(':').map(Number);
    const [finH, finM] = horarioDia.fin.split(':').map(Number);
    const aperturaDelDia = set(slotInicio, { hours: inicioH, minutes: inicioM, seconds: 0 });
    const cierreDelDia = set(slotInicio, { hours: finH, minutes: finM, seconds: 0 });

    if (isBefore(slotInicio, aperturaDelDia) || isAfter(slotFinServicio, cierreDelDia)) {
        return { disponible: false, mensaje: `Nuestro horario para el ${slotInicio.toLocaleDateString('es-MX', { weekday: 'long' })} es de ${horarioDia.inicio} a ${horarioDia.fin}. El horario solicitado está fuera de este rango.` };
    }

    const citasSolapadas = await prisma.agenda.count({
        where: {
            negocioId: negocioId,
            tipoDeCitaId: agendaTipoCita.id,
            status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA, StatusAgenda.NO_ASISTIO] },
            fecha: { equals: slotInicio },
        }
    });

    if (citasSolapadas >= agendaTipoCita.limiteConcurrencia) {
        return { disponible: false, mensaje: `Lo siento, ya no hay cupo para "${agendaTipoCita.nombre}" en ese horario. ¿Te gustaría otro?` };
    }

    return { disponible: true };
}

export async function crearAgendaEnTransaccion(
    datosAgenda: {
        negocioId: string;
        leadId: string;
        fecha: Date;
        tipoDeCitaId: string;
        asunto: string;
        modalidad: 'virtual' | 'presencial';
        agenteId?: string;
        asistenteId?: string;
    },
    actorType: ChangedByType,
    actorId: string | null
): Promise<{ success: boolean; agenda?: AgendaPrismaModel; error?: string }> {
    try {
        const dataParaCrear: Prisma.AgendaCreateInput = {
            negocio: { connect: { id: datosAgenda.negocioId } },
            lead: { connect: { id: datosAgenda.leadId } },
            tipoDeCita: { connect: { id: datosAgenda.tipoDeCitaId } },
            fecha: datosAgenda.fecha,
            asunto: datosAgenda.asunto,
            modalidad: datosAgenda.modalidad,
            status: StatusAgenda.PENDIENTE,
            tipo: 'DEFAULT',
            ...(datosAgenda.agenteId && { agente: { connect: { id: datosAgenda.agenteId } } }),
            ...(datosAgenda.asistenteId && { asistente: { connect: { id: datosAgenda.asistenteId } } }),
        };

        const nuevaAgenda = await prisma.$transaction(async (tx) => {
            const agendaCreada = await tx.agenda.create({ data: dataParaCrear });
            await tx.agendaHistorial.create({
                data: {
                    agendaId: agendaCreada.id,
                    actionType: ActionType.CREATED,
                    changedByType: actorType,
                    changedById: actorId,
                    reason: "Cita creada por asistente.",
                }
            });
            return agendaCreada;
        });

        return { success: true, agenda: nuevaAgenda };

    } catch (error: unknown) {
        const friendlyError = error instanceof Error ? error.message : 'Error en transacción de creación de agenda.';
        return { success: false, error: friendlyError };
    }
}