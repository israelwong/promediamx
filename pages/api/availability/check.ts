// Ruta: /pages/api/availability/check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/app/admin/_lib/prismaClient';
import { addDays, format, startOfDay, eachDayOfInterval, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    checkAvailabilityQuerySchema,
    type AvailabilityApiResponse,
    type DiaDisponible,
    type BloqueHorario
} from '@/app/admin/_lib/actions/availability/availability.schemas';
import { esDiaLaboral } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';

// ✅ CORREGIDO: Se utiliza una función de normalización más robusta y estándar.
// Esta función elimina todos los acentos y diacríticos de un string.
const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<AvailabilityApiResponse>
) {

    // --- AÑADE ESTE BLOQUE PARA HABILITAR CORS ---
    // En producción, es mejor reemplazar '*' con el dominio real de tu sitio web.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Se maneja la petición pre-vuelo (preflight) de CORS.
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: `Método ${req.method} no permitido` });
    }

    try {
        const validation = checkAvailabilityQuerySchema.safeParse(req.query);
        if (!validation.success) {
            return res.status(400).json({ message: "Parámetros inválidos.", details: validation.error.flatten() });
        }

        const { negocioId, diasAConsultar } = validation.data;

        const negocioData = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                id: true,
                nombre: true,
                horariosAtencion: true,
                excepcionesHorario: true,
                agenda: {
                    where: { status: 'PENDIENTE', fecha: { gte: new Date() } },
                    select: { fecha: true, tipoDeCitaId: true }
                },
                ofertas: {
                    where: { status: 'ACTIVO' },
                    select: {
                        id: true,
                        nombre: true,
                        serviciosDeCita: {
                            select: {
                                agendaTipoCita: {
                                    select: { id: true, nombre: true, duracionMinutos: true, limiteConcurrencia: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!negocioData) {
            return res.status(404).json({ message: "Negocio no encontrado." });
        }

        const ahora = new Date();
        const horaMinimaParaAgendar = new Date(ahora.getTime() + 60 * 60 * 1000); // 1 hora desde ahora

        const hoy = startOfDay(ahora);
        const fechaFinConsulta = addDays(hoy, diasAConsultar);
        const rangoDeDias = eachDayOfInterval({ start: hoy, end: fechaFinConsulta });

        const ofertasConDisponibilidad = negocioData.ofertas.map(oferta => {
            const tiposDeCitaConDisponibilidad = oferta.serviciosDeCita.map(servicio => {
                const tipoCita = servicio.agendaTipoCita;
                const diasDisponibles: DiaDisponible[] = [];

                for (const dia of rangoDeDias) {
                    if (!esDiaLaboral(dia, negocioData.horariosAtencion, negocioData.excepcionesHorario)) continue;

                    const horariosDelDia: BloqueHorario[] = [];

                    // ✅ CORREGIDO: Se normaliza el nombre del día para una comparación segura.
                    const diaSemana = normalizeString(format(dia, 'EEEE', { locale: es })).toUpperCase();

                    const horarioLaboral = negocioData.horariosAtencion.find(h => h.dia === diaSemana);
                    if (!horarioLaboral) continue;

                    const duracionCita = tipoCita.duracionMinutos || 60;
                    const [horaInicio, minutoInicio] = horarioLaboral.horaInicio.split(':').map(Number);
                    const [horaFin, minutoFin] = horarioLaboral.horaFin.split(':').map(Number);

                    let horaActual = setMinutes(setHours(dia, horaInicio), minutoInicio);
                    const horaFinalDelDia = setMinutes(setHours(dia, horaFin), minutoFin);

                    while (horaActual < horaFinalDelDia) {
                        if (horaActual < horaMinimaParaAgendar) {
                            horaActual = new Date(horaActual.getTime() + duracionCita * 60000);
                            continue;
                        }

                        const finBloqueActual = new Date(horaActual.getTime() + duracionCita * 60000);
                        const citasSolapadas = negocioData.agenda.filter(cita =>
                            cita.tipoDeCitaId === tipoCita.id &&
                            horaActual < new Date(cita.fecha.getTime() + duracionCita * 60000) &&
                            finBloqueActual > cita.fecha
                        );

                        if (citasSolapadas.length < tipoCita.limiteConcurrencia) {
                            horariosDelDia.push({
                                hora: format(horaActual, 'HH:mm'),
                                fechaCompletaISO: horaActual.toISOString(),
                            });
                        }
                        horaActual = new Date(horaActual.getTime() + duracionCita * 60000);
                    }

                    if (horariosDelDia.length > 0) {
                        diasDisponibles.push({
                            fecha: format(dia, 'yyyy-MM-dd'),
                            nombreDia: format(dia, 'EEEE', { locale: es }),
                            horarios: horariosDelDia,
                        });
                    }
                }
                return {
                    id: tipoCita.id,
                    nombre: tipoCita.nombre,
                    duracionMinutos: tipoCita.duracionMinutos,
                    diasDisponibles,
                };
            });

            return {
                id: oferta.id,
                nombre: oferta.nombre,
                tiposDeCita: tiposDeCitaConDisponibilidad,
            };
        });

        return res.status(200).json({
            message: 'Disponibilidad consultada exitosamente.',
            data: {
                negocio: {
                    id: negocioData.id,
                    nombre: negocioData.nombre,
                },
                ofertas: ofertasConDisponibilidad,
            }
        });

    } catch (error) {
        console.error("Error en API de disponibilidad:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
}
