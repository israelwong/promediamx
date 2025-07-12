// app/admin/_lib/actions/email/email.actions.ts

import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { z } from 'zod';
import type { ActionResult } from '@/app/admin/_lib/types';
import { ConfirmacionCitaEmail_v2 } from '@/app/emails/ConfirmacionCitaEmail_v2';

const resend = new Resend(process.env.RESEND_API_KEY);

// --- Schema para el correo v2 ---
const EnviarConfirmacionCita_v2_InputSchema = z.object({
    emailDestinatario: z.string().email(),
    nombreDestinatario: z.string(),
    nombreNegocio: z.string(),
    logoNegocioUrl: z.string().url().optional(),
    nombreServicio: z.string(),
    nombreOferta: z.string(),
    fechaHoraCita: z.date(),
    detallesAdicionales: z.string().optional(),
    emailRespuestaNegocio: z.string().email(),
    linkCancelar: z.string().url().optional(),
    linkReagendar: z.string().url().optional(),

    emailCopia: z.string().email().nullable().optional(),
    nombrePersonaContacto: z.string().nullable().optional(),
    telefonoContacto: z.string().nullable().optional(),
    modalidadCita: z.enum(['presencial', 'virtual']).optional(),
    ubicacionCita: z.string().nullable().optional(),
    googleMapsUrl: z.string().url().nullable().optional(),
    linkReunionVirtual: z.string().url().nullable().optional(),
    duracionCitaMinutos: z.number().int().nullable().optional(),
});

type EnviarConfirmacionCita_v2_Input = z.infer<typeof EnviarConfirmacionCita_v2_InputSchema>;

/**
 * ✅ NUEVA ACCIÓN v2: Envía el correo de confirmación de cita con datos enriquecidos.
 */
export async function enviarEmailConfirmacionCita_v2(
    input: EnviarConfirmacionCita_v2_Input
): Promise<ActionResult<string | null>> {

    const validationResult = EnviarConfirmacionCita_v2_InputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Error de validación en enviarEmailConfirmacionCita_v2:", validationResult.error.flatten());
        return { success: false, error: "Datos inválidos para enviar correo v2." };
    }

    const props = validationResult.data;

    try {
        const emailHtml = await render(React.createElement(ConfirmacionCitaEmail_v2, props));

        const ccEmail = props.emailCopia ? [props.emailCopia] : undefined;

        // ✅ Se actualiza el 'subject' del correo para ser más descriptivo.
        const subject = `Cita confirmada para ${props.nombreDestinatario} en ${props.nombreOferta}`;

        const { data, error } = await resend.emails.send({
            from: `${props.nombreNegocio} <citas@promedia.mx>`,
            to: [props.emailDestinatario],
            cc: ccEmail,
            subject: subject,
            replyTo: props.emailRespuestaNegocio,
            html: emailHtml,
        });

        if (error) {
            console.error("Error al enviar correo v2 desde Resend:", error);
            return { success: false, error: error.message || "Error del servicio de email." };
        }

        console.log(`Correo v2 de confirmación enviado a ${props.emailDestinatario}. ID: ${data?.id}`);
        if (ccEmail) {
            console.log(`Copia v2 enviada a: ${ccEmail.join(', ')}`);
        }
        return { success: true, data: data?.id || null };

    } catch (error: unknown) {
        console.error("Error catastrófico en enviarEmailConfirmacionCita_v2:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo renderizar o enviar el correo v2." };
    }
}
