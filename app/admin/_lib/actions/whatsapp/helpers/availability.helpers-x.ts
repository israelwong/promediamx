// /helpers/availability.helpers.ts
// Este archivo contiene helpers de lógica de negocio relacionados con la agenda.
// Su responsabilidad es determinar si un horario está disponible y encontrar la cita más relevante en una conversación.

import prisma from '@/app/admin/_lib/prismaClient';
import { StatusAgenda } from '@prisma/client';

export async function verificarDisponibilidad(
    input: { negocioId: string; tipoDeCitaId: string; fechaDeseada: Date; leadId: string; citaOriginalId?: string; }
): Promise<boolean> {
    const { negocioId, tipoDeCitaId, fechaDeseada, leadId, citaOriginalId } = input;
    const TIMEZONE_OFFSET = "-06:00"; // Ajustar si es necesario para el horario de verano/invierno

    try {
        const tipoCita = await prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: tipoDeCitaId } });
        const duracionMinutos = tipoCita.duracionMinutos || 30;
        const finCitaDeseada = new Date(fechaDeseada.getTime() + duracionMinutos * 60000);

        // Primero, verifica si ESTE MISMO LEAD ya tiene OTRA cita PENDIENTE que se solape
        const citasSolapadasDelLead = await prisma.agenda.findMany({
            where: {
                id: { not: citaOriginalId },
                leadId: leadId,
                status: StatusAgenda.PENDIENTE,
                OR: [
                    { fecha: { gte: fechaDeseada, lt: finCitaDeseada } },
                    { fecha: { lte: fechaDeseada }, updatedAt: { gt: fechaDeseada } }
                ],
            }
        });

        if (citasSolapadasDelLead.length > 0) {
            console.error(`[VERIFICAR DISPONIBILIDAD] RECHAZADO: El lead ${leadId} ya tiene OTRA cita PENDIENTE solapada.`);
            return false;
        }

        // Si no hay conflicto para el lead, verifica la disponibilidad general del negocio
        const [horariosRegulares, excepciones, citasExistentesEnElDia] = await prisma.$transaction([
            prisma.horarioAtencion.findMany({ where: { negocioId } }),
            prisma.excepcionHorario.findMany({ where: { negocioId } }),
            prisma.agenda.findMany({
                where: {
                    negocioId,
                    status: StatusAgenda.PENDIENTE,
                    fecha: {
                        gte: new Date(new Date(fechaDeseada).setHours(0, 0, 0, 0)),
                        lt: new Date(new Date(fechaDeseada).setHours(23, 59, 59, 999)),
                    }
                }
            })
        ]);

        // Lógica de horario laboral
        const diaSemanaJs = fechaDeseada.getDay();
        type DiaSemana = "DOMINGO" | "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO";
        const diaSemanaEnum: DiaSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"][diaSemanaJs] as DiaSemana;
        const fechaDeseadaYYYYMMDD = fechaDeseada.toISOString().split('T')[0];
        const excepcionDelDia = excepciones.find(e => e.fecha.toISOString().startsWith(fechaDeseadaYYYYMMDD));
        let horaInicioStr: string | null = null, horaFinStr: string | null = null;
        if (excepcionDelDia) {
            if (excepcionDelDia.esDiaNoLaborable) return false;
            if (excepcionDelDia.horaInicio && excepcionDelDia.horaFin) {
                horaInicioStr = excepcionDelDia.horaInicio;
                horaFinStr = excepcionDelDia.horaFin;
            }
        } else {
            const horarioRegular = horariosRegulares.find(h => h.dia === diaSemanaEnum);
            if (!horarioRegular) return false;
            horaInicioStr = horarioRegular.horaInicio;
            horaFinStr = horarioRegular.horaFin;
        }
        if (!horaInicioStr || !horaFinStr) return false;
        const inicioDiaLaboral = new Date(`${fechaDeseadaYYYYMMDD}T${horaInicioStr}:00${TIMEZONE_OFFSET}`);
        const finDiaLaboral = new Date(`${fechaDeseadaYYYYMMDD}T${horaFinStr}:00${TIMEZONE_OFFSET}`);
        if (fechaDeseada.getTime() < inicioDiaLaboral.getTime() || finCitaDeseada.getTime() > finDiaLaboral.getTime()) {
            return false;
        }

        // Lógica de concurrencia general
        const limiteConcurrencia = tipoCita.limiteConcurrencia;
        let citasConcurrentes = 0;
        for (const citaExistente of citasExistentesEnElDia) {
            if (citaExistente.id === citaOriginalId) continue;

            const tipoCitaExistente = await prisma.agendaTipoCita.findUnique({ where: { id: citaExistente.tipoDeCitaId! } });
            const duracionExistente = tipoCitaExistente?.duracionMinutos || 30;
            const finCitaExistente = new Date(citaExistente.fecha.getTime() + duracionExistente * 60000);
            if (fechaDeseada < finCitaExistente && finCitaDeseada > citaExistente.fecha) {
                citasConcurrentes++;
            }
        }
        if (citasConcurrentes >= limiteConcurrencia) return false;

        return true;
    } catch (error) {
        console.error("[VERIFICAR DISPONIBILIDAD] Error:", error);
        return false;
    }
}


export function findBestMatchingAppointment(
    userInput: string,
    appointments: { id: string; asunto: string; fecha: Date; tipoDeCitaId?: string | null }[]
): { id: string; asunto: string; fecha: Date; tipoDeCitaId?: string | null } | null {

    const typosComunes: { [key: string]: string } = { 'mates': 'martes', 'miercoles': 'miércoles', 'lal': 'la' };
    let userInputCorregido = userInput.toLowerCase();
    for (const typo in typosComunes) {
        userInputCorregido = userInputCorregido.replace(new RegExp(typo, 'g'), typosComunes[typo]);
    }

    const userKeywords = new Set(userInputCorregido.split(' ').filter(k => k.length >= 1));

    const timeZone = 'America/Mexico_City';
    const formatWeekday = new Intl.DateTimeFormat('es-MX', { weekday: 'long', timeZone });
    const formatDayNumber = new Intl.DateTimeFormat('es-MX', { day: 'numeric', timeZone });
    const formatHour12 = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone });

    let scoredAppointments = appointments.map((cita, index) => {
        let score = 0;
        const fechaCita = new Date(cita.fecha);

        const diaNombre = formatWeekday.format(fechaCita).toLowerCase();
        const diaNumero = formatDayNumber.format(fechaCita);
        const hora12h = formatHour12.format(fechaCita).toLowerCase().replace(/\./g, '').replace(/\s/g, '');

        const profile = new Set([diaNombre, diaNumero, hora12h, ...cita.asunto.toLowerCase().split(' ')]);

        userKeywords.forEach(keyword => {
            if (String(index + 1) === keyword) score += 50;
            if (profile.has(keyword)) score += 5;
            if (hora12h.includes(keyword.replace(/\s/g, ''))) score += 10;
        });

        return { ...cita, score };
    });

    scoredAppointments = scoredAppointments.filter(a => a.score > 0);
    if (scoredAppointments.length === 0) return null;

    const maxScore = Math.max(...scoredAppointments.map(a => a.score));
    const bestMatches = scoredAppointments.filter(a => a.score === maxScore);

    return bestMatches.length === 1 ? bestMatches[0] : null;
}



export function findBestMatchingService(
    userInput: string,
    services: { id: string; nombre: string }[]
): { id: string; nombre: string } | null {

    const userInputCorregido = userInput.toLowerCase();
    // Podemos añadir aquí correcciones de typos comunes si es necesario

    const userKeywords = new Set(userInputCorregido.split(' ').filter(k => k.length > 1));

    let scoredServices = services.map(service => {
        let score = 0;
        const serviceKeywords = new Set(service.nombre.toLowerCase().split(' '));

        userKeywords.forEach(keyword => {
            if (serviceKeywords.has(keyword)) {
                score += 10; // Coincidencia de palabra exacta
            } else {
                // Coincidencia parcial (ej. "info" en "información")
                serviceKeywords.forEach(serviceKeyword => {
                    if (serviceKeyword.includes(keyword)) {
                        score += 5;
                    }
                });
            }
        });

        return { ...service, score };
    });

    scoredServices = scoredServices.filter(a => a.score > 0);
    if (scoredServices.length === 0) return null;

    const maxScore = Math.max(...scoredServices.map(a => a.score));
    const bestMatches = scoredServices.filter(a => a.score === maxScore);

    // Devuelve el resultado solo si hay un único ganador claro
    return bestMatches.length === 1 ? bestMatches[0] : null;
}


