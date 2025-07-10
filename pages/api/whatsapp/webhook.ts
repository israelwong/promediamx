// /pages/api/whatsapp/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { procesarMensajeWhatsAppEntranteAction } from '@/app/admin/_lib/actions/whatsapp/whatsapp.actions';

// Leemos el token de verificación desde las variables de entorno.
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // --- MANEJO DE LA VERIFICACIÓN (MÉTODO GET) ---
    if (req.method === "GET") {
        console.log("[Webhook GET] Solicitud de verificación recibida.");

        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        // ✅ INICIO DEL DIAGNÓSTICO: Logueamos lo que recibimos y lo que esperamos.
        console.log(`[Webhook GET] Token recibido de Meta: "${token}"`);
        console.log(`[Webhook GET] Token esperado de ENV: "${VERIFY_TOKEN}"`);
        // ✅ FIN DEL DIAGNÓSTICO

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("[Webhook GET] Verificación exitosa. Respondiendo con el challenge.");
            res.status(200).send(challenge);
        } else {
            console.error("[Webhook GET] Verificación FALLIDA. Los tokens no coinciden o el modo es incorrecto.");
            res.status(403).send("Token inválido o modo incorrecto.");
        }
        return;
    }

    // --- MANEJO DE MENSAJES ENTRANTES (MÉTODO POST) ---
    if (req.method === "POST") {
        const payload = req.body;
        console.log("[Webhook POST] Payload recibido:", JSON.stringify(payload, null, 2));

        // Respondemos 200 OK inmediatamente.
        res.status(200).json({ status: "Evento recibido." });

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

                    // ... (otros cases para 'interactive', 'image', etc.)

                    default:
                        console.log(`[Webhook] Mensaje de tipo '${messageEntry.type}' no procesado.`);
                }
            }
        }
        return;
    }

    // Manejo de otros métodos HTTP
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
