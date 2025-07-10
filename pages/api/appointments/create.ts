// /pages/api/appointments/create.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import { StatusAgenda, Prisma } from '@prisma/client';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { enviarEmailConfirmacionCita } from '@/app/admin/_lib/actions/email/email.actions';
import { revalidatePath } from 'next/cache';
import { isBefore } from 'date-fns'; // Importamos el helper para comparar fechas

// Schema que valida todos los campos que esperamos recibir desde ManyChat
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
    colegio: z.string().optional(),
    grado: z.string().optional(),
    nivel_educativo: z.string().optional(),
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

        // ✅ VALIDACIÓN CRÍTICA: Añadimos la verificación de fecha pasada aquí también.
        if (isBefore(fechaDeseadaObj, new Date())) {
            return res.status(400).json({
                message: "Fecha inválida.",
                error: "No se puede agendar una cita en una fecha que ya pasó."
            });
        }

        // Doble verificación de disponibilidad en el servidor
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

        const [tipoCita, negocio] = await Promise.all([
            prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: data.tipoDeCitaId } }),
            prisma.negocio.findUniqueOrThrow({
                where: { id: data.negocioId },
                include: { AsistenteVirtual: true }
            })
        ]);

        const descripcionEnriquecida = `Cita desde ManyChat. Colegio: ${data.colegio || 'N/A'}, Nivel: ${data.nivel_educativo || 'N/A'}, Grado: ${data.grado || 'N/A'}.`;

        const nuevaCita = await prisma.agenda.create({
            data: {
                negocioId: data.negocioId,
                leadId: lead.id,
                fecha: fechaDeseadaObj,
                asunto: `Cita para: ${tipoCita.nombre}`,
                descripcion: descripcionEnriquecida,
                tipoDeCitaId: data.tipoDeCitaId,
                status: StatusAgenda.PENDIENTE,
                tipo: 'Cita ManyChat',
            }
        });

        if (lead.email) {
            let detallesAdicionales = '';
            if (data.colegio) detallesAdicionales += `<p><b>Colegio:</b> ${data.colegio}</p>`;
            if (data.nivel_educativo) detallesAdicionales += `<p><b>Nivel:</b> ${data.nivel_educativo}</p>`;
            if (data.grado) detallesAdicionales += `<p><b>Grado:</b> ${data.grado}</p>`;

            let linkCancelarWhatsApp: string | undefined;
            let linkReagendarWhatsApp: string | undefined;

            const asistenteActivo = negocio.AsistenteVirtual;
            const numeroWhatsappAsistente = asistenteActivo?.whatsappBusiness?.replace(/\D/g, '');

            if (numeroWhatsappAsistente) {
                const fechaFormateadaParaLink = new Date(nuevaCita.fecha).toLocaleString('es-MX', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                    timeZone: 'America/Mexico_City'
                });
                const textoCancelar = `Quiero "cancelar" mi cita de "${tipoCita.nombre}" del ${fechaFormateadaParaLink}.`;
                const textoReagendar = `Quiero "reagendar" mi cita de "${tipoCita.nombre}" del ${fechaFormateadaParaLink}.`;

                linkCancelarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoCancelar)}`;
                linkReagendarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoReagendar)}`;
            }

            await enviarEmailConfirmacionCita({
                emailDestinatario: lead.email,
                nombreDestinatario: lead.nombre,
                nombreNegocio: negocio.nombre,
                nombreServicio: tipoCita.nombre,
                fechaHoraCita: nuevaCita.fecha,
                detallesAdicionales: detallesAdicionales,
                emailRespuestaNegocio: negocio.email || 'contacto@promedia.mx',
                linkCancelar: linkCancelarWhatsApp,
                linkReagendar: linkReagendarWhatsApp,
            });
        }

        if (negocio.clienteId) {
            const pathToRevalidate = `/admin/clientes/${negocio.clienteId}/negocios/${data.negocioId}/citas`;
            revalidatePath(pathToRevalidate);
        }

        return res.status(201).json({ message: 'Cita creada exitosamente.', data: { citaId: nuevaCita.id } });

    } catch (error) {
        console.error("Error en API de creación de citas:", error);
        return res.status(500).json({ message: "Error interno del servidor.", error: 'No se pudo procesar la solicitud.' });
    }
}
