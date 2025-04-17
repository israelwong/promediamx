// Función para enviar mensaje de WhatsApp
export async function enviarMensajeWhatsApp(
  phoneNumberId,
  whatsappId,
  mensaje // Ahora, 'mensaje' será el texto completo a dividir
) {
  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
  let numeroDestinoFormateado = formatearNumeroTelefono(whatsappId);

  //!Genera parrafos
  const paragraphs = (typeof mensaje === "string" ? mensaje : mensaje.text) // Usar 'mensaje' directamente
    .split(/\n+/)
    .filter((p) => p.trim() !== "");

  // Enviar cada párrafo como un mensaje separado
  for (const paragraph of paragraphs) {
    const params = {
      messaging_product: "whatsapp",
      to: `+${numeroDestinoFormateado}`,
      text: {
        body: paragraph.trim(), // Enviar párrafo individual
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        console.error(
          "Error al enviar el mensaje:",
          response.statusText,
          await response.json() // Log de la respuesta de error
        );
      } else {
        console.log("Mensaje enviado correctamente:", paragraph.trim());
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500)); // Pausa de 0.5 segundos
  }
}

//! Función para formatear el número de teléfono (sin cambios)
function formatearNumeroTelefono(whatsappId) {
  const numeroSinFormato = whatsappId.replace(/\D/g, "");
  if (numeroSinFormato.startsWith("521")) {
    return `+52${numeroSinFormato.substring(3)}`;
  } else if (numeroSinFormato.startsWith("52")) {
    return `+${numeroSinFormato}`;
  } else {
    return `+${numeroSinFormato}`;
  }
}
