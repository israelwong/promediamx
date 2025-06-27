// pages/api/whatsapp/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { procesarMensajeWhatsAppEntranteAction } from '@/app/admin/_lib/actions/whatsapp/whatsapp.actions';

// Es buena práctica asegurarse de que el token exista al iniciar la aplicación.
// Si no está, la aplicación debería fallar rápido para alertar del problema de configuración.
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "meatyhamhock";

if (!VERIFY_TOKEN) {
    console.error("FATAL ERROR: WHATSAPP_VERIFY_TOKEN no está definido en las variables de entorno.");
    // En un entorno de producción, podrías querer que esto detenga el proceso:
    // process.exit(1);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Manejo de la Verificación del Webhook (Método GET)
    // Esta parte se mantiene igual, es correcta y segura.
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("[WhatsApp Webhook] Verificación GET exitosa.");
            res.status(200).send(challenge);
        } else {
            console.warn("[WhatsApp Webhook] Verificación GET fallida.");
            res.status(403).send("Token inválido o modo incorrecto.");
        }
        return; // Salir de la función después de manejar GET
    }

    // 2. Manejo de Notificaciones Entrantes (Método POST)
    if (req.method === "POST") {
        const payload = req.body;
        // console.log("[WhatsApp Webhook] Payload POST recibido:", JSON.stringify(payload, null, 2));

        // Respondemos 200 OK inmediatamente para que Meta no marque el webhook como fallido.
        // El procesamiento real se hará en segundo plano.
        res.status(200).json({ status: "Evento recibido. Procesando en segundo plano." });

        // Extraemos las piezas clave del payload.
        const value = payload.entry?.[0]?.changes?.[0]?.value;

        if (value) {
            const contactInfo = value.contacts?.[0];
            const messageEntry = value.messages?.[0];
            const metadata = value.metadata;

            // Si no hay mensaje o contacto, puede ser otro tipo de notificación (ej. de estado) que podemos ignorar por ahora.
            if (messageEntry && contactInfo && metadata) {
                const negocioPhoneNumberId = metadata.phone_number_id;
                const usuarioWaId = contactInfo.wa_id;
                const nombrePerfilUsuario = contactInfo.profile.name;
                const messageIdOriginal = messageEntry.id;

                // MEJORA: Usamos un switch para manejar diferentes tipos de mensajes.
                // Esto hace que la arquitectura esté lista para el futuro (botones, imágenes, etc.).
                switch (messageEntry.type) {
                    case 'text':
                        // Procesamos el mensaje de texto
                        const mensajeUsuario = messageEntry.text.body;
                        console.log(`[Webhook] Mensaje de texto de ${usuarioWaId}: "${mensajeUsuario}"`);

                        // Lanzamos la acción en segundo plano (fire-and-forget)
                        procesarMensajeWhatsAppEntranteAction({
                            negocioPhoneNumberId,
                            usuarioWaId,
                            nombrePerfilUsuario,
                            mensaje: { type: 'text', content: mensajeUsuario },
                            messageIdOriginal,
                        }).catch(error => {
                            console.error("[Webhook] Error catastrófico en la acción para mensaje de texto:", error);
                        });
                        break;

                    case 'interactive':
                        // Aquí manejarías los clics en botones y listas
                        const interactiveData = messageEntry.interactive;
                        console.log(`[Webhook] Interacción de ${usuarioWaId}:`, interactiveData);
                        // TODO: Llamar a la acción con los datos de la interacción
                        // procesarMensajeWhatsAppEntranteAction({
                        //     ...
                        //     mensaje: { type: 'interactive', data: interactiveData },
                        //     ...
                        // });
                        break;

                    case 'image':
                    case 'audio':
                    case 'document':
                        // Aquí manejarías los archivos multimedia
                        console.log(`[Webhook] Archivo multimedia (${messageEntry.type}) recibido de ${usuarioWaId}`);
                        // TODO: Implementar la lógica para manejar multimedia
                        break;

                    default:
                        console.log(`[Webhook] Mensaje de tipo '${messageEntry.type}' recibido. No se procesa por ahora.`);
                }
            }
        }
        return; // Salir de la función después de manejar POST
    }

    // 3. Manejo de otros métodos HTTP
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
