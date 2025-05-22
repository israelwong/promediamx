// // Función para enviar mensaje de WhatsApp
// export async function enviarMensajeWhatsApp(
//   phoneNumberId,
//   whatsappId,
//   mensaje
// ) {
//   const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`; // URL con tu ID de teléfono

//   let numeroDestinoFormateado = formatearNumeroTelefono(whatsappId);

//   const params = {
//     messaging_product: "whatsapp",
//     to: `+${numeroDestinoFormateado}`,
//     text: {
//       body: mensaje,
//     },
//   };

//   // Enviar la solicitud
//   await fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`, // Usa el token de autenticación
//     },
//     body: JSON.stringify(params),
//   })
//     .then((response) => {
//       if (!response.ok) {
//         console.error("Error al enviar el mensaje:", response.statusText);
//         return response.json(); // Para ver la respuesta detallada del error
//       } else {
//         console.log("Mensaje enviado correctamente");
//         return response.json();
//       }
//     })
//     .then((data) => {
//       if (data.error) {
//         console.error("Error en la respuesta de la API:", data.error);
//       }
//     })
//     .catch((error) => {
//       console.error("Error en la solicitud:", error);
//     });
// }

// function formatearNumeroTelefono(whatsappId) {
//   // Eliminar caracteres no numéricos
//   const numeroSinFormato = whatsappId.replace(/\D/g, "");

//   // Verificar si el número tiene el prefijo "521"
//   if (numeroSinFormato.startsWith("521")) {
//     return `+52${numeroSinFormato.substring(3)}`; // Elimina "521" y agrega "+"
//   } else if (numeroSinFormato.startsWith("52")) {
//     return `+${numeroSinFormato}`; // Agrega "+" si solo tiene "52"
//   } else {
//     return `+${numeroSinFormato}`; // Agrega "+" para otros casos
//   }
// }
