import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

//! Conversación
export async function obtenerConversacion(
  clienteId,
  contactId,
  whatsappId,
  canalId
) {
  let conversacionId = "";
  let interacciones = [];

  // Obtener conversación e interacciones de la base de datos
  const conversacion = await prisma.conversacion.findFirst({
    where: {
      clienteId: clienteId,
      AND: [{ contactId: contactId }],
    },
  });

  // Si no hay conversación, crear nueva
  if (!conversacion) {
    console.log("Creando una nueva conversación...");
    const newConversacion = await prisma.conversacion.create({
      data: {
        clienteId: clienteId,
        contactId: contactId,
        whatsappId: whatsappId,
        canalId: canalId, // Asegúrate de que canalId sea opcional
      },
    });
    conversacionId = newConversacion.id;
    console.log("conversación creada", conversacionId);
  } else {
    console.log("Conversación existente encontrada:", conversacion.id);

    // Asignar el ID de la conversación existente a conversacionId
    conversacionId = conversacion.id;
    console.log("Buscando interacciones para la conversación:", conversacionId);
    interacciones =
      (await prisma.interaccion.findMany({
        where: {
          conversacionId: conversacionId,
        },
        select: {
          history: true,
        },
      })) || [];

    if (interacciones.length === 0) {
      console.log(
        "No se encontraron interacciones previas. Esta es la primera interacción."
      );
    }
  }

  // Retornar el ID de la conversación
  return conversacionId;
}
