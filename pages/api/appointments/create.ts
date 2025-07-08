// /pages/api/appointments/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import { StatusAgenda } from '@prisma/client';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { enviarEmailConfirmacionCita } from '@/app/admin/_lib/actions/email/email.actions';


const schema = z.object({
    nombre: z.string().min(3),
    email: z.string().email(),
    telefono: z.string().min(10),
    fechaHoraCita: z.string().datetime(),
    tipoDeCitaId: z.string().cuid(),
    negocioId: z.string().cuid(),
    crmId: z.string().cuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const validation = schema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Datos inválidos.", details: validation.error.flatten() });
        }
        const data = validation.data;

        // 1. Doble verificación de disponibilidad en el servidor (muy importante)
        const disponibilidad = await verificarDisponibilidad({
            negocioId: data.negocioId,
            tipoDeCitaId: data.tipoDeCitaId,
            fechaDeseada: new Date(data.fechaHoraCita),
            leadId: 'FORMULARIO_WEB_LEAD_CONFIRMACION',
        });

        if (!disponibilidad.disponible) {
            return res.status(409).json({ error: "Horario no disponible.", message: "Lo sentimos, este horario acaba de ser ocupado. Por favor, elige otro." });
        }

        // 2. Buscamos o creamos el Lead
        const lead = await prisma.lead.upsert({
            where: { email: data.email },
            update: { nombre: data.nombre, telefono: data.telefono },
            create: {
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                crmId: data.crmId,
            }
        });

        // 3. Creamos la Cita
        const [tipoCita, negocio] = await Promise.all([
            prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: data.tipoDeCitaId } }),
            prisma.negocio.findUniqueOrThrow({ where: { id: data.negocioId } })
        ]);

        const nuevaCita = await prisma.agenda.create({
            data: {
                negocioId: data.negocioId,
                leadId: lead.id,
                fecha: new Date(data.fechaHoraCita),
                asunto: `Cita para: ${tipoCita.nombre}`,
                descripcion: `Cita creada desde formulario web.`,
                tipoDeCitaId: data.tipoDeCitaId,
                status: StatusAgenda.PENDIENTE,
                tipo: 'Cita', // ✅ CAMPO OBLIGATORIO AÑADIDO
            }
        });

        // 4. (Opcional pero recomendado) Enviar correo de confirmación
        await enviarEmailConfirmacionCita({
            emailDestinatario: lead.email!,
            nombreDestinatario: lead.nombre,
            nombreNegocio: negocio.nombre,
            nombreServicio: tipoCita.nombre,
            fechaHoraCita: nuevaCita.fecha,
            emailRespuestaNegocio: negocio.email || 'contacto@promedia.mx'
        });

        return res.status(201).json({ message: 'Cita creada exitosamente.', data: { citaId: nuevaCita.id } });

    } catch (error) {
        console.error("Error en API de creación de citas:", error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}