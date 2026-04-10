// // Ruta actual del archivo desde app: app/api/webhook/mensajes.ts

// import type { NextApiRequest, NextApiResponse } from 'next';

// type ApiResponse = {
//     message?: string;
//     error?: string;
//     details?: Record<string, unknown>;
// } | string;

// import { procesarMensajeEntranteAction } from '@/app/admin/_lib/crmConversacion.actions';
// import { MensajeEntrantePayload } from '@/app/admin/_lib/webhook.types';



// export default async function handler(
//     req: NextApiRequest,
//     res: NextApiResponse<ApiResponse>
// ) {
//     if (req.method === 'POST') {
//         console.log('Webhook de mensaje entrante recibido:', req.body);

//         const payload = req.body as MensajeEntrantePayload;

//         if (!payload.canalOrigenId || !payload.remitenteId || !payload.mensajeTexto) {
//             console.error("Payload incompleto recibido:", payload);
//             return res.status(400).json({ error: "Payload incompleto. Se requieren canalOrigenId, remitenteId y mensajeTexto." });
//         }
//         try {
//             const result = await procesarMensajeEntranteAction(payload);

//             if (result.success && result.data) {
//                 console.log("Mensaje procesado exitosamente:", result.data);
//                 // --- CORRECCIÓN: Castear result.data si es necesario ---
//                 // No es estrictamente necesario si ApiResponseData permite ProcesarMensajeEntranteData
//                 // pero si details debe ser Record<string, unknown>, se haría así:
//                 // const responseDetails = result.data as Record<string, unknown>;
//                 return res.status(200).json({
//                     message: 'Mensaje recibido y procesado.',
//                     details: result.data as unknown as Record<string, unknown> // Castear primero a unknown y luego a Record<string, unknown>
//                     // details: responseDetails // O usar el casteado si es necesario
//                 });
//                 // --- FIN CORRECCIÓN ---
//             } else {
//                 console.error("Error al procesar mensaje entrante:", result.error);
//                 return res.status(500).json({
//                     error: 'Error al procesar el mensaje.',
//                     // No necesitamos castear aquí ya que details es opcional
//                     details: result.error ? { message: result.error } : undefined
//                 });
//             }
//         } catch (error) {
//             console.error("Error catastrófico en el handler del webhook:", error);
//             return res.status(500).json({ error: 'Error interno del servidor.' });
//         }
//     } else if (req.method === 'GET') {
//         const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

//         const mode = req.query['hub.mode'];
//         const token = req.query['hub.verify_token'];
//         const challenge = req.query['hub.challenge'];

//         if (mode && token) {
//             if (mode === 'subscribe' && token === VERIFY_TOKEN) {
//                 console.log('WEBHOOK_VERIFIED');
//                 return res.status(200).send(String(challenge));
//             } else {
//                 console.warn('Webhook verification failed. Tokens no coinciden.');
//                 return res.status(403).end();
//             }
//         }
//         return res.status(200).json({ message: 'Webhook de mensajes activo. Use POST para enviar mensajes.' });
//     } else {
//         res.setHeader('Allow', ['POST', 'GET']);
//         return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
//     }
// }