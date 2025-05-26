// pages/api/whatsapp/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
// La acción principal que hemos definido:
import { procesarMensajeWhatsAppEntranteAction } from '@/app/admin/_lib/actions/whatsapp/whatsapp.actions';

// Tu verify token (mantenlo en una variable de entorno para más seguridad)
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "meatyhamhock";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Validación de webhook (GET)
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("[WhatsApp Webhook] Verificación GET exitosa.");
            res.status(200).send(challenge);
        } else {
            console.warn("[WhatsApp Webhook] Verificación GET fallida. Token inválido o modo incorrecto.");
            res.status(403).send("Token inválido o modo incorrecto.");
        }
    }
    // Manejo de mensajes entrantes (POST)
    else if (req.method === "POST") {
        const payload = req.body;
        console.log("[WhatsApp Webhook] Payload POST recibido:", JSON.stringify(payload, null, 2));

        // Extraer el primer mensaje de texto (puedes expandir para manejar otros tipos de mensajes)
        const messageEntry = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        const contactInfo = payload.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
        const metadata = payload.entry?.[0]?.changes?.[0]?.value?.metadata;

        if (messageEntry?.type === 'text' && contactInfo && metadata) {
            const nombrePerfil = contactInfo.profile.name;
            const usuarioWaId = contactInfo.wa_id; // WAID del usuario
            const mensajeUsuario = messageEntry.text.body;
            const negocioPhoneNumberId = metadata.phone_number_id; // PNID del negocio
            // const messageIdOriginal = messageEntry.id; // ID del mensaje de WhatsApp

            console.log(`[WhatsApp Webhook] Mensaje de texto extraído: De ${nombrePerfil} (${usuarioWaId}) para PNID ${negocioPhoneNumberId}: "${mensajeUsuario}"`);

            // Llamar a la acción para procesar el mensaje de forma asíncrona
            // No necesitamos hacer await aquí para responder rápido a Meta.
            procesarMensajeWhatsAppEntranteAction({
                negocioPhoneNumberId,
                usuarioWaId,
                nombrePerfilUsuario: nombrePerfil,
                mensajeUsuario,
                // messageIdOriginal, // Opcional
            }).then(result => {
                if (!result.success) {
                    console.error("[WhatsApp Webhook] Error procesando mensaje en background:", result.error, result.errorDetails);
                } else {
                    console.log("[WhatsApp Webhook] Procesamiento en background iniciado/completado para mensaje de:", usuarioWaId);
                }
            }).catch(error => {
                console.error("[WhatsApp Webhook] Error catastrófico llamando a procesarMensajeWhatsAppEntranteAction:", error);
            });

            // Responder inmediatamente a Meta para confirmar recepción
            res.status(200).json({ message: "Mensaje recibido y en procesamiento." });
        } else {
            console.log("[WhatsApp Webhook] Payload no es un mensaje de texto o está malformado. Ignorando.");
            // Meta espera un 200 OK incluso si no procesas el mensaje, para no marcar el webhook como fallido.
            res.status(200).json({ message: "Evento recibido, no es un mensaje de texto procesable." });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
