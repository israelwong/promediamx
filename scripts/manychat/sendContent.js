// import dotenv from "dotenv";

// export async function enviarMensaje(resultGemini, contactId) {
//   //!Genera parrafos
//   const paragraphs = (
//     typeof resultGemini === "string" ? resultGemini : resultGemini.text
//   )
//     .split(/\n+/)
//     .filter((p) => p.trim() !== "");

//   const messages = paragraphs.map((p) => ({
//     type: "text",
//     text: p.trim(),
//   }));

//   const numero_parrafos = messages.length;

//   //!Enviar mensajes por manychat y regresar respuesta
//   const responseText = {
//     subscriber_id: contactId,
//     message_tag: "ACCOUNT_UPDATE",
//     data: {
//       version: "v2",
//       content: {
//         type: "whatsapp", // Aseguramos que el tipo de mensaje sea whatsapp
//         messages: messages,
//       },
//     },
//   };

//   dotenv.config();

//   const manychatResponse = await fetch(
//     "https://api.manychat.com/fb/sending/sendContent",
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${process.env.MANYCHAT_API_KEY}`, // Obtén la API Key desde .env
//       },
//       body: JSON.stringify(responseText),
//     }
//   );
//   const result = await manychatResponse.json();
//   return { result, numero_parrafos }; // Regresa el resultado de la API de ManyChat
// }
