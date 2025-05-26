// app/admin/_lib/actions/email/email.actions.ts
'use server';

import { ConfirmacionPagoEmail } from '@/app/emails/ConfirmacionPagoEmail'; // Ajusta la ruta a tu plantilla
import { render } from '@react-email/render';
import { resend } from '@/app/lib/mailClient'; // Tu cliente Resend inicializado
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    EnviarConfirmacionPagoInputSchema,
    type EnviarConfirmacionPagoInput
} from './email.schemas';
// import prisma from '@/app/admin/_lib/prismaClient'; // Para obtener datos del negocio si es necesario

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
