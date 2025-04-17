// Este archivo contiene la función para procesar la entrada de WhatsApp
// y enviar respuestas a los mensajes recibidos.
// tiene que ser default function
import { obtenerIntencion } from "../gemini/intencion";
import { obtenerInstrucciones } from "../prompt/instrucciones";
import { obtenerConversacion } from "../prompt/conversaciones";
import { obtenerInteracciones } from "../prompt/interacciones";
import { generarConsulta } from "../gemini/consultar";
import { enviarMensajeWhatsApp } from "./WhatsappService";

export default async function procesarEntrada(
  phoneNumberId,
  whatsappId,
  nombrePerfil,
  mensaje
) {
  try {
    console.log("Mensaje recibido:", mensaje);
    //Obtener credenciales de la conversación
    const clienteId = "cm905zbjp0000gul8weklx1pl";
    const contactId = "2043918202";
    const canalId = "cm8ouqbw30000guy30rle2v6i";
    // const mensajeFormateado = `Hola ${nombrePerfil}, gracias por tu mensaje: "${mensaje}". Estamos aquí para ayudarte.`;
    // await enviarMensajeWhatsApp(phoneNumberId, whatsappId, mensajeFormateado);
    // Enviar el mensaje de respuesta
    // console.log("Mensaje enviado a WhatsApp:", mensajeFormateado);
    // Obtener la intención del mensaje
    const intencionResult = await obtenerIntencion(mensaje, phoneNumberId);
    console.log("Intención del mensaje:", intencionResult);

    const {
      intencion = "",
      entidades_clave = [],
      etapa_embudo = "",
    } = intencionResult;

    const instruccionesResult = await obtenerInstrucciones(
      nombrePerfil,
      intencion,
      entidades_clave,
      etapa_embudo,
      phoneNumberId
    );
    console.log("Instrucciones obtenidas:", instruccionesResult);

    //!Obtener conversación
    const conversacionId = await obtenerConversacion(
      clienteId,
      contactId,
      whatsappId,
      canalId
    );
    console.log("Conversación ID:", conversacionId);

    //!obtener interacciones
    const interacciones = await obtenerInteracciones(
      conversacionId,
      mensaje,
      intencionResult
    );
    console.log("Interacciones obtenidas:", interacciones);

    //!Consultar a gemini
    const geminiResult = await generarConsulta(
      instruccionesResult,
      interacciones,
      mensaje
    );
    const responseText =
      geminiResult.response.candidates[0].content.parts[0].text;
    console.log("Respuesta de Gemini:", responseText);

    // Enviar el mensaje a través de WhatsApp
    const resultEnvioMensaje = await enviarMensajeWhatsApp(
      phoneNumberId,
      whatsappId,
      responseText
    );
    console.log("Mensaje enviado a WhatsApp:", resultEnvioMensaje);
  } catch (error) {
    console.error("Error al obtener la intención del mensaje:", error);
  }
}
