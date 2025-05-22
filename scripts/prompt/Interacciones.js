// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// export async function obtenerInteracciones(
//   conversacionId,
//   prompt,
//   responseText
// ) {
//   // Guardar la interacción en la base de datos
//   console.log("Guardando interacción en la base de datos...");
//   //!guardar la interacción en la base de datos usuario
//   await prisma.interaccion.create({
//     data: {
//       conversacionId: conversacionId,
//       history: [
//         { role: "user", content: prompt },
//         { role: "gemini", content: responseText },
//       ],
//     },
//   });
// }
