//app/admin/_lib/webhook.types.ts';
/**
 * Payload esperado para un mensaje entrante al webhook.
 */
export interface MensajeEntrantePayload {
    canalOrigenId: string; // Ej: El phoneNumberId de WhatsApp del negocio, o un ID de widget de chat.
    remitenteId: string;   // Ej: El número de WhatsApp del usuario final, o un ID de sesión del chat.
    nombreRemitente?: string; // Opcional: Nombre del remitente si la plataforma lo provee.
    mensajeTexto: string;    // El contenido del mensaje.
    timestamp?: string | number; // Opcional: Timestamp del mensaje original.
    // Puedes añadir más campos según la información que envíe la plataforma de mensajería
    // por ejemplo, tipo de mensaje (texto, imagen), URL de media, etc.
}
