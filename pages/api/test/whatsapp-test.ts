// pages/api/test/whatsapp-direct-send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { enviarMensajeWhatsAppApiAction } from '@/app/admin/_lib/actions/whatsapp/whatsapp.actions'; // Ajusta la ruta si es diferente
import prisma from '@/app/admin/_lib/prismaClient'; // Para obtener el token del asistente

// ***** AÑADIR "export default" AQUÍ *****
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end('Method Not Allowed');
    }

    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Esta ruta es solo para pruebas en desarrollo.' });
    }

    const NEGOCIO_PHONE_NUMBER_ID_ENVIA = "101853029334365";
    const DESTINATARIO_WA_ID_PRUEBA = "525544546582";
    const MENSAJE_DE_PRUEBA = "¡Hola! Este es un mensaje de prueba directo desde ProMedia API. 😎";

    try {
        console.log(`[WhatsApp Direct Send Test] Iniciando prueba para PNID: ${NEGOCIO_PHONE_NUMBER_ID_ENVIA}`);
        const asistente = await prisma.asistenteVirtual.findFirst({
            where: {
                phoneNumberId: NEGOCIO_PHONE_NUMBER_ID_ENVIA,
                status: 'activo'
            },
            select: { token: true, id: true }
        });

        if (!asistente || !asistente.token) {
            console.error(`[WhatsApp Direct Send Test] No se encontró token o asistente activo para PNID ${NEGOCIO_PHONE_NUMBER_ID_ENVIA}`);
            return res.status(500).json({
                message: `No se encontró token de acceso o asistente activo para el PNID ${NEGOCIO_PHONE_NUMBER_ID_ENVIA}. Verifica la configuración en la base de datos.`,
                error: "Token de asistente no encontrado."
            });
        }
        console.log(`[WhatsApp Direct Send Test] Token encontrado para Asistente ID: ${asistente.id}`);

        const resultadoEnvio = await enviarMensajeWhatsAppApiAction({
            destinatarioWaId: DESTINATARIO_WA_ID_PRUEBA,
            mensajeTexto: MENSAJE_DE_PRUEBA,
            negocioPhoneNumberIdEnvia: NEGOCIO_PHONE_NUMBER_ID_ENVIA,
            tokenAccesoAsistente: asistente.token,
        });

        if (resultadoEnvio.success) {
            console.log("[WhatsApp Direct Send Test] Llamada a API exitosa. ID de Mensaje:", resultadoEnvio.data);
            return res.status(200).json({
                message: `Intento de envío a ${DESTINATARIO_WA_ID_PRUEBA} realizado.`,
                resultadoApi: resultadoEnvio.data
            });
        } else {
            console.error("[WhatsApp Direct Send Test] Falló la llamada a la API:", resultadoEnvio.error);
            return res.status(500).json({
                message: `Error al intentar enviar mensaje a ${DESTINATARIO_WA_ID_PRUEBA}.`,
                error: resultadoEnvio.error
            });
        }
    } catch (error) {
        console.error("[WhatsApp Direct Send Test] Error catastrófico:", error);
        return res.status(500).json({
            message: 'Error interno del servidor durante la prueba de envío directo.',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}