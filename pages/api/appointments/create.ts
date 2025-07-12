// /pages/api/appointments/create.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import { StatusAgenda, Prisma } from '@prisma/client';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { enviarEmailConfirmacionCita_v2 } from '@/app/admin/_lib/actions/email/emailv2.actions';
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
    // LOG DE DIAGNÓSTICO #0: ¿Se está alcanzando el handler?
    console.log(`\n--- [DEBUG] API /api/appointments/create HIT ---`);
    console.log(`[DEBUG] Method: ${req.method}`);

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: `Método ${req.method} no permitido` });
    }

    try {
        // LOG DE DIAGNÓSTICO #0.1: ¿Cuál es el cuerpo de la solicitud?
        console.log("[DEBUG] Raw Request Body:", req.body);

        const validation = CreateAppointmentSchema.safeParse(req.body);
        if (!validation.success) {
            // LOG DE DIAGNÓSTICO #0.2: Si la validación falla, lo sabremos.
            console.error("[DEBUG] Zod validation FAILED:", validation.error.flatten());
            return res.status(400).json({ message: "Datos inválidos.", error: "La información enviada no es correcta.", details: validation.error.flatten() });
        }

        console.log("[DEBUG] Zod validation PASSED.");
        const data = validation.data;
        const fechaDeseadaObj = new Date(data.fechaHoraCita);

        if (isBefore(fechaDeseadaObj, new Date())) {
            return res.status(400).json({
                message: "Fecha inválida.",
                error: "No se puede agendar una cita en una fecha que ya pasó."
            });
        }

        const disponibilidad = await verificarDisponibilidad({
            negocioId: data.negocioId,
            tipoDeCitaId: data.tipoDeCitaId,
            fechaDeseada: fechaDeseadaObj,
            leadId: 'LEAD_DESDE_MANYCHAT_CONFIRMACION',
        });

        if (!disponibilidad.disponible) {
            return res.status(409).json({ message: "Conflicto de horario.", error: "Lo sentimos, este horario acaba de ser ocupado. Por favor, elige otro." });
        }

        const jsonParams = {
            colegio: data.colegio,
            grado: data.grado,
            nivel_educativo: data.nivel_educativo,
            source: data.source || 'Formulario Web',
        };

        const primerPipeline = await prisma.pipelineCRM.findFirst({
            where: { crmId: data.crmId },
            orderBy: { orden: 'asc' }
        });

        const lead = await prisma.lead.upsert({
            where: { email: data.email },
            update: {
                nombre: data.nombre,
                telefono: data.telefono,
                jsonParams: jsonParams as Prisma.JsonObject,
            },
            create: {
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                crmId: data.crmId,
                jsonParams: jsonParams as Prisma.JsonObject,
                pipelineId: primerPipeline?.id,
            },
        });

        const [tipoCita, negocio, oferta] = await Promise.all([
            prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: data.tipoDeCitaId } }),
            prisma.negocio.findUniqueOrThrow({
                where: { id: data.negocioId },
                include: { AsistenteVirtual: true }
            }),
            prisma.oferta.findUnique({ where: { id: data.ofertaId } })
        ]);

        if (!oferta) {
            return res.status(404).json({ message: "Oferta no encontrada." });
        }

        console.log("DEBUG: Objeto 'oferta' recuperado de la BD:", oferta);

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

            const asistenteActivo = negocio.AsistenteVirtual;
            const numeroWhatsappAsistente = asistenteActivo?.whatsappBusiness?.replace(/\D/g, '');
            let linkCancelarWhatsApp: string | undefined, linkReagendarWhatsApp: string | undefined;

            if (numeroWhatsappAsistente) {
                const fechaFormateadaParaLink = new Date(nuevaCita.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' });
                const textoCancelar = `Quiero "cancelar" mi cita de "${tipoCita.nombre}" del ${fechaFormateadaParaLink}.`;
                const textoReagendar = `Quiero "reagendar" mi cita de "${tipoCita.nombre}" del ${fechaFormateadaParaLink}.`;
                linkCancelarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoCancelar)}`;
                linkReagendarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoReagendar)}`;
            }

            const emailProps = {
                emailDestinatario: lead.email,
                nombreDestinatario: lead.nombre,
                nombreNegocio: negocio.nombre,
                nombreServicio: tipoCita.nombre,
                // ✅ Se añade el nombre de la oferta
                nombreOferta: oferta.nombre,
                fechaHoraCita: nuevaCita.fecha,
                detallesAdicionales: detallesAdicionales,
                emailRespuestaNegocio: negocio.email || 'contacto@promedia.mx',
                linkCancelar: linkCancelarWhatsApp,
                linkReagendar: linkReagendarWhatsApp,
                emailCopia: oferta.emailCopiaConfirmacion,
                nombrePersonaContacto: oferta.nombrePersonaContacto,
                telefonoContacto: oferta.telefonoContacto,
                modalidadCita: oferta.googleMapsUrl ? 'presencial' as const : (oferta.linkReunionVirtual ? 'virtual' as const : undefined),
                ubicacionCita: oferta.direccionUbicacion,
                googleMapsUrl: oferta.googleMapsUrl,
                linkReunionVirtual: oferta.linkReunionVirtual,
                duracionCitaMinutos: tipoCita.duracionMinutos,
            };

            console.log("DEBUG: Props enviadas a la acción de email:", emailProps);

            await enviarEmailConfirmacionCita_v2(emailProps);
        }

        return res.status(201).json({ message: 'Cita creada exitosamente.', data: { citaId: nuevaCita.id } });

    } catch (error) {
        console.error("Error en API de creación de citas:", error);
        return res.status(500).json({ message: "Error interno del servidor.", error: 'No se pudo procesar la solicitud.' });
    }
}
