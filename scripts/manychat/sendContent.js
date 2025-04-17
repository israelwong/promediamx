import dotenv from "dotenv";

export async function enviarMensaje(resultGemini, contactId) {
  //!Genera parrafos
  const paragraphs = (
    typeof resultGemini === "string" ? resultGemini : resultGemini.text
  )
    .split(/\n+/)
    .filter((p) => p.trim() !== "");

  const messages = paragraphs.map((p) => ({
    type: "text",
    text: p.trim(),
  }));

  //! Verificar la intención
  // if (userIntent === "agendar_cita") {
  //   // Crear el botón solo si la intención es agendar cita
  //   const buttonMessage = {
  //     type: "text",
  //     text: "¡Agenda tu cita ahora! Haz clic abajo para elegir un horario.",
  //     buttons: [
  //       {
  //         type: "url",
  //         caption: "Agendar cita", // Texto que aparecerá en el botón
  //         url: "https://www.tusitio.com/agendar", // Reemplaza con el enlace de agendamiento
  //       },
  //     ],
  //   };

  //   messages.push(buttonMessage); // Añadir el botón de agendar cita
  // }

  const numero_parrafos = messages.length;

  //!Enviar mensajes por manychat y regresar respuesta
  const responseText = {
    subscriber_id: contactId,
    message_tag: "ACCOUNT_UPDATE",
    data: {
      version: "v2",
      content: {
        type: "whatsapp", // Aseguramos que el tipo de mensaje sea whatsapp
        messages: messages,
      },
    },
  };

  dotenv.config();

  const manychatResponse = await fetch(
    "https://api.manychat.com/fb/sending/sendContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MANYCHAT_API_KEY}`, // Obtén la API Key desde .env
      },
      body: JSON.stringify(responseText),
    }
  );
  const result = await manychatResponse.json();
  return { result, numero_parrafos }; // Regresa el resultado de la API de ManyChat
}
