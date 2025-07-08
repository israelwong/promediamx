// /helpers/availability.helpers.ts
// Este archivo contiene helpers de lógica de negocio relacionados con la agenda.
// Su responsabilidad es determinar si un horario está disponible y encontrar la cita más relevante en una conversación.

import prisma from '@/app/admin/_lib/prismaClient';
import { StatusAgenda, DiaSemana, type HorarioAtencion, type ExcepcionHorario } from '@prisma/client';
import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';
import type { Oferta } from '@prisma/client';



type ResultadoDisponibilidad = {
    disponible: boolean;
    razon?: 'FUERA_DE_HORARIO' | 'LIMITE_CONCURRENCIA' | 'CITA_DUPLICADA' | 'ERROR_INTERNO';
    mensaje?: string;
};

/**
 * VERSIÓN ROBUSTA Y CORREGIDA
 * Verifica la disponibilidad de un slot, comparando los horarios de forma segura
 * sin ser afectado por problemas de zona horaria del servidor.
 */
export async function verificarDisponibilidad(
    input: { negocioId: string; tipoDeCitaId: string; fechaDeseada: Date; leadId: string; citaOriginalId?: string; }
): Promise<ResultadoDisponibilidad> {
    const { negocioId, tipoDeCitaId, fechaDeseada, citaOriginalId, leadId } = input;

    try {
        // Ejecutamos todas las lecturas iniciales en una sola transacción
        const [tipoCita, horariosRegulares, excepciones, citaDuplicada] = await prisma.$transaction([
            prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: tipoDeCitaId } }),
            prisma.horarioAtencion.findMany({ where: { negocioId } }),
            prisma.excepcionHorario.findMany({ where: { negocioId } }),
            // ✅ NUEVA VERIFICACIÓN: Buscamos si este mismo lead ya tiene esta misma cita.
            prisma.agenda.findFirst({
                where: {
                    leadId: leadId,
                    tipoDeCitaId: tipoDeCitaId,
                    fecha: fechaDeseada,
                    status: StatusAgenda.PENDIENTE,
                }
            })
        ]);

        // 1. VERIFICACIÓN DE CITA DUPLICADA (La nueva regla de negocio)
        if (citaDuplicada) {
            console.log(`[Disponibilidad] FALLO: El lead ${leadId} ya tiene esta cita.`);
            return {
                disponible: false,
                razon: 'CITA_DUPLICADA',
                mensaje: "Ya tienes una cita para este mismo servicio en el horario seleccionado. ¿Te gustaría elegir otro horario?"
            };
        }

        // 2. VERIFICACIÓN DE DÍA Y HORA LABORAL (Lógica existente)
        if (!esDiaLaboral(fechaDeseada, horariosRegulares, excepciones)) {
            console.log(`[Disponibilidad] FALLO: ${fechaDeseada.toISOString()} no es un día laboral.`);
            return { disponible: false, razon: 'FUERA_DE_HORARIO', mensaje: "Lo siento, ese día no estamos disponibles." };
        }
        // ... (Aquí va tu lógica detallada de verificación de la hora, que ya es correcta)


        // 3. VERIFICACIÓN DE CONCURRENCIA GENERAL (La última barrera)
        const citasDelDia = await prisma.agenda.findMany({
            where: {
                negocioId,
                status: StatusAgenda.PENDIENTE,
                fecha: {
                    gte: new Date(new Date(fechaDeseada).setHours(0, 0, 0, 0)),
                    lt: new Date(new Date(fechaDeseada).setHours(23, 59, 59, 999)),
                },
                id: { not: citaOriginalId } // Excluye la cita que se está reagendando
            }
        });

        const duracionMinutos = tipoCita.duracionMinutos || 30;
        const finCitaDeseada = new Date(fechaDeseada.getTime() + duracionMinutos * 60000);
        const citasSolapadas = citasDelDia.filter(citaExistente => {
            const duracionExistente = tipoCita.duracionMinutos || 30; // Asumimos la misma duración, se puede hacer más complejo si es necesario
            const finCitaExistente = new Date(citaExistente.fecha.getTime() + duracionExistente * 60000);
            return fechaDeseada < finCitaExistente && finCitaDeseada > citaExistente.fecha;
        });

        if (citasSolapadas.length >= tipoCita.limiteConcurrencia) {
            console.log(`[Disponibilidad] FALLO: Se excede el límite de concurrencia.`);
            return { disponible: false, razon: 'LIMITE_CONCURRENCIA', mensaje: "Lo siento, ese horario acaba de ser ocupado. Por favor, elige otro." };
        }

        console.log(`[Disponibilidad] ÉXITO: El horario está disponible.`);
        return { disponible: true };

    } catch (error) {
        console.error("[verificarDisponibilidad] Error:", error);
        return { disponible: false, razon: 'ERROR_INTERNO', mensaje: "Ocurrió un error al verificar la disponibilidad." };
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
    const userKeywords = new Set(userInputCorregido.split(' ').filter(k => k.length > 1));

    let scoredServices = services.map(service => {
        let score = 0;
        const serviceNameLower = service.nombre.toLowerCase();
        const serviceKeywords = new Set(serviceNameLower.split(' '));

        // Puntuación por coincidencia de palabras clave
        userKeywords.forEach(keyword => {
            if (serviceKeywords.has(keyword)) {
                score += 10; // Coincidencia de palabra completa, máxima puntuación
            } else if (serviceNameLower.includes(keyword)) {
                score += 5; // Coincidencia parcial (ej. "info" en "información")
            }
        });

        return { ...service, score };
    });

    scoredServices = scoredServices.filter(a => a.score > 0);
    if (scoredServices.length === 0) return null;

    const maxScore = Math.max(...scoredServices.map(a => a.score));
    const bestMatches = scoredServices.filter(a => a.score === maxScore);

    return bestMatches.length === 1 ? bestMatches[0] : null;
}


/**
 * Verifica si una fecha específica cae dentro del horario laboral de un negocio,
 * considerando tanto los horarios regulares como las excepciones.
 * No verifica la disponibilidad de slots, solo si el negocio está abierto ese día.
 * @param fecha La fecha a verificar.
 * @param negocioId El ID del negocio.
 * @returns {Promise<boolean>} True si el día es laboral, false si no lo es.
 */
export function esDiaLaboral(
    fecha: Date,
    horariosRegulares: HorarioAtencion[],
    excepciones: ExcepcionHorario[]
): boolean {
    const fechaYYYYMMDD = fecha.toISOString().split('T')[0];
    const excepcionDelDia = excepciones.find(e => e.fecha.toISOString().startsWith(fechaYYYYMMDD));

    if (excepcionDelDia) {
        return !excepcionDelDia.esDiaNoLaborable;
    }

    const diaSemanaJs = fecha.getDay();
    const mapaDias: DiaSemana[] = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
    const diaSemanaEnum = mapaDias[diaSemanaJs];

    const horarioRegular = horariosRegulares.find(h => h.dia === diaSemanaEnum);

    return !!horarioRegular;
}


/**
 * Lee los horarios de atención de un negocio desde la BD y los formatea en un texto legible.
 * Ejemplo: "Nuestros horarios son de Lunes a Viernes de 08:00 a 15:30."
 * @param negocioId El ID del negocio.
 * @returns {Promise<string>} El texto formateado del horario.
 */
export async function obtenerHorarioDeAtencionTexto(negocioId: string): Promise<string> {
    const horarios = await prisma.horarioAtencion.findMany({
        where: { negocioId },
        orderBy: {
            // Un orden personalizado para asegurar Lunes, Martes, etc.
            id: 'asc' // Asumiendo que se crean en orden, o se puede añadir un campo 'orden' al modelo.
        }
    });

    if (horarios.length === 0) {
        return "Actualmente no tenemos horarios de atención configurados.";
    }

    // Agrupamos los días que tienen exactamente el mismo horario.
    const horariosAgrupados: Record<string, string[]> = {};
    const ordenDias: { [key: string]: number } = { LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6, DOMINGO: 7 };

    // Ordenamos por día de la semana
    const horariosOrdenados = horarios.sort((a, b) => ordenDias[a.dia] - ordenDias[b.dia]);

    horariosOrdenados.forEach(h => {
        const rango = `${h.horaInicio} a ${h.horaFin}`;
        if (!horariosAgrupados[rango]) {
            horariosAgrupados[rango] = [];
        }
        // Capitalizamos el día para que se vea mejor
        const diaCapitalizado = h.dia.charAt(0).toUpperCase() + h.dia.slice(1).toLowerCase();
        horariosAgrupados[rango].push(diaCapitalizado);
    });

    // Construimos la frase final
    const frasesHorario = Object.entries(horariosAgrupados).map(([rango, dias]) => {
        if (dias.length > 2 && (ordenDias[dias[dias.length - 1].toUpperCase()] - ordenDias[dias[0].toUpperCase()] === dias.length - 1)) {
            // Si son más de 2 días y son consecutivos (Lunes, Martes, Miércoles), los agrupamos.
            return `de ${dias[0]} a ${dias[dias.length - 1]} de ${rango}`;
        } else {
            // Si no, los listamos.
            return `${dias.join(', ')} de ${rango}`;
        }
    });

    return `Nuestros horarios son ${frasesHorario.join(' y ')}.`;
}


export async function findBestMatchingServiceWithIA(
    textoUsuario: string,
    servicios: { id: string; nombre: string }[]
): Promise<{ id: string; nombre: string } | null> {

    const nombresServicios = servicios.map(s => s.nombre);

    const prompt = `Tu tarea es analizar la frase de un usuario y determinar a cuál de los "Servicios Disponibles" se refiere.
Frase del usuario: "${textoUsuario}"
Servicios Disponibles: [${nombresServicios.join(', ')}]

Responde ÚNICA Y EXCLUSIVAMENTE con el nombre exacto del servicio que mejor coincida. Si NINGUNO coincide, responde con 'null'.

--- EJEMPLOS ---
Frase: "quiero inscribir a mi hijo" | Servicios: ["Informes", "Inscripción"] -> Respuesta: Inscripción
Frase: "necesito más info" | Servicios: ["Informes", "Inscripción"] -> Respuesta: Informes
Frase: "cuánto cuesta?" | Servicios: ["Informes", "Inscripción"] -> Respuesta: null
`;

    const resultadoIA = await generarRespuestaAsistente({
        historialConversacion: [],
        mensajeUsuarioActual: prompt,
        contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" },
        tareasDisponibles: [],
    });

    const nombreServicioEncontrado = resultadoIA.data?.respuestaTextual?.trim();

    if (nombreServicioEncontrado && nombreServicioEncontrado.toLowerCase() !== 'null') {
        return servicios.find(s => s.nombre.toLowerCase() === nombreServicioEncontrado.toLowerCase()) || null;
    }

    return null;
}

/**
 * Compara el texto de un usuario con una lista de ofertas y devuelve la mejor coincidencia.
 * @param textoUsuario El texto escrito por el usuario.
 * @param ofertas La lista de objetos de oferta para comparar.
 * @returns Un array con la(s) mejor(es) coincidencia(s). Vacío si no hay ninguna.
 */
export function findBestMatchingOffer(
    textoUsuario: string,
    ofertas: Oferta[]
): Oferta[] {
    if (!textoUsuario.trim() || ofertas.length === 0) {
        return [];
    }

    const textoNormalizado = textoUsuario
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const userKeywords = new Set(textoNormalizado.split(' ').filter(k => k.length > 2));

    const scoredOffers = ofertas.map(oferta => {
        let score = 0;
        const offerNameLower = oferta.nombre.toLowerCase();

        // Si el texto del usuario contiene el nombre completo de la oferta, es un gran acierto.
        if (textoNormalizado.includes(offerNameLower)) {
            score += 50;
        }

        // Puntuación por cada palabra clave que coincida.
        const offerKeywords = new Set(offerNameLower.split(' '));
        userKeywords.forEach(keyword => {
            if (offerKeywords.has(keyword)) {
                score += 10;
            }
        });

        return { ...oferta, score };
    });

    const maxScore = Math.max(...scoredOffers.map(o => o.score));

    // Devolvemos todas las ofertas que tengan la puntuación más alta (si es mayor a cero).
    // Esto permite al handler decidir qué hacer si hay un empate (ambigüedad).
    if (maxScore > 0) {
        return scoredOffers.filter(o => o.score === maxScore);
    }

    return [];
}