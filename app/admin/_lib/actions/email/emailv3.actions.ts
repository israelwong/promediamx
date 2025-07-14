// app/admin/_lib/actions/email/emailv3.actions.ts

import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { z } from 'zod';
import type { ActionResult } from '@/app/admin/_lib/types';
// ✅ Se importará la nueva plantilla de correo v3
import { ConfirmacionCitaEmail_v3 } from '@/app/emails/ConfirmacionCitaEmail_v3';

const resend = new Resend(process.env.RESEND_API_KEY);

// --- ✅ NUEVO Schema para el correo v3 ---
const EnviarConfirmacionCita_v3_InputSchema = z.object({
    emailDestinatario: z.string().email(),
    nombreDestinatario: z.string(),
    nombreNegocio: z.string(),
    logoNegocioUrl: z.string().url().optional(),
    nombreServicio: z.string(),
    nombreOferta: z.string(),
    fechaHoraCita: z.date(),
    detallesAdicionales: z.string().optional(),
    emailRespuestaNegocio: z.string().email(),

    // ❌ Campos 'linkCancelar' y 'linkReagendar' eliminados

    emailCopia: z.string().email().nullable().optional(),
    nombrePersonaContacto: z.string().nullable().optional(),
    telefonoContacto: z.string().nullable().optional(),
    modalidadCita: z.enum(['presencial', 'virtual']).optional(),
    ubicacionCita: z.string().nullable().optional(),
    googleMapsUrl: z.string().url().nullable().optional(),
    linkReunionVirtual: z.string().url().nullable().optional(),
    duracionCitaMinutos: z.number().int().nullable().optional(),
});

type EnviarConfirmacionCita_v3_Input = z.infer<typeof EnviarConfirmacionCita_v3_InputSchema>;

/**
 * ✅ NUEVA ACCIÓN v3: Envía el correo de confirmación de cita simplificado.
 */
export async function enviarEmailConfirmacionCita_v3(
    input: EnviarConfirmacionCita_v3_Input
): Promise<ActionResult<string | null>> {

    const validationResult = EnviarConfirmacionCita_v3_InputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Error de validación en enviarEmailConfirmacionCita_v3:", validationResult.error.flatten());
        return { success: false, error: "Datos inválidos para enviar correo v3." };
    }

    const props = validationResult.data;

    try {
        const emailHtml = await render(React.createElement(ConfirmacionCitaEmail_v3, props));

        const ccEmail = props.emailCopia ? [props.emailCopia] : undefined;

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
            console.error("Error al enviar correo v3 desde Resend:", error);
            return { success: false, error: error.message || "Error del servicio de email." };
        }

        console.log(`Correo v3 de confirmación enviado a ${props.emailDestinatario}. ID: ${data?.id}`);
        if (ccEmail) {
            console.log(`Copia v3 enviada a: ${ccEmail.join(', ')}`);
        }
        return { success: true, data: data?.id || null };

    } catch (error: unknown) {
        console.error("Error catastrófico en enviarEmailConfirmacionCita_v3:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo renderizar o enviar el correo v3." };
    }
}
