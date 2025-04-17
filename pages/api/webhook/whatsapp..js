//WEBHOOK DE WHATSAPP
// Este archivo maneja el webhook de WhatsApp Business API
// y procesa los mensajes entrantes. Se encarga de validar el webhook
// y de enviar respuestas a los mensajes recibidos.
import procesarEntrada from "@/scripts/whatsapp/whatsappHandler";
export default async function handler(req, res) {
  //! Validación de webhook (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === "meatyhamhock") {
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Token inválido");
    }
  }
  //! Manejo de mensajes entrantes (POST)
  else if (req.method === "POST") {
    const payload = req.body;
    if (
      payload.entry &&
      payload.entry[0] &&
      payload.entry[0].changes &&
      payload.entry[0].changes[0] &&
      payload.entry[0].changes[0].value &&
      payload.entry[0].changes[0].value.contacts &&
      payload.entry[0].changes[0].value.contacts[0] &&
      payload.entry[0].changes[0].value.contacts[0].profile &&
      payload.entry[0].changes[0].value.messages &&
      payload.entry[0].changes[0].value.messages[0] &&
      payload.entry[0].changes[0].value.messages[0].text
    ) {
      const nombrePerfil =
        payload.entry[0].changes[0].value.contacts[0].profile.name; // Nombre del usuario
      const whatsappId = payload.entry[0].changes[0].value.contacts[0].wa_id; // Número al que se está enviando el mensaje
      const mensaje = payload.entry[0].changes[0].value.messages[0].text.body;
      const phoneNumberId =
        payload.entry[0].changes[0].value.metadata.phone_number_id;
      const messageId = payload.entry[0].changes[0].value.messages[0].id;

      //! Procesar el mensaje en whatsapp
      procesarEntrada(
        phoneNumberId,
        whatsappId,
        nombrePerfil,
        mensaje,
        messageId
      );

      // Responder inmediatamente al webhook
      res.status(200).json({ message: "Mensaje recibido y en procesamiento" });
      return;
    } else {
      // console.log("Mensaje duplicado recibido:", messageId);
      res.status(200).send("Mensaje duplicado");
      return;
    }
  }
}
