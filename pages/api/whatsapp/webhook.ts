// /pages/api/whatsapp/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { procesarMensajeWhatsAppEntranteAction } from '@/app/admin/_lib/actions/whatsapp/whatsapp.actions';

// Leemos el token de verificación desde las variables de entorno.
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // =================================================================
    // PARTE 1: LÓGICA DE VERIFICACIÓN (MÉTODO GET)
    // Tomada de nuestro archivo de prueba que ya sabemos que funciona.
    // =================================================================
    if (req.method === "GET") {
        console.log("[Webhook GET] Solicitud de verificación recibida.");

        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        console.log(`[Webhook GET] Token recibido: ${token} | Token esperado: ${VERIFY_TOKEN}`);

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("[Webhook GET] Verificación exitosa.");
            res.status(200).send(challenge);
        } else {
            console.error("[Webhook GET] Verificación FALLIDA.");
            res.status(403).send("Token inválido o modo incorrecto.");
        }
        return;
    }

    // =================================================================
    // PARTE 2: LÓGICA DE RECEPCIÓN DE MENSAJES (MÉTODO POST)
    // Esta es la lógica que procesará las conversaciones reales.
    // =================================================================
    if (req.method === "POST") {
        const payload = req.body;
        console.log("[Webhook POST] Payload recibido:", JSON.stringify(payload, null, 2));

        // Respondemos 200 OK inmediatamente a Meta.
        res.status(200).json({ status: "Evento recibido." });

        // Procesamos el mensaje en segundo plano.
        const value = payload.entry?.[0]?.changes?.[0]?.value;

        if (value) {
            const contactInfo = value.contacts?.[0];
            const messageEntry = value.messages?.[0];
            const metadata = value.metadata;

            if (messageEntry && contactInfo && metadata) {
                const negocioPhoneNumberId = metadata.phone_number_id;
                const usuarioWaId = contactInfo.wa_id;
                const nombrePerfilUsuario = contactInfo.profile.name;
                const messageIdOriginal = messageEntry.id;

                switch (messageEntry.type) {
                    case 'text':
                        const mensajeUsuario = messageEntry.text.body;
                        console.log(`[Webhook] Procesando mensaje de texto de ${usuarioWaId}: "${mensajeUsuario}"`);

                        procesarMensajeWhatsAppEntranteAction({
                            negocioPhoneNumberId,
                            usuarioWaId,
                            nombrePerfilUsuario,
                            mensaje: { type: 'text', content: mensajeUsuario },
                            messageIdOriginal,
                        }).catch(error => {
                            console.error("[Webhook] Error en la acción para mensaje de texto:", error);
                        });
                        break;

                    default:
                        console.log(`[Webhook] Mensaje de tipo '${messageEntry.type}' no procesado por ahora.`);
                }
            }
        }
        return;
    }

    // Si llega cualquier otro método, lo rechazamos.
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
