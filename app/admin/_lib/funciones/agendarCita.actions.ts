// Ruta: app/admin/_lib/funciones/agendarCita.actions.ts
'use server';

import prisma from '../prismaClient'; // Tu cliente Prisma
import { ActionResult } from '../types'; // Asumo que tienes este tipo genérico
import {
    AgendarCitaArgs, AgendarCitaData, ConfiguracionAgendaDelNegocio,

} from './agendarCita.schemas';

import {
    AgendaTipoCita as AgendaTipoCitaPrisma, // Alias para el tipo de Prisma
    StatusAgenda,
    ActionType,
    ChangedByType,
    DiaSemana, // Asegúrate que este Enum esté definido en tu schema.prisma y generado
    Agenda as AgendaPrismaModel
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
    formatISO,
    isBefore,
    isAfter,
    getDay as dateFnsGetDay, // 0 para Domingo, 1 para Lunes, etc.
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Prisma } from '@prisma/client';


// Función auxiliar para extraer y parsear la hora del texto (asumo que ya la tienes)
function extraerYParsearHora(texto: string): { hours: number; minutes: number } | null {
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
    permitirSoloFecha?: boolean; // Nuevo: Si es true, y se encuentra fecha pero no hora, devuelve startOfDay(fecha)
}


export async function parsearFechaHoraInteligente(
    fechaHoraStrEntrada: string,
    opciones?: ParsearFechaHoraOpciones
): Promise<Date | null> {
    const ahora = new Date();
    const hoy = startOfDay(ahora);
    const textoOriginalNormalizado = fechaHoraStrEntrada.toLowerCase().trim();
    let textoParaHora = textoOriginalNormalizado;

    console.log(`[parsearFechaHoraInteligente v2.1] Input: "${fechaHoraStrEntrada}", Normalizado: "${textoOriginalNormalizado}", Opciones: ${JSON.stringify(opciones)}`);

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
    console.log(`[parsearFechaHoraInteligente v2.1] Hora extraída: ${JSON.stringify(horaExtraida)}, Texto restante para fecha (textoParaHora): "${textoParaHora}"`);

    let textoParaFecha = textoParaHora.replace(/^(para el|el)\s+/, "").trim();
    if (textoParaFecha.length < 3 && textoOriginalNormalizado.length > textoParaHora.length) {
        textoParaFecha = textoOriginalNormalizado.replace(/^(para el|el)\s+/, "").trim();
    }

    const diasSemana = [
        { nombre: "lunes", func: nextMonday },
        { nombre: "martes", func: nextTuesday },
        { nombre: "miércoles", alt: "miercoles", func: nextWednesday },
        { nombre: "jueves", func: nextThursday },
        { nombre: "viernes", func: nextFriday },
        { nombre: "sábado", alt: "sabado", func: nextSaturday },
        { nombre: "domingo", func: nextSunday },
    ];

    for (const dia of diasSemana) {
        if (textoParaFecha.includes(dia.nombre) || (dia.alt && textoParaFecha.includes(dia.alt)) ||
            textoOriginalNormalizado.includes(dia.nombre) || (dia.alt && textoOriginalNormalizado.includes(dia.alt))) {

            let tempFecha = dia.func(ahora); // Calcula el próximo día de esa semana (puede ser hoy)

            // Si tempFecha es hoy Y se extrajo una hora Y esa hora para hoy ya pasó o es muy pronto (dentro de 5 mins)
            // entonces, forzar a que sea la ocurrencia de la siguiente semana para ese día.
            if (startOfDay(tempFecha).getTime() === hoy.getTime() &&
                horaExtraida &&
                set(hoy, horaExtraida) < addMinutes(ahora, 5)) { // Ajustado el umbral a 5 minutos en el futuro para "ya pasó"

                tempFecha = dia.func(addDays(ahora, 1)); // Busca el siguiente día de la semana a partir de mañana
            }
            // Adicionalmente, si dia.func(ahora) devolvió un día *anterior* a hoy (lo cual no debería pasar con next[Day] si 'ahora' es correcto)
            // o si es hoy pero la lógica anterior no lo saltó y queremos asegurar que no sea una fecha pasada (en caso de no haber hora).
            // Sin embargo, la validación final `fechaHoraFinal > addMinutes(ahora, -5)` ya cubre que no sea en el pasado.
            // Por ahora, la lógica de arriba es la principal para el salto semanal.

            fechaBase = startOfDay(tempFecha);
            console.log(`[parsearFechaHoraInteligente v2.1] Día de la semana detectado: ${dia.nombre} -> ${fechaBase ? formatISO(fechaBase) : 'null'}`);
            break;
        }
    }

    if (!fechaBase) {
        if (textoParaFecha.includes("mañana") || textoOriginalNormalizado.includes("mañana")) fechaBase = addDays(hoy, 1);
        else if (textoParaFecha.includes("pasado mañana") || textoOriginalNormalizado.includes("pasado mañana")) fechaBase = addDays(hoy, 2);
        else if (textoParaFecha.includes("hoy") || textoOriginalNormalizado.includes("hoy") || (textoParaFecha === "" && horaExtraida)) fechaBase = hoy;
        else if (textoParaFecha) {
            const formatosComunes = ['d \'de\' MMMM \'de\' yy', 'd \'de\' MMMM', 'dd/MM/yyyy', 'd/M/yy', 'yyyy-MM-dd', 'P', 'PP']; // Corregido el yyyy
            for (const fmt of formatosComunes) {
                try {
                    const d = dateFnsParse(textoParaFecha, fmt, ahora, { locale: es });
                    // Permitir que la fecha parseada sea hoy, la validación de la hora se hará después.
                    if (isValid(d) && d >= startOfDay(ahora)) { // Solo >= startOfDay para no descartar hoy
                        fechaBase = startOfDay(d);
                        break;
                    }
                } catch { /* ignorar */ }
            }
        }
    }
    console.log(`[parsearFechaHoraInteligente v2.1] Fecha base determinada (post-días/frases): ${fechaBase ? formatISO(fechaBase) : 'null'}`);

    // --- Inicio del bloque que no tuvo cambios y fue omitido antes por brevedad ---
    if (fechaHoraStrEntrada && !fechaBase && !horaExtraida) {
        try {
            const d = new Date(fechaHoraStrEntrada);
            if (isValid(d) && d > ahora) { //  Validar que sea futura si es fecha y hora completa
                console.log(`[parsearFechaHoraInteligente v2.1] Parseado con new Date(): ${formatISO(d)}`);
                return d;
            } else if (isValid(d) && opciones?.permitirSoloFecha && d >= hoy) {
                console.log(`[parsearFechaHoraInteligente v2.1] Parseado con new Date() (solo fecha permitida): ${formatISO(startOfDay(d))}`);
                return startOfDay(d);
            }
        } catch { /* ignorar */ }
    }

    if (fechaBase && !horaExtraida) {
        if (opciones?.permitirSoloFecha) {
            console.log(`[parsearFechaHoraInteligente v2.1] Solo fecha permitida y encontrada: ${formatISO(fechaBase)}`);
            return fechaBase;
        } else {
            console.warn(`[parsearFechaHoraInteligente v2.1] Fecha proporcionada ('${fechaHoraStrEntrada}') sin hora específica, y se requiere hora.`);
            return null;
        }
    }
    if (!fechaBase && horaExtraida) {
        // Si solo se dio una hora pero no una fecha clara, y no es para hoy (ya se habría asignado 'hoy' a fechaBase).
        console.warn(`[parsearFechaHoraInteligente v2.1] Hora proporcionada ('${fechaHoraStrEntrada}') sin fecha clara, se requiere fecha.`);
        return null;
    }

    if (fechaBase && horaExtraida) {
        const fechaHoraFinal = set(fechaBase, {
            hours: horaExtraida.hours,
            minutes: horaExtraida.minutes,
            seconds: 0,
            milliseconds: 0
        });
        // Permitir agendar para "ahora mismo" o un poquito en el pasado si el proceso tomó tiempo.
        // El buffer de -5 minutos es para evitar rechazos por demoras mínimas.
        if (isValid(fechaHoraFinal) && fechaHoraFinal > addMinutes(ahora, -5)) {
            console.log(`[parsearFechaHoraInteligente v2.1] Parseado final: "${fechaHoraStrEntrada}" -> ${formatISO(fechaHoraFinal)}`);
            return fechaHoraFinal;
        } else {
            console.warn(`[parsearFechaHoraInteligente v2.1] Fecha/hora parseada es inválida o está en el pasado estricto: ${fechaHoraFinal ? formatISO(fechaHoraFinal) : 'Fecha Inválida'}`);
            return null;
        }
    }
    // --- Fin del bloque que no tuvo cambios ---

    console.warn(`[parsearFechaHoraInteligente v2.1] No se pudo parsear: "${fechaHoraStrEntrada}"`);
    return null;
}

async function actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId: string, motivo: string, args?: AgendarCitaArgs) {
    console.error(`[Tarea Fallida Interna] TareaID: ${tareaEjecutadaId}, Motivo: ${motivo}`, args || "");
    try {
        await prisma.tareaEjecutada.update({ // Asumiendo que tienes un modelo TareaEjecutada
            where: { id: tareaEjecutadaId },
            data: {
                fechaEjecutada: new Date(),
            }
        });
    } catch (updateError) {
        console.error(`[actualizarTareaEjecutadaFallidaInterna] Error al actualizar TareaEjecutada ${tareaEjecutadaId}:`, updateError);
    }
}

export async function verificarDisponibilidadSlot(
    datosVerificacion: {
        negocioId: string;
        agendaTipoCita: AgendaTipoCitaPrisma;
        fechaHoraInicioDeseada: Date;
        configAgenda: ConfiguracionAgendaDelNegocio;
    }
): Promise<{ disponible: boolean; mensaje?: string; alternativas?: Date[] }> {
    const { negocioId, agendaTipoCita, fechaHoraInicioDeseada, configAgenda } = datosVerificacion;
    const duracionServicio = agendaTipoCita.duracionMinutos ?? 60; // Duración del servicio
    const bufferEntreCitas = configAgenda.bufferMinutos ?? 0;     // Buffer configurado

    const slotInicio = fechaHoraInicioDeseada;
    const slotFinServicio = addMinutes(slotInicio, duracionServicio);
    const slotFinTotalConBuffer = addMinutes(slotFinServicio, bufferEntreCitas); // El tiempo que este slot bloqueará para el siguiente

    // console.log(`[verificarDisponibilidadSlot] Verificando para "${agendaTipoCita.nombre}" ID: ${agendaTipoCita.id}`);
    // console.log(`  Slot Deseado: ${formatISO(slotInicio)} a ${formatISO(slotFinServicio)} (Dur: ${duracionServicio}m)`);
    // console.log(`  Bloqueo total con buffer (${bufferEntreCitas}m): hasta ${formatISO(slotFinTotalConBuffer)}`);
    // console.log(`  Límite Concurrencia: ${agendaTipoCita.limiteConcurrencia}`);

    // --- 1. Verificar Horario de Atención y Excepciones ---
    const diaDeLaSemanaISO = dateFnsGetDay(slotInicio); // 0 (Dom) - 6 (Sab)
    const mapDiaISOaEnum: { [key: number]: DiaSemana } = { 0: DiaSemana.DOMINGO, 1: DiaSemana.LUNES, 2: DiaSemana.MARTES, 3: DiaSemana.MIERCOLES, 4: DiaSemana.JUEVES, 5: DiaSemana.VIERNES, 6: DiaSemana.SABADO };
    const diaSemanaEnum = mapDiaISOaEnum[diaDeLaSemanaISO];

    // Verificar Excepciones primero
    const fechaSolo = startOfDay(slotInicio);
    const excepcion = await prisma.excepcionHorario.findUnique({
        where: { negocioId_fecha: { negocioId: negocioId, fecha: fechaSolo } }
    });

    let horarioDia = { inicio: "00:00", fin: "23:59" }; // Por defecto, si no hay reglas más específicas
    let diaActivo = true;

    if (excepcion) {
        console.log(`[verificarDisponibilidadSlot] Excepción encontrada para ${formatISO(fechaSolo)}: ${JSON.stringify(excepcion)}`);
        if (excepcion.esDiaNoLaborable) {
            return { disponible: false, mensaje: `Lo siento, el ${slotInicio.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} (${excepcion.descripcion || 'día no laborable'}) no estamos disponibles.` };
        }
        if (excepcion.horaInicio && excepcion.horaFin) {
            horarioDia = { inicio: excepcion.horaInicio, fin: excepcion.horaFin };
        }
        // Si no es día no laborable y no tiene horas especiales, usa el horario normal del día si existe
    }

    if (!excepcion || (excepcion && !excepcion.horaInicio)) { // Si no hubo excepción o la excepción no especificó horario, usar el semanal
        const horarioSemanal = await prisma.horarioAtencion.findUnique({
            where: { negocioId_dia: { negocioId: negocioId, dia: diaSemanaEnum } }
        });
        if (!horarioSemanal) { // Si no hay horario definido para ese día de la semana
            diaActivo = false; // Considerarlo no activo si no hay excepción ni horario semanal
        } else {
            console.log(`[verificarDisponibilidadSlot] Horario semanal para ${diaSemanaEnum}: ${JSON.stringify(horarioSemanal)}`);
            horarioDia = { inicio: horarioSemanal.horaInicio, fin: horarioSemanal.horaFin };
        }
    }
    if (!diaActivo && !excepcion) { // Si realmente no hay forma de atender ese día
        return { disponible: false, mensaje: `Lo siento, los ${slotInicio.toLocaleDateString('es-MX', { weekday: 'long' })} no ofrecemos servicio.` };
    }

    // Convertir horas del negocio (HH:MM strings) a objetos Date para comparación
    const [inicioH, inicioM] = horarioDia.inicio.split(':').map(Number);
    const [finH, finM] = horarioDia.fin.split(':').map(Number);

    const aperturaDelDia = set(slotInicio, { hours: inicioH, minutes: inicioM, seconds: 0, milliseconds: 0 });
    const cierreDelDia = set(slotInicio, { hours: finH, minutes: finM, seconds: 0, milliseconds: 0 });

    if (isBefore(slotInicio, aperturaDelDia) || isAfter(slotFinServicio, cierreDelDia)) {
        return { disponible: false, mensaje: `Nuestro horario para el ${slotInicio.toLocaleDateString('es-MX', { weekday: 'long' })} es de ${horarioDia.inicio} a ${horarioDia.fin}. El horario solicitado está fuera de este rango.` };
    }

    // --- 2. Verificar Concurrencia con Citas Existentes ---
    const citasSolapadas = await prisma.agenda.findMany({
        where: {
            negocioId: negocioId,
            tipoDeCitaId: agendaTipoCita.id, // Solo contamos contra el mismo tipo de servicio para la concurrencia
            status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA] }, // Citas activas
            // Lógica de solapamiento de rangos:
            // Una cita existente (CE) se solapa con el nuevo slot (NS) si:
            // (CE.inicio < NS.fin_con_buffer) Y (CE.fin_con_buffer > NS.inicio)
            AND: [
                { fecha: { lt: slotFinTotalConBuffer } }, // La cita existente DEBE empezar ANTES de que nuestro slot (con buffer) TERMINE
                {
                    fecha: { gte: slotInicio } // que al menos empiecen cuando o después de nuestro slot
                    // OJO: Esta consulta de solapamiento es la parte más difícil.
                    // Para una prueba rápida, podrías contar las que empiezan exactamente a la misma hora.
                }
            ]
            // TODO: La consulta de solapamiento para concurrencia es compleja y crucial.
            // Para "implementación rápida", podemos asumir que si el slot de inicio está libre (no hay otra cita *exactamente* a esa hora *de ese tipo*),
            // y el límite de concurrencia es > 0, entonces está disponible. Esto es una GRAN simplificación.
        }
    });

    console.log(`[verificarDisponibilidadSlot] Citas solapadas (misma hora de inicio, mismo tipo) encontradas: ${citasSolapadas.length}`);
    if (citasSolapadas.length >= agendaTipoCita.limiteConcurrencia) {
        // TODO: Buscar el siguiente slot disponible realmente.
        return { disponible: false, mensaje: `Lo siento, ya hemos alcanzado el límite de citas para "${agendaTipoCita.nombre}" en ese horario. ¿Te gustaría otro horario?` };
    }

    console.log(`[verificarDisponibilidadSlot] Slot considerado DISPONIBLE para ${agendaTipoCita.nombre} el ${formatISO(slotInicio)}`);
    return { disponible: true };
}

/**
 * Función principal para agendar una cita.
 * Ahora recibe la configuración del negocio y la información del actor.
 */
export async function ejecutarAgendarCitaAction(
    argumentos: AgendarCitaArgs,
    tareaEjecutadaId: string,
    configAgenda: ConfiguracionAgendaDelNegocio,
    actor: { type: ChangedByType; id: string | null }
): Promise<ActionResult<AgendarCitaData>> {

    console.log(`[ejecutarAgendarCitaAction] v5 Iniciando TareaID: ${tareaEjecutadaId}`);
    console.log("[ejecutarAgendarCitaAction] Argumentos:", JSON.stringify(argumentos));
    console.log("[ejecutarAgendarCitaAction] ConfigAgenda:", JSON.stringify(configAgenda));
    console.log("[ejecutarAgendarCitaAction] Actor:", JSON.stringify(actor));

    let mensajeParaUsuario = "";

    if (!argumentos.negocioId || !argumentos.leadId) {
        const msg = "Error interno: Falta negocioId o leadId.";
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, msg, argumentos);
        return { success: false, error: msg, data: { esCitaCreada: false, mensajeParaUsuario: msg } };
    }

    // --- 1. Obtener el Tipo de Cita (Servicio) Solicitado ---
    if (!argumentos.servicio_nombre) {

        // NUEVO: Obtener ejemplos de servicios reales del negocio
        let ejemplosServicios = "";
        try {
            const tiposDeCitaEjemplo = await prisma.agendaTipoCita.findMany({
                where: {
                    negocioId: argumentos.negocioId,
                    activo: true, // Asumiendo que tienes un flag 'activo'
                },
                // take: 2, // Tomar hasta 2 ejemplos
                select: {
                    nombre: true,
                }
            });

            if (tiposDeCitaEjemplo.length > 0) {
                ejemplosServicios = " Por ejemplo: '" + tiposDeCitaEjemplo.map(t => t.nombre).join("' o '") + "'.";
            }
        } catch (dbError) {
            console.error("[ejecutarAgendarCitaAction] Error al obtener ejemplos de servicios:", dbError);
            // Continuar sin ejemplos si hay error de BD
        }

        mensajeParaUsuario = `Para poder agendar, necesito saber qué servicio te gustaría.${ejemplosServicios}`;
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta servicio_nombre.", argumentos); // Quizás no fallar, solo pedir dato
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }

    const agendaTipoCita = await prisma.agendaTipoCita.findFirst({
        where: {
            nombre: { equals: argumentos.servicio_nombre, mode: 'insensitive' },
            negocioId: argumentos.negocioId,
            activo: true
        },
    });

    if (!agendaTipoCita) {
        mensajeParaUsuario = `Lo siento, no encontré el servicio "${argumentos.servicio_nombre}" o no está disponible actualmente. ¿Podrías verificar el nombre?`;
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Servicio no encontrado o inactivo: ${argumentos.servicio_nombre}`, argumentos);
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }
    mensajeParaUsuario = `Perfecto, para tu servicio de "${agendaTipoCita.nombre}". `;

    // --- 2. Determinar y Validar Modalidad (Virtual/Presencial) ---
    let modalidadConfirmada: 'virtual' | 'presencial';
    const preferenciaUsuarioModalidad = argumentos.tipo_cita_modalidad_preferida;

    if (agendaTipoCita.esVirtual && agendaTipoCita.esPresencial) { // Servicio ofrece ambas
        if (configAgenda.aceptaCitasVirtuales && configAgenda.aceptaCitasPresenciales) {
            if (preferenciaUsuarioModalidad) {
                modalidadConfirmada = preferenciaUsuarioModalidad;
                mensajeParaUsuario += `Has elegido la modalidad ${modalidadConfirmada}. `;
            } else {
                // Si el negocio acepta ambas y el servicio ofrece ambas, pero el usuario no especificó, hay que preguntar.
                mensajeParaUsuario += `Este servicio se ofrece virtual y presencial. ¿Cómo la prefieres?`;
                // await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Necesita elegir modalidad V/P", argumentos);
                return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
            }
        } else if (configAgenda.aceptaCitasVirtuales) {
            modalidadConfirmada = 'virtual';
            mensajeParaUsuario += `Será una cita virtual, ya que es la modalidad que ofrecemos para este servicio. `;
        } else if (configAgenda.aceptaCitasPresenciales) {
            modalidadConfirmada = 'presencial';
            mensajeParaUsuario += `Será una cita presencial, ya que es la modalidad que ofrecemos para este servicio. `;
        } else {
            mensajeParaUsuario = `Lo siento, para el servicio "${agendaTipoCita.nombre}", no tenemos modalidad (virtual o presencial) activa en este momento.`;
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Servicio dual pero negocio no acepta ninguna modalidad.", argumentos);
            return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
        }
    } else if (agendaTipoCita.esVirtual) {
        if (!configAgenda.aceptaCitasVirtuales) {
            mensajeParaUsuario = `El servicio "${agendaTipoCita.nombre}" es virtual, pero no estamos aceptando citas virtuales por el momento.`;
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Servicio es V, negocio no acepta V.", argumentos);
            return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
        }
        modalidadConfirmada = 'virtual';
    } else if (agendaTipoCita.esPresencial) {
        if (!configAgenda.aceptaCitasPresenciales) {
            mensajeParaUsuario = `El servicio "${agendaTipoCita.nombre}" es presencial, pero no estamos aceptando citas presenciales por el momento.`;
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Servicio es P, negocio no acepta P.", argumentos);
            return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
        }
        modalidadConfirmada = 'presencial';
    } else {
        mensajeParaUsuario = `El servicio "${agendaTipoCita.nombre}" no tiene una modalidad (virtual/presencial) configurada. Por favor, contacta al administrador.`;
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Servicio ${agendaTipoCita.nombre} sin modalidad configurada en AgendaTipoCita.`, argumentos);
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }
    // Si la modalidad preferida por el usuario no coincide con la única modalidad del servicio
    if (preferenciaUsuarioModalidad && preferenciaUsuarioModalidad !== modalidadConfirmada) {
        mensajeParaUsuario = `Solicitaste una cita ${preferenciaUsuarioModalidad}, pero el servicio "${agendaTipoCita.nombre}" solo se ofrece en modalidad ${modalidadConfirmada}. ¿Continuamos con la modalidad ${modalidadConfirmada}?`;
        // await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Preferencia modalidad no coincide con oferta servicio`, argumentos);
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }
    mensajeParaUsuario = `Entendido, cita ${modalidadConfirmada} para "${agendaTipoCita.nombre}". `;


    // --- 3. Validar y Parsear Fecha y Hora Deseada ---
    if (!argumentos.fecha_hora_deseada) {
        mensajeParaUsuario += `¿Para qué fecha y hora te gustaría agendar?`;
        // await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta fecha_hora_deseada.", argumentos);
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }
    const fechaHoraParseada = await parsearFechaHoraInteligente(argumentos.fecha_hora_deseada);
    if (!fechaHoraParseada) {
        mensajeParaUsuario = `La fecha y hora que mencionaste ('${argumentos.fecha_hora_deseada}') no me parece válida, ya pasó, o no la entendí bien. ¿Podrías darme una fecha y hora futuras? (Ej: "mañana a las 3 pm", "próximo martes 10:00").`;
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Fecha/hora inválida o pasada: ${argumentos.fecha_hora_deseada}`, argumentos);
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }

    // --- 4. Verificar Disponibilidad del Slot (Usando la lógica actualizada) ---
    const disponibilidad = await verificarDisponibilidadSlot({
        negocioId: argumentos.negocioId,
        agendaTipoCita: agendaTipoCita,
        fechaHoraInicioDeseada: fechaHoraParseada,
        configAgenda: configAgenda
    });

    if (!disponibilidad.disponible) {
        mensajeParaUsuario = disponibilidad.mensaje || `Lo siento, el horario de las ${fechaHoraParseada.toLocaleTimeString('es-MX', { timeStyle: 'short' })} del ${fechaHoraParseada.toLocaleDateString('es-MX', { dateStyle: 'long' })} para "${agendaTipoCita.nombre}" no está disponible.`;
        if (disponibilidad.alternativas && disponibilidad.alternativas.length > 0) {
            mensajeParaUsuario += ` Podría ser ${disponibilidad.alternativas.map(alt => alt.toLocaleTimeString('es-MX', { timeStyle: 'short' })).join(' o ')}?`;
        } else {
            mensajeParaUsuario += ` ¿Te gustaría intentar con otro horario o día?`;
        }
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Slot no disponible para ${agendaTipoCita.nombre} el ${formatISO(fechaHoraParseada)}`, argumentos);
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }
    mensajeParaUsuario += `¡Buenas noticias! El horario de las ${fechaHoraParseada.toLocaleTimeString('es-MX', { timeStyle: 'short' })} del ${fechaHoraParseada.toLocaleDateString('es-MX', { dateStyle: 'long' })} está disponible. `;

    // --- 5. Validar y Recolectar Datos de Contacto Requeridos ---


    let faltanDatosContacto = false;
    let datosContactoFaltantesMsg = "Para confirmar tu cita, necesito ";

    if (configAgenda.requiereNombre && !argumentos.nombre_contacto) {
        datosContactoFaltantesMsg += "tu nombre, ";
        faltanDatosContacto = true;
    }
    const telefonoLimpio = argumentos.telefono_contacto?.replace(/\D/g, '');
    if (configAgenda.requiereTelefono && (!telefonoLimpio || telefonoLimpio.length !== 10)) {
        datosContactoFaltantesMsg += "tu número de teléfono a 10 dígitos, ";
        faltanDatosContacto = true;
    }
    const emailLimpio = argumentos.email_contacto?.trim();
    const esEmailValido = emailLimpio && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio); // Validación simple
    if (configAgenda.requiereEmail && !esEmailValido) {
        datosContactoFaltantesMsg += "un correo electrónico válido, ";
        faltanDatosContacto = true;
    }

    if (faltanDatosContacto) {
        mensajeParaUsuario += `${datosContactoFaltantesMsg.slice(0, -2)}.`;
        // await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Faltan datos de contacto: ${datosContactoFaltantesMsg}`, argumentos);
        return { success: true, data: { esCitaCreada: false, mensajeParaUsuario } };
    }

    // --- 6. Crear la Cita en Transacción ---
    try {
        const datosParaNuevaAgenda = {
            negocioId: argumentos.negocioId,
            leadId: argumentos.leadId!, // Ya validamos que existe negocioId y leadId al inicio
            fecha: fechaHoraParseada,
            tipoDeCitaId: agendaTipoCita.id,
            asunto: argumentos.motivo_de_reunion || agendaTipoCita.nombre,
            modalidad: modalidadConfirmada, // Guardamos la modalidad confirmada
            nombreContacto: argumentos.nombre_contacto, // Asumiendo que tienes estos campos en tu modelo Agenda
            emailContacto: emailLimpio,
            telefonoContacto: telefonoLimpio,
            agenteId: actor.type === ChangedByType.AGENT ? actor.id || undefined : undefined,
            asistenteId: actor.type === ChangedByType.ASSISTANT ? actor.id || undefined : undefined,
            // meetingUrl: se podría generar aquí si es virtual y tienes la lógica
        };

        const resultadoCreacion = await crearAgendaEnTransaccion(datosParaNuevaAgenda, actor.type, actor.id);

        if (resultadoCreacion.success && resultadoCreacion.agenda) {
            mensajeParaUsuario = `¡Confirmado! Tu cita para "${agendaTipoCita.nombre}" (${modalidadConfirmada}) ha sido agendada para el ${fechaHoraParseada.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}. El ID de tu cita es: ${resultadoCreacion.agenda.id}.`;
            // Aquí podrías añadir la URL de la reunión si se generó
            return { success: true, data: { esCitaCreada: true, mensajeParaUsuario, agendaId: resultadoCreacion.agenda.id /*, meetingUrl: ... */ } };
        } else {
            throw new Error(resultadoCreacion.error || "Error desconocido al crear la agenda en la transacción.");
        }

    } catch (error: unknown) {
        console.error("[ejecutarAgendarCitaAction] Error final al intentar crear cita:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, errorMessage || "Error al guardar cita en BD", argumentos);
        return {
            success: true, // La función de IA se ejecutó, pero la operación de negocio falló
            data: {
                esCitaCreada: false,
                mensajeParaUsuario: "Lo siento, tuvimos un problema técnico al intentar agendar tu cita en este momento. Por favor, intenta de nuevo más tarde."
            }
        };
    } finally {
        // No es ideal desconectar prisma aquí si la función se llama múltiples veces.
        // Maneja la conexión a nivel de aplicación (singleton).
        // await prisma.$disconnect();
    }
}

/**
 * Función interna para crear la Agenda y su registro de Historial en una transacción.
 */
async function crearAgendaEnTransaccion(
    datosAgenda: {
        negocioId: string;
        leadId: string;
        fecha: Date;
        tipoDeCitaId: string;
        asunto: string;
        modalidad: 'virtual' | 'presencial'; // Asumiendo que quieres guardar esto
        descripcion?: string;
        meetingUrl?: string;
        agenteId?: string;
        asistenteId?: string;
        // Ya no pasamos nombreContacto, emailContacto, telefonoContacto aquí
        // a menos que existan en el modelo Agenda
    },
    actorType: ChangedByType,
    actorId: string | null
): Promise<{ success: boolean; agenda?: AgendaPrismaModel; error?: string }> { // Tipo de retorno actualizado
    try {
        const dataParaCrear: Prisma.AgendaCreateInput = {
            negocio: { connect: { id: datosAgenda.negocioId } },
            lead: { connect: { id: datosAgenda.leadId } }, // Asegúrate que datosAgenda.leadId NUNCA sea undefined aquí
            tipoDeCita: { connect: { id: datosAgenda.tipoDeCitaId } },
            fecha: datosAgenda.fecha,
            asunto: datosAgenda.asunto,
            modalidad: datosAgenda.modalidad, // Asegúrate que 'modalidad' exista en tu modelo Agenda en schema.prisma
            status: StatusAgenda.PENDIENTE,
            tipo: 'DEFAULT', // Replace 'DEFAULT' with the appropriate value for the "tipo" field
            // Campos opcionales:
            ...(datosAgenda.descripcion && { descripcion: datosAgenda.descripcion }),
            ...(datosAgenda.meetingUrl && { meetingUrl: datosAgenda.meetingUrl }),
        };

        // Conectar relaciones opcionales (Agente, Asistente)
        if (datosAgenda.agenteId) {
            dataParaCrear.agente = { connect: { id: datosAgenda.agenteId } };
        }
        if (datosAgenda.asistenteId) {
            dataParaCrear.asistente = { connect: { id: datosAgenda.asistenteId } };
        }

        const nuevaAgenda = await prisma.$transaction(async (tx) => {
            const agendaCreada = await tx.agenda.create({
                data: dataParaCrear
            });

            await tx.agendaHistorial.create({
                data: {
                    agenda: { connect: { id: agendaCreada.id } },
                    actionType: ActionType.CREATED,
                    changedByType: actorType,
                    changedById: actorId,
                    reason: "Cita creada inicialmente.",
                }
            });
            return agendaCreada; // Esto es de tipo AgendaPrismaModel
        });

        console.log(`[crearAgendaEnTransaccion] Agenda creada con ID: ${nuevaAgenda.id}`);
        return { success: true, agenda: nuevaAgenda };

    } catch (error: unknown) {
        console.error('[crearAgendaEnTransaccion] Error:', error);
        let friendlyError = 'Error en transacción de creación de agenda.';
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') { // Record to connect not found
            friendlyError = `No se pudo crear la cita porque uno de los elementos necesarios (negocio, cliente, tipo de cita, agente o asistente) no se encontró. Detalles: 
            ${(error as Prisma.PrismaClientKnownRequestError)?.meta?.cause || ((error as unknown) as Error).message}`;
        } else if (error instanceof Error && error.message) {
            friendlyError = error.message;
        }
        return { success: false, error: friendlyError };
    }
}