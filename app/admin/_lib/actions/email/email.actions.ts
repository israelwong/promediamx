// app/admin/_lib/actions/email/email.actions.ts
'use server';

import React from 'react';
import { render } from '@react-email/render';
import { resend } from '@/app/lib/mailClient'; // Tu cliente Resend inicializado
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    EnviarConfirmacionPagoInputSchema,
    type EnviarConfirmacionPagoInput,

    EnviarConfirmacionCitaInputSchema,
    type EnviarConfirmacionCitaInput,

    EnviarCancelacionCitaInputSchema,
    type EnviarCancelacionCitaInput,

} from './email.schemas';

import { z } from 'zod';

import { EnviarReagendamientoCitaInputSchema, type EnviarReagendamientoCitaInput } from './email.schemas';


// Plantillas componentes de email
import { ConfirmacionPagoEmail } from '@/app/emails/ConfirmacionPagoEmail';
import { CancelacionCitaEmail } from '@/app/emails/CancelacionCitaEmail';
import { ReagendamientoCitaEmail } from '@/app/emails/ReagendamientoCitaEmail';
import { ConfirmacionCitaEmail } from '@/app/emails/ConfirmacionCitaEmail';
import { ConfirmacionCitaEmail_v2 } from '@/app/emails/ConfirmacionCitaEmail_v2'; // Importa la nueva plantilla v2

//! Acción para enviar correo de confirmación de pago

export async function enviarEmailConfirmacionCita(
    input: EnviarConfirmacionCitaInput
): Promise<ActionResult<string | null>> {

    const validationResult = EnviarConfirmacionCitaInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Error de validación en enviarEmailConfirmacionCitaAction:", validationResult.error.flatten());
        return { success: false, error: "Datos de entrada inválidos para enviar correo de cita.", errorDetails: validationResult.error.flatten().fieldErrors };
    }

    // Asegúrate de que modalidadCita esté presente en los props
    const modalidadCita: "presencial" | "virtual" =
        validationResult.data.modalidadCita === "virtual" ? "virtual" : "presencial";
    const props = {
        ...validationResult.data,
        modalidadCita
    };

    try {
        const emailHtml = await render(React.createElement(ConfirmacionCitaEmail, props));

        const { data, error } = await resend.emails.send({
            from: `${props.nombreNegocio} vía ProMedia <citas@promedia.mx>`, // Dominio/subdominio verificado
            to: [props.emailDestinatario],
            subject: `Tu cita para "${props.nombreServicio}" ha sido confirmada`,
            replyTo: props.emailRespuestaNegocio,
            html: emailHtml,
        });

        if (error) {
            console.error("Error al enviar correo de cita desde Resend:", error);
            return { success: false, error: error.message || "Error del servicio de email." };
        }

        console.log(`Correo de confirmación de cita enviado a ${props.emailDestinatario}. ID: ${data?.id}`);
        return { success: true, data: data?.id || null };

    } catch (error: unknown) {
        console.error("Error catastrófico en enviarEmailConfirmacionCitaAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "No se pudo enviar el correo de confirmación de cita." };
    }
}


export async function enviarEmailCancelacionCita(
    input: EnviarCancelacionCitaInput
): Promise<ActionResult<string | null>> {
    const validationResult = EnviarCancelacionCitaInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos para correo de cancelación." };
    }
    const props = validationResult.data;
    try {
        const emailHtml = await render(React.createElement(CancelacionCitaEmail, props));
        const { data, error } = await resend.emails.send({
            from: `${props.nombreNegocio} <cancelaciones@promedia.mx>`,
            to: [props.emailDestinatario],
            subject: `Confirmación de cancelación de tu cita en ${props.nombreNegocio}`,
            replyTo: props.emailRespuestaNegocio,
            html: emailHtml,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data: data?.id || null };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Error al enviar correo." };
    }
}


export async function enviarEmailReagendamientoAction(
    input: EnviarReagendamientoCitaInput
): Promise<ActionResult<string | null>> {
    const validationResult = EnviarReagendamientoCitaInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos para correo de reagendamiento." };
    }
    const props = validationResult.data;
    try {
        const emailHtml = await render(React.createElement(ReagendamientoCitaEmail, props));
        const { data, error } = await resend.emails.send({
            from: `${props.nombreNegocio} <citas@promedia.mx>`,
            to: [props.emailDestinatario],
            subject: `Tu cita de "${props.nombreServicio}" ha sido reagendada`,
            replyTo: props.emailRespuestaNegocio,
            html: emailHtml,
        });
        if (error) return { success: false, error: error.message };
        return { success: true, data: data?.id || null };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Error al enviar correo." };
    }
}

export async function enviarCorreoConfirmacionPagoAction(
    input: EnviarConfirmacionPagoInput
): Promise<ActionResult<string | null>> { // Devuelve el ID del mensaje de Resend o null

    const validationResult = EnviarConfirmacionPagoInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Error de validación en enviarCorreoConfirmacionPagoAction:", validationResult.error.flatten());
        return { success: false, error: "Datos de entrada inválidos para enviar correo.", errorDetails: validationResult.error.flatten().fieldErrors };
    }

    const {
        emailComprador,
        nombreComprador,
        nombreNegocio,
        logoNegocioUrl,
        emailRespuestaNegocio,
        conceptoPrincipal,
        montoPagado,
        moneda,
        idTransaccionStripe,
        linkDetallesPedidoEnVitrina,
        // nombrePlataforma = "ProMedia", // Default si no se pasa
        // urlPlataforma = process.env.NEXT_PUBLIC_APP_URL || "[https://promedia.mx](https://promedia.mx)" // URL base de tu app
    } = validationResult.data;

    try {

        //Renderizar componente email con los datos
        const emailComponent = await ConfirmacionPagoEmail({
            nombreComprador,
            nombreNegocio,
            logoNegocioUrl,
            conceptoPrincipal,
            montoPagado,
            moneda,
            idTransaccionStripe,
            linkDetallesPedidoEnVitrina,
            // nombrePlataforma,
            // urlPlataforma,
            // emailSoportePlataforma: `soporte@${new URL(urlPlataforma).hostname}` // Deriva el email de soporte del dominio
            emailSoportePlataforma: `soporte.pagos@promedia.mx` // Deriva el email de soporte del dominio
        });
        const emailHtml = await render(emailComponent);

        // Configurar el remitente. Ej: "Nombre del Negocio vía ProMedia <notificaciones@promedia.mx>"
        // Asegúrate que el dominio @promedia.mx (o el que uses) esté verificado en Resend.
        // const clean = (str: string) => str.replace(/[<>"]/g, '').trim();
        // const fromAddress = `${clean(nombreNegocio)} a través  de Promedia México <no-reply@promedia.mx>`;
        // El Reply-To debe ser el email del negocio para que las respuestas del cliente le lleguen a él.
        const replyTo = emailRespuestaNegocio;

        // console.log(`[Email Action] Enviando confirmación de pago a: ${emailComprador}`);
        // console.log(`[Email Action] Desde: ${fromAddress}, Responder a: ${replyTo}`);

        const { data, error } = await resend.emails.send({
            from: `${nombreNegocio} || Recibo de pago vía <contacto@promedia.mx>`,
            to: [emailComprador],
            subject: `Confirmación de tu pago: ${conceptoPrincipal} en ${nombreNegocio}`,
            replyTo: replyTo,
            html: emailHtml,
        });

        if (error) {
            console.error("Error al enviar correo desde Resend:", error);
            return { success: false, error: error.message || "Error del servicio de email." };
        }

        console.log(`Correo de confirmación enviado a ${emailComprador}. ID de Resend: ${data?.id}`);
        return { success: true, data: data?.id || null };

    } catch (error: unknown) {
        console.error("Error catastrófico en enviarCorreoConfirmacionPagoAction:", error);
        let errorMessage = "No se pudo enviar el correo de confirmación.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}


// --- ✅ NUEVO Schema para el correo v2 ---
const EnviarConfirmacionCita_v2_InputSchema = z.object({
    emailDestinatario: z.string().email(),
    nombreDestinatario: z.string(),
    nombreNegocio: z.string(),
    logoNegocioUrl: z.string().url().optional(),
    nombreServicio: z.string(),
    fechaHoraCita: z.date(),
    detallesAdicionales: z.string().optional(),
    emailRespuestaNegocio: z.string().email(),
    linkCancelar: z.string().url().optional(),
    linkReagendar: z.string().url().optional(),

    // --- Campos Enriquecidos de la Oferta ---
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

        const { data, error } = await resend.emails.send({
            from: `${props.nombreNegocio} <citas@promedia.mx>`,
            to: [props.emailDestinatario],
            cc: ccEmail,
            subject: `Confirmación de Cita: ${props.nombreServicio} en ${props.nombreNegocio}`,
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