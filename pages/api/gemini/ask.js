import { obtenerIntencion } from "@/scripts/gemini/intencion";
import { obtenerInstrucciones } from "@/scripts/prompt/instrucciones";
import { obtenerConversacion } from "@/scripts/prompt/conversaciones";
import { obtenerInteracciones } from "@/scripts/prompt/interacciones";
import { generarConsulta } from "@/scripts/gemini/consultar";
import { enviarMensaje } from "@/scripts/manychat/sendContent";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { mensaje } = req.body;
  const { contactId } = req.body;
  const { nombre } = req.body; // Opcional: nombre del usuario
  const { whatsappId } = req.body; // Opcional: ID de WhatsApp del usuario
  const { clienteId } = req.body; // Opcional: ID de cliente del usuario
  const { canalId } = req.body; // Opcional: ID de canal del usuario

  if (!mensaje) {
    return res.status(400).json({ error: "El campo 'prompt' es requerido." });
  }

  try {
    console.table({
      mensaje,
      contactId,
      whatsappId,
      clienteId,
      canalId,
      nombre,
    });

    //!Obtener intención
    const intencionResult = await obtenerIntencion(mensaje);
    // res.status(200).json({ intenciones: intencionResult });
    // console.log("Intención obtenida:", intencionResult);
    // res.status(200).json(intencionResult);
    /*
    if (intencionResult.accion === "agendar_cita") {
      // Mostrar botón de agendar cita en Calendly
      mostrarBotonCalendly();
    } else if (intencionResult.accion === "iniciar_compra") {
      // Mostrar información de productos/servicios y opciones de compra
      mostrarOpcionesCompra();
    } else if (intencionResult.accion === "mostrar_cotizacion") {
      // Generar y mostrar cotización (si es simple) o guiar al usuario para solicitarla
      mostrarCotizacion();
    } else if (intencionResult.accion === "enviar_informacion") {
      // Enviar información adicional al usuario
      enviarInformacion();
    } else if (intencionResult.accion === "derivar_humano") {
      //derivar a un agente
      derivarAgente();
    } else {
      // Acción por defecto: responder con información general
      const contexto = await contexto(intencionResult);
      const respuestaGemini = await generarRespuesta(contexto); // Función simulada
      enviarRespuestaAlUsuario(respuestaGemini); // Función simulada
    }
*/
    //!obtener instruccion
    const {
      intencion_principal = "",
      entidades_clave = [],
      etapa_embudo = "",
    } = intencionResult;
    const instruccion = await obtenerInstrucciones(
      nombre, //nombre del usuario
      intencion_principal,
      entidades_clave,
      etapa_embudo
    );
    // res.status(200).json({ instrucciones: instruccion });

    //!Obtener conversación
    const conversacionId = await obtenerConversacion(
      clienteId,
      contactId,
      whatsappId,
      canalId
    );

    //!obtener interacciones
    const interacciones = await obtenerInteracciones(
      conversacionId,
      mensaje,
      intencionResult
    );

    //!Consultar a gemini
    const geminiResult = await generarConsulta(
      instruccion,
      interacciones,
      mensaje
    );
    // res.status(200).json({ geminiResult });

    const responseText =
      geminiResult.response.candidates[0].content.parts[0].text;

    // res.status(200).json({ intencionResult, geminiResult, responseText });

    //envair mensaje a traves de manychat
    const resultManychat = await enviarMensaje(
      responseText,
      contactId,
      intencionResult.intencion_principal
    );

    //!manychat
    res.status(200).json({
      response: {
        response: responseText,
        manychat_result: resultManychat.result,
        numero_parrafos: resultManychat.numero_parrafos,
        intencion: intencionResult.intencion_principal,
        contexto: intencionResult.contexto,
        resumen: intencionResult.resumen,
        etapa_embudo: intencionResult.etapa_embudo,
        accion: intencionResult.accion,
      },
      intencionResult,
      geminiResult,
      responseText,
    });
    // Enviar el objeto formateado
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
