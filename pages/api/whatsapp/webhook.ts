// /pages/api/whatsapp/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { procesarMensajeWhatsAppEntranteAction } from '@/app/admin/_lib/actions/whatsapp/whatsapp.actions';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // =================================================================
    // PARTE 1: LÓGICA DE VERIFICACIÓN (MÉTODO GET)
    // =================================================================
    if (req.method === "GET") {
        console.log("--- [WHATSAPP WEBHOOK] Solicitud GET de verificación iniciada ---");

        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        console.log(`[WHATSAPP WEBHOOK] Modo: ${mode}, Token Recibido: ${token}`);

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("[WHATSAPP WEBHOOK] Verificación EXITOSA. Devolviendo challenge.");
            res.status(200).send(challenge);
        } else {
            console.error(`[WHATSAPP WEBHOOK] Verificación FALLIDA. Token esperado: ${VERIFY_TOKEN}`);
            res.status(403).send("Token de verificación inválido.");
        }
        return;
    }

    // =================================================================
    // PARTE 2: LÓGICA DE RECEPCIÓN DE MENSAJES (MÉTODO POST)
    // =================================================================
    if (req.method === "POST") {
        console.log("--- [WHATSAPP WEBHOOK] Solicitud POST recibida ---");
        const payload = req.body;
        // Logueamos el cuerpo completo para una depuración exhaustiva.
        console.log("[WHATSAPP WEBHOOK] Payload completo:", JSON.stringify(payload, null, 2));

        // Respondemos 200 OK inmediatamente a Meta para evitar timeouts.
        res.status(200).json({ status: "Evento recibido por el webhook." });

        // Procesamos el mensaje en segundo plano.
        try {
            const value = payload.entry?.[0]?.changes?.[0]?.value;

            if (value) {
                console.log("[WHATSAPP WEBHOOK] Objeto 'value' encontrado. Procesando...");
                const contactInfo = value.contacts?.[0];
                const messageEntry = value.messages?.[0];
                const metadata = value.metadata;

                if (messageEntry && contactInfo && metadata) {
                    console.log("[WHATSAPP WEBHOOK] Información de mensaje, contacto y metadata completa. Extrayendo datos...");
                    const negocioPhoneNumberId = metadata.phone_number_id;
                    const usuarioWaId = contactInfo.wa_id;
                    const nombrePerfilUsuario = contactInfo.profile.name;
                    const messageIdOriginal = messageEntry.id;
                    const messageType = messageEntry.type;

                    console.log(`[WHATSAPP WEBHOOK] Tipo de mensaje: ${messageType}. ID de Mensaje Original: ${messageIdOriginal}`);

                    if (messageType === 'text') {
                        const mensajeUsuario = messageEntry.text.body;
                        console.log(`[WHATSAPP WEBHOOK] Mensaje de texto de ${usuarioWaId}: "${mensajeUsuario}"`);

                        console.log("[WHATSAPP WEBHOOK] Llamando a 'procesarMensajeWhatsAppEntranteAction'...");
                        // Usamos un await para poder capturar errores específicos de esta llamada.
                        await procesarMensajeWhatsAppEntranteAction({
                            negocioPhoneNumberId,
                            usuarioWaId,
                            nombrePerfilUsuario,
                            mensaje: { type: 'text', content: mensajeUsuario },
                            messageIdOriginal,
                        });
                        console.log("[WHATSAPP WEBHOOK] 'procesarMensajeWhatsAppEntranteAction' completado.");

                    } else {
                        console.log(`[WHATSAPP WEBHOOK] Mensaje de tipo '${messageType}' recibido pero no se procesará por ahora.`);
                    }
                } else {
                    console.warn("[WHATSAPP WEBHOOK] Faltan datos esenciales (message, contact, o metadata) en el payload.");
                }
            } else {
                console.warn("[WHATSAPP WEBHOOK] No se encontró el objeto 'value' en el payload.");
            }
        } catch (error) {
            // Capturamos cualquier error que ocurra durante el procesamiento del payload.
            console.error("[WHATSAPP WEBHOOK] Error CRÍTICO al procesar el payload POST:", error);
        }

        return;
    }

    // Si llega cualquier otro método, lo rechazamos.
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
