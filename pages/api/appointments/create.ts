// /pages/api/appointments/create.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import { StatusAgenda, Prisma } from '@prisma/client';
// ✅ Se vuelve a utilizar el helper de disponibilidad que ya funcionaba.
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { enviarEmailConfirmacionCita_v3 } from '@/app/admin/_lib/actions/email/emailv3.actions';
import { isBefore } from 'date-fns';

const CreateAppointmentSchema = z.object({
    nombre: z.string().min(3, "El nombre es requerido."),
    email: z.string().email("El formato del email es inválido."),
    telefono: z.string().min(10, "El teléfono debe tener al menos 10 dígitos."),
    fechaHoraCita: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha debe ser un string de fecha válido.",
    }),
    tipoDeCitaId: z.string().cuid(),
    negocioId: z.string().cuid(),
    crmId: z.string().cuid(),
    ofertaId: z.string().cuid("El ID de la oferta es requerido."),
    colegio: z.string().optional(),
    grado: z.string().optional(),
    nivel_educativo: z.string().optional(),
    source: z.string().optional(),
});

type ApiResponse = {
    message: string;
    data?: { citaId: string };
    error?: string;
    details?: unknown;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Método ${req.method} no permitido` });
    }

    try {
        const validation = CreateAppointmentSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Datos inválidos.", error: "La información enviada no es correcta.", details: validation.error.flatten() });
        }

        const data = validation.data;
        const fechaDeseadaObj = new Date(data.fechaHoraCita);

        if (isBefore(fechaDeseadaObj, new Date())) {
            return res.status(400).json({
                message: "Fecha inválida.",
                error: "No se puede agendar una cita en una fecha que ya pasó."
            });
        }

        // Se mantiene la llamada al helper original
        const disponibilidad = await verificarDisponibilidad({
            negocioId: data.negocioId,
            tipoDeCitaId: data.tipoDeCitaId,
            fechaDeseada: fechaDeseadaObj,
            leadId: 'LEAD_DESDE_MANYCHAT_CONFIRMACION',
        });

        if (!disponibilidad.disponible) {
            return res.status(409).json({ message: "Conflicto de horario.", error: "Lo sentimos, este horario acaba de ser ocupado. Por favor, elige otro." });
        }

        // ✅ REFACTOR 1: Limpiar el número de teléfono para obtener los últimos 10 dígitos.
        const telefonoLimpio = data.telefono.replace(/\D/g, '').slice(-10);

        const jsonParams = {
            colegio: data.colegio,
            grado: data.grado,
            nivel_educativo: data.nivel_educativo,
            source: data.source || 'Formulario Web',
        };

        const pipelineAgendado = await prisma.pipelineCRM.findFirst({
            where: { crmId: data.crmId, nombre: 'Agendado' }
        });
        const primerPipeline = pipelineAgendado ? null : await prisma.pipelineCRM.findFirst({
            where: { crmId: data.crmId },
            orderBy: { orden: 'asc' }
        });
        const pipelineIdFinal = pipelineAgendado?.id || primerPipeline?.id;

        const lead = await prisma.lead.upsert({
            where: { email: data.email },
            update: { nombre: data.nombre, telefono: telefonoLimpio, jsonParams: jsonParams as Prisma.JsonObject, pipelineId: pipelineIdFinal },
            create: { nombre: data.nombre, email: data.email, telefono: telefonoLimpio, crmId: data.crmId, jsonParams: jsonParams as Prisma.JsonObject, pipelineId: pipelineIdFinal },
        });

        const [tipoCita, negocio, oferta] = await Promise.all([
            prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: data.tipoDeCitaId } }),
            prisma.negocio.findUniqueOrThrow({
                where: { id: data.negocioId },
            }),
            prisma.oferta.findUnique({ where: { id: data.ofertaId } })
        ]);

        if (!oferta) {
            return res.status(404).json({ message: "Oferta no encontrada." });
        }

        const descripcionEnriquecida = `Cita desde ${jsonParams.source}. Colegio: ${data.colegio || 'N/A'}, Nivel: ${data.nivel_educativo || 'N/A'}, Grado: ${data.grado || 'N/A'}.`;

        const nuevaCita = await prisma.agenda.create({
            data: {
                negocioId: data.negocioId,
                leadId: lead.id,
                fecha: fechaDeseadaObj,
                asunto: `Cita para: ${tipoCita.nombre}`,
                descripcion: descripcionEnriquecida,
                tipoDeCitaId: data.tipoDeCitaId,
                status: StatusAgenda.PENDIENTE,
                tipo: `Cita ${jsonParams.source}`,
            }
        });

        if (lead.email) {
            let detallesAdicionales = '';
            if (data.colegio) detallesAdicionales += `<p><b>Colegio:</b> ${data.colegio}</p>`;
            if (data.nivel_educativo) detallesAdicionales += `<p><b>Nivel:</b> ${data.nivel_educativo}</p>`;
            if (data.grado) detallesAdicionales += `<p><b>Grado:</b> ${data.grado}</p>`;

            const emailProps = {
                emailDestinatario: lead.email,
                nombreDestinatario: lead.nombre,
                nombreNegocio: negocio.nombre,
                nombreServicio: tipoCita.nombre,
                nombreOferta: oferta.nombre,
                fechaHoraCita: nuevaCita.fecha,
                detallesAdicionales: detallesAdicionales,
                emailRespuestaNegocio: negocio.email || 'contacto@promedia.mx',
                // ✅ REFACTOR 2: Se omiten los links de Cancelar y Reagendar
                // linkCancelar: undefined,
                // linkReagendar: undefined,
                emailCopia: oferta.emailCopiaConfirmacion,
                nombrePersonaContacto: oferta.nombrePersonaContacto,
                telefonoContacto: oferta.telefonoContacto,
                modalidadCita: oferta.googleMapsUrl ? 'presencial' as const : (oferta.linkReunionVirtual ? 'virtual' as const : undefined),
                ubicacionCita: oferta.direccionUbicacion,
                googleMapsUrl: oferta.googleMapsUrl,
                linkReunionVirtual: oferta.linkReunionVirtual,
                duracionCitaMinutos: tipoCita.duracionMinutos,
            };

            await enviarEmailConfirmacionCita_v3(emailProps);
        }

        return res.status(201).json({ message: 'Cita creada exitosamente.', data: { citaId: nuevaCita.id } });

    } catch (error) {
        console.error("Error en API de creación de citas:", error);
        return res.status(500).json({ message: "Error interno del servidor.", error: 'No se pudo procesar la solicitud.' });
    }
}
